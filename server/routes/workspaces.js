const express = require('express');
const auth = require('../middleware/auth');
const Workspace = require('../models/Workspace');
const Invite = require('../models/Invite');
const User = require('../models/User');
const router = express.Router();

// @route   POST /api/workspaces
// @desc    Create a new workspace
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, invites = [] } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Workspace name is required' });
    }

    // Create workspace
    const workspace = await Workspace.create({
      name: name.trim(),
      description: description?.trim() || '',
      creator: req.user.id,
      members: [{ user: req.user.id, role: 'Creator' }]
    });

    // Process invitations
    for (const email of invites) {
      if (email.trim() && email !== req.user.email) {
        await Invite.create({
          workspace: workspace._id,
          email: email.trim().toLowerCase(),
          invitedBy: req.user.id,
          status: 'pending'
        });
      }
    }

    // Populate the response
    await workspace.populate('creator', 'name email');

    res.status(201).json({
      success: true,
      workspace: {
        id: workspace._id,
        name: workspace.name,
        description: workspace.description,
        role: 'Creator',
        creator: workspace.creator,
        createdAt: workspace.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/workspaces
// @desc    Get user's workspaces
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const workspaces = await Workspace.find({
      'members.user': req.user.id
    }).populate('creator', 'name email');

    const workspaceList = workspaces.map(workspace => {
      const userMembership = workspace.members.find(
        member => member.user.toString() === req.user.id
      );

      return {
        id: workspace._id,
        name: workspace.name,
        description: workspace.description,
        role: userMembership?.role || 'Member',
        creator: workspace.creator,
        createdAt: workspace.createdAt
      };
    });

    res.json({
      success: true,
      workspaces: workspaceList
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/workspaces/:id
// @desc    Get workspace details with members and invites
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Find the workspace
    const workspace = await Workspace.findById(id)
      .populate('creator', 'name email')
      .populate('members.user', 'name email');

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Check if user is a member
    const userMembership = workspace.members.find(
      member => member.user._id.toString() === req.user.id
    );

    if (!userMembership) {
      return res.status(403).json({ message: 'Not authorized to view this workspace' });
    }

    // Get all invites for this workspace (only if user is Creator or Admin)
    let invites = [];
    if (['Creator', 'Admin'].includes(userMembership.role)) {
      invites = await Invite.find({ workspace: id })
        .populate('invitedBy', 'name email')
        .sort({ createdAt: -1 });
    }

    // Format the response
    const workspaceData = {
      id: workspace._id,
      name: workspace.name,
      description: workspace.description,
      creator: workspace.creator,
      userRole: userMembership.role,
      createdAt: workspace.createdAt,
      members: workspace.members.map(member => ({
        id: member._id,
        user: {
          id: member.user._id,
          name: member.user.name,
          email: member.user.email
        },
        role: member.role,
        joinedAt: member.joinedAt
      })),
      invites: invites.map(invite => ({
        id: invite._id,
        email: invite.email,
        status: invite.status,
        invitedBy: invite.invitedBy.name,
        invitedByEmail: invite.invitedBy.email,
        createdAt: invite.createdAt
      }))
    };

    res.json({
      success: true,
      workspace: workspaceData
    });
  } catch (error) {
    console.error('Error fetching workspace details:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;