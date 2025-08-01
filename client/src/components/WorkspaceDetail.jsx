import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const WorkspaceDetail = ({ workspaceId, onBack }) => {
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('members');

  useEffect(() => {
    fetchWorkspaceDetails();
  }, [workspaceId]);

  const fetchWorkspaceDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/workspaces/${workspaceId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWorkspace(response.data.workspace);
    } catch (error) {
      console.error('Error fetching workspace details:', error);
      setError(error.response?.data?.message || 'Failed to load workspace');
    } finally {
      setLoading(false);
    }
  };

  const canManageMembers = workspace?.userRole === 'Creator' || workspace?.userRole === 'Admin';

  const acceptedMembers = workspace?.members || [];
  const pendingInvites = workspace?.invites?.filter(invite => invite.status === 'pending') || [];
  const declinedInvites = workspace?.invites?.filter(invite => invite.status === 'declined') || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading workspace...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={onBack}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">{workspace.name}</h1>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                workspace.userRole === 'Creator' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {workspace.userRole}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user?.name}</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Workspace Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{workspace.name}</h2>
              {workspace.description && (
                <p className="text-gray-600 mb-4">{workspace.description}</p>
              )}
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>Created by {workspace.creator.name}</span>
                <span>•</span>
                <span>{new Date(workspace.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('members')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'members'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Members ({acceptedMembers.length})
              </button>
              {canManageMembers && (
                <>
                  <button
                    onClick={() => setActiveTab('pending')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'pending'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Pending ({pendingInvites.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('declined')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'declined'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Declined ({declinedInvites.length})
                  </button>
                </>
              )}
            </nav>
          </div>

          <div className="p-6">
            {/* Members Tab */}
            {activeTab === 'members' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Members</h3>
                {acceptedMembers.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No members yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {acceptedMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {member.user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{member.user.name}</h4>
                            <p className="text-sm text-gray-500">{member.user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            member.role === 'Creator' 
                              ? 'bg-blue-100 text-blue-800'
                              : member.role === 'Admin'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {member.role}
                          </span>
                          <span className="text-xs text-gray-500">
                            Joined {new Date(member.joinedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Pending Invites Tab */}
            {activeTab === 'pending' && canManageMembers && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Invitations</h3>
                {pendingInvites.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No pending invitations</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingInvites.map((invite) => (
                      <div key={invite.id} className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{invite.email}</h4>
                            <p className="text-sm text-gray-500">Invited by {invite.invitedBy}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                            Pending
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(invite.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Declined Invites Tab */}
            {activeTab === 'declined' && canManageMembers && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Declined Invitations</h3>
                {declinedInvites.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No declined invitations</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {declinedInvites.map((invite) => (
                      <div key={invite.id} className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{invite.email}</h4>
                            <p className="text-sm text-gray-500">Invited by {invite.invitedBy}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                            Declined
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(invite.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default WorkspaceDetail;