const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();

// GitHub OAuth configuration
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GITHUB_CALLBACK_URL = 'http://localhost:5000/api/github/callback';
const FRONTEND_SUCCESS_URL = 'http://localhost:5173/dashboard?github=connected';
const FRONTEND_ERROR_URL = 'http://localhost:5173/dashboard?github=error';

// Custom auth middleware for GitHub auth route
const authFromQuery = async (req, res, next) => {
  try {
    const token = req.query.token;
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// @route   GET /api/github/auth
// @desc    Redirect user to GitHub OAuth
// @access  Private
router.get('/auth', authFromQuery, (req, res) => {
  try {
    if (!GITHUB_CLIENT_ID) {
      return res.status(500).json({ message: 'GitHub OAuth not configured' });
    }

    // Store user ID in session/state for security
    const state = Buffer.from(JSON.stringify({ userId: req.user.id })).toString('base64');
    
    const githubAuthUrl = `https://github.com/login/oauth/authorize?` +
      `client_id=${GITHUB_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(GITHUB_CALLBACK_URL)}&` +
      `scope=repo&` +
      `state=${state}`;

    res.redirect(githubAuthUrl);
  } catch (error) {
    console.error('Error initiating GitHub OAuth:', error);
    res.status(500).json({ message: 'Failed to initiate GitHub authentication' });
  }
});

// @route   GET /api/github/callback
// @desc    Handle GitHub OAuth callback
// @access  Public (but validates state)
router.get('/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    // Handle OAuth error
    if (error) {
      console.error('GitHub OAuth error:', error);
      return res.redirect(`${FRONTEND_ERROR_URL}&reason=oauth_denied`);
    }

    // Validate required parameters
    if (!code || !state) {
      return res.redirect(`${FRONTEND_ERROR_URL}&reason=missing_params`);
    }

    // Decode and validate state
    let decodedState;
    try {
      decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch (err) {
      return res.redirect(`${FRONTEND_ERROR_URL}&reason=invalid_state`);
    }

    if (!decodedState.userId) {
      return res.redirect(`${FRONTEND_ERROR_URL}&reason=invalid_state`);
    }

    // Exchange code for access token
    const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code: code
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const { access_token, error: tokenError } = tokenResponse.data;

    if (tokenError || !access_token) {
      console.error('GitHub token exchange error:', tokenError);
      return res.redirect(`${FRONTEND_ERROR_URL}&reason=token_exchange_failed`);
    }

    // Fetch GitHub user profile
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'EchoHub-App'
      }
    });

    const githubUser = userResponse.data;

    if (!githubUser.login) {
      return res.redirect(`${FRONTEND_ERROR_URL}&reason=profile_fetch_failed`);
    }

    // Update user record with GitHub information
    const user = await User.findById(decodedState.userId);
    if (!user) {
      return res.redirect(`${FRONTEND_ERROR_URL}&reason=user_not_found`);
    }

    // Update user with GitHub credentials
    user.githubAccessToken = access_token;
    user.githubUsername = githubUser.login;
    user.githubId = githubUser.id;
    user.githubProfileUrl = githubUser.html_url;
    user.githubConnectedAt = new Date();

    await user.save();

    // Redirect to frontend with success
    res.redirect(FRONTEND_SUCCESS_URL);

  } catch (error) {
    console.error('Error in GitHub OAuth callback:', error);
    
    // Handle specific axios errors
    if (error.response) {
      console.error('GitHub API error:', error.response.status, error.response.data);
    }
    
    res.redirect(`${FRONTEND_ERROR_URL}&reason=server_error`);
  }
});

// @route   GET /api/github/status
// @desc    Check GitHub connection status
// @access  Private
router.get('/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('githubUsername githubConnectedAt');
    
    res.json({
      success: true,
      connected: !!user.githubUsername,
      githubUsername: user.githubUsername || null,
      connectedAt: user.githubConnectedAt || null
    });
  } catch (error) {
    console.error('Error checking GitHub status:', error);
    res.status(500).json({ message: 'Failed to check GitHub status' });
  }
});

// @route   POST /api/github/disconnect
// @desc    Disconnect GitHub account
// @access  Private
router.post('/disconnect', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Clear GitHub credentials
    user.githubAccessToken = undefined;
    user.githubUsername = undefined;
    user.githubId = undefined;
    user.githubProfileUrl = undefined;
    user.githubConnectedAt = undefined;
    
    await user.save();
    
    res.json({
      success: true,
      message: 'GitHub account disconnected successfully'
    });
  } catch (error) {
    console.error('Error disconnecting GitHub:', error);
    res.status(500).json({ message: 'Failed to disconnect GitHub account' });
  }
});

// @route   GET /api/github/repositories
// @desc    Get user's GitHub repositories
// @access  Private
router.get('/repositories', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+githubAccessToken');
    
    if (!user.githubAccessToken) {
      return res.status(400).json({ message: 'GitHub account not connected' });
    }
    
    // Fetch repositories from GitHub API
    const reposResponse = await axios.get('https://api.github.com/user/repos', {
      headers: {
        'Authorization': `Bearer ${user.githubAccessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'EchoHub-App'
      },
      params: {
        sort: 'updated',
        per_page: 50
      }
    });
    
    const repositories = reposResponse.data.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      private: repo.private,
      htmlUrl: repo.html_url,
      language: repo.language,
      updatedAt: repo.updated_at,
      stargazersCount: repo.stargazers_count,
      forksCount: repo.forks_count
    }));
    
    res.json({
      success: true,
      repositories
    });
  } catch (error) {
    console.error('Error fetching GitHub repositories:', error);
    
    if (error.response?.status === 401) {
      // Token might be expired or revoked
      return res.status(401).json({ 
        message: 'GitHub access token is invalid. Please reconnect your account.' 
      });
    }
    
    res.status(500).json({ message: 'Failed to fetch repositories' });
  }
});

module.exports = router;