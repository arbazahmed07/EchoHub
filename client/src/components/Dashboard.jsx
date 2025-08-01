import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import CreateWorkspaceModal from './CreateWorkspaceModal';
import WorkspaceDetail from './WorkspaceDetail';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(null);
  const [loading, setLoading] = useState({ workspaces: true, invites: true });

  useEffect(() => {
    fetchWorkspaces();
    fetchPendingInvites();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/workspaces', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWorkspaces(response.data.workspaces || []);
    } catch (error) {
      console.error('Error fetching workspaces:', error);
    } finally {
      setLoading(prev => ({ ...prev, workspaces: false }));
    }
  };

  const fetchPendingInvites = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/invites/pending', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingInvites(response.data.invites || []);
    } catch (error) {
      console.error('Error fetching invites:', error);
    } finally {
      setLoading(prev => ({ ...prev, invites: false }));
    }
  };

  const handleInviteAction = async (inviteId, action) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:5000/api/invites/${inviteId}/${action}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Remove the invite from the list
      setPendingInvites(prev => prev.filter(invite => invite.id !== inviteId));
      
      // Refresh workspaces if accepted
      if (action === 'accept') {
        fetchWorkspaces();
      }
    } catch (error) {
      console.error(`Error ${action}ing invite:`, error);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const openWorkspace = (workspaceId) => {
    setSelectedWorkspaceId(workspaceId);
  };

  const handleBackToDashboard = () => {
    setSelectedWorkspaceId(null);
  };

  const handleWorkspaceCreated = (newWorkspace) => {
    // Add the new workspace to the list
    setWorkspaces(prev => [newWorkspace, ...prev]);
  };

  // If a workspace is selected, show the workspace detail view
  if (selectedWorkspaceId) {
    return (
      <WorkspaceDetail 
        workspaceId={selectedWorkspaceId} 
        onBack={handleBackToDashboard}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">EchoHub</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user?.name}</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Top Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Create Workspace</span>
            </button>
          </div>
        </div>

        {/* My Workspaces Section */}
        <section className="mb-12">
          <h3 className="text-2xl font-semibold text-gray-900 mb-6">My Workspaces</h3>
          {loading.workspaces ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : workspaces.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h4 className="mt-4 text-lg font-medium text-gray-900">No workspaces yet</h4>
              <p className="mt-2 text-gray-500">Create your first workspace to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workspaces.map((workspace) => (
                <div key={workspace.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-900 truncate">{workspace.name}</h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      workspace.role === 'Creator' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {workspace.role}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{workspace.description}</p>
                  <button
                    onClick={() => openWorkspace(workspace.id)}
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors"
                  >
                    Open
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Pending Invitations Section */}
        <section className="mb-12">
          <h3 className="text-2xl font-semibold text-gray-900 mb-6">Pending Invitations</h3>
          {loading.invites ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : pendingInvites.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-gray-500 text-center">No pending invitations</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingInvites.map((invite) => (
                <div key={invite.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-gray-900">{invite.workspaceName}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Invited by <span className="font-medium">{invite.invitedBy}</span>
                      </p>
                    </div>
                    <div className="flex space-x-3 ml-6">
                      <button
                        onClick={() => handleInviteAction(invite.id, 'decline')}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => handleInviteAction(invite.id, 'accept')}
                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 transition-colors"
                      >
                        Accept
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Integrations Section */}
        <section>
          <h3 className="text-2xl font-semibold text-gray-900 mb-6">Integrations</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="bg-white border border-gray-300 rounded-lg p-6 hover:shadow-md transition-shadow group">
              <div className="flex items-center justify-center w-12 h-12 bg-gray-900 rounded-lg mx-auto mb-4 group-hover:bg-gray-800 transition-colors">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </div>
              <h4 className="text-sm font-medium text-gray-900">Connect GitHub</h4>
              <p className="text-xs text-gray-500 mt-1">Sync repositories</p>
            </button>

            <button className="bg-white border border-gray-300 rounded-lg p-6 hover:shadow-md transition-shadow group">
              <div className="flex items-center justify-center w-12 h-12 bg-purple-600 rounded-lg mx-auto mb-4 group-hover:bg-purple-700 transition-colors">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5.042 15.165a2.528 2.528 0 0 0-2.52 2.523A2.528 2.528 0 0 0 5.042 20.21a2.528 2.528 0 0 0 2.52-2.522 2.528 2.528 0 0 0-2.52-2.523z"/>
                  <path d="M24 0L0 5.604V24l24-5.604V0z"/>
                </svg>
              </div>
              <h4 className="text-sm font-medium text-gray-900">Connect Slack</h4>
              <p className="text-xs text-gray-500 mt-1">Team communication</p>
            </button>

            <button className="bg-white border border-gray-300 rounded-lg p-6 hover:shadow-md transition-shadow group">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-lg mx-auto mb-4 group-hover:bg-blue-700 transition-colors">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.727 6.727h5.818V1.636c0-.9-.736-1.636-1.636-1.636H14.727v6.727zM14.727 8.364V24h5.182c.9 0 1.636-.736 1.636-1.636V8.364h-6.818z"/>
                  <path d="M1.636 0C.736 0 0 .736 0 1.636v20.728C0 23.264.736 24 1.636 24h11.455V0H1.636z"/>
                </svg>
              </div>
              <h4 className="text-sm font-medium text-gray-900">Connect Google Docs</h4>
              <p className="text-xs text-gray-500 mt-1">Document collaboration</p>
            </button>

            <button className="bg-white border border-gray-300 rounded-lg p-6 hover:shadow-md transition-shadow group">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-500 rounded-lg mx-auto mb-4 group-hover:bg-blue-600 transition-colors">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M1.5 2C.7 2 0 2.7 0 3.5v17c0 .8.7 1.5 1.5 1.5h21c.8 0 1.5-.7 1.5-1.5v-17c0-.8-.7-1.5-1.5-1.5h-21zM12 6.5c1.9 0 3.5 1.6 3.5 3.5s-1.6 3.5-3.5 3.5-3.5-1.6-3.5-3.5 1.6-3.5 3.5-3.5zm-6 11h12v-1.5c0-2-4-3.1-6-3.1s-6 1.1-6 3.1V17.5z"/>
                </svg>
              </div>
              <h4 className="text-sm font-medium text-gray-900">Connect Zoom</h4>
              <p className="text-xs text-gray-500 mt-1">Video meetings</p>
            </button>
          </div>
        </section>
      </main>

      {/* Create Workspace Modal (Placeholder) */}
      <CreateWorkspaceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onWorkspaceCreated={handleWorkspaceCreated}
      />
    </div>
  );
};

export default Dashboard;
