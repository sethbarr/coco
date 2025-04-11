import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchConnections, 
  inviteConnection, 
  acceptConnection, 
  declineConnection, 
  removeConnection,
  searchUsers
} from '../../store/connectionSlice';
import { AppDispatch, RootState } from '../../store';

const ConnectionsList: React.FC = () => {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [pseudonym, setPseudonym] = useState('');
  const [relationshipType, setRelationshipType] = useState('partner');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [inviting, setInviting] = useState(false);

  const dispatch = useDispatch<AppDispatch>();
  
  const { connections, loading, error } = useSelector((state: RootState) => state.connections);
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    dispatch(fetchConnections());
  }, [dispatch]);

  // Handle searching for users
  const handleSearch = async () => {
    if (searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await dispatch(searchUsers(searchQuery)).unwrap();
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 3) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle sending an invitation
  const handleInvite = async () => {
    if (!pseudonym || !relationshipType || inviting) return;

    setInviting(true);
    try {
      await dispatch(inviteConnection({ recipientPseudonym: pseudonym, relationshipType })).unwrap();
      setPseudonym('');
      setRelationshipType('partner');
      setShowInviteModal(false);
    } catch (error) {
      console.error('Invitation failed:', error);
    } finally {
      setInviting(false);
    }
  };

  // Handle accepting a connection invitation
  const handleAccept = async (connectionId: string) => {
    try {
      await dispatch(acceptConnection(connectionId)).unwrap();
    } catch (error) {
      console.error('Failed to accept connection:', error);
    }
  };

  // Handle declining a connection invitation
  const handleDecline = async (connectionId: string) => {
    try {
      await dispatch(declineConnection(connectionId)).unwrap();
    } catch (error) {
      console.error('Failed to decline connection:', error);
    }
  };

  // Handle removing a connection
  const handleRemove = async (connectionId: string) => {
    if (window.confirm('Are you sure you want to remove this connection?')) {
      try {
        await dispatch(removeConnection(connectionId)).unwrap();
      } catch (error) {
        console.error('Failed to remove connection:', error);
      }
    }
  };

  // Group connections by status
  const pendingIncoming = connections.filter(
    conn => conn.status === 'pending' && conn.recipientId === user?.id
  );
  
  const pendingOutgoing = connections.filter(
    conn => conn.status === 'pending' && conn.creatorId === user?.id
  );
  
  const activeConnections = connections.filter(conn => conn.status === 'active');
  
  const declinedConnections = connections.filter(conn => conn.status === 'declined');

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Your Connections</h1>
        <button
          onClick={() => setShowInviteModal(true)}
          className="px-4 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600 flex items-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          Invite Connection
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading connections...</p>
        </div>
      ) : connections.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-lg shadow-md">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 text-gray-400 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Connections Yet</h2>
          <p className="text-gray-600 mb-6">
            Invite someone to connect and start having joint conversations.
          </p>
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600"
          >
            Invite Someone
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Pending Incoming Connections */}
          {pendingIncoming.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
                Incoming Requests
                <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                  {pendingIncoming.length}
                </span>
              </h2>
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <ul className="divide-y divide-gray-200">
                  {pendingIncoming.map((connection) => (
                    <li key={connection.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-800">{connection.creator.pseudonym}</h3>
                          <p className="text-sm text-gray-500">
                            Wants to connect as: <span className="font-medium">{connection.relationshipType}</span>
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(connection.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleAccept(connection.id)}
                            className="px-3 py-1 bg-teal-100 text-teal-800 rounded-md hover:bg-teal-200"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleDecline(connection.id)}
                            className="px-3 py-1 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Active Connections */}
          {activeConnections.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-700 mb-3">
                Active Connections ({activeConnections.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeConnections.map((connection) => {
                  const otherUser = connection.creatorId === user?.id
                    ? connection.recipient
                    : connection.creator;
                  
                  return (
                    <div
                      key={connection.id}
                      className="bg-white rounded-lg shadow-md p-4 border-l-4 border-teal-500"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-800">{otherUser.pseudonym}</h3>
                          <p className="text-sm text-gray-500">
                            {connection.relationshipType}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Connected since {new Date(connection.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemove(connection.id)}
                          className="text-rose-600 hover:text-rose-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pending Outgoing Connections */}
          {pendingOutgoing.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-700 mb-3">
                Sent Invitations ({pendingOutgoing.length})
              </h2>
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <ul className="divide-y divide-gray-200">
                  {pendingOutgoing.map((connection) => (
                    <li key={connection.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-800">{connection.recipient.pseudonym}</h3>
                          <p className="text-sm text-gray-500">
                            Invited as: <span className="font-medium">{connection.relationshipType}</span>
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Sent on {new Date(connection.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                            Pending
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Invite a Connection</h2>
              
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="pseudonym">
                  Find by Pseudonym
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="pseudonym"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Search for a user..."
                    autoComplete="off"
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-2">
                      <div className="animate-spin h-5 w-5 border-2 border-teal-500 rounded-full border-t-transparent"></div>
                    </div>
                  )}
                </div>
                
                {searchQuery.length > 0 && (
                  <div className="mt-2">
                    {searchQuery.length < 3 ? (
                      <p className="text-sm text-gray-500">
                        Type at least 3 characters to search
                      </p>
                    ) : searchResults.length === 0 && !isSearching ? (
                      <p className="text-sm text-gray-500">
                        No users found with that pseudonym
                      </p>
                    ) : (
                      <ul className="mt-2 border border-gray-200 rounded-md divide-y max-h-40 overflow-y-auto">
                        {searchResults.map((result) => (
                          <li
                            key={result.id}
                            className="p-2 hover:bg-gray-50 cursor-pointer"
                            onClick={() => {
                              setPseudonym(result.pseudonym);
                              setSearchQuery('');
                              setSearchResults([]);
                            }}
                          >
                            <p className="font-medium">{result.pseudonym}</p>
                            <p className="text-xs text-gray-500">
                              Member since{' '}
                              {new Date(result.createdAt).toLocaleDateString()}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
              
              {pseudonym && (
                <div className="mb-6">
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Selected User
                  </label>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <p className="font-medium text-gray-800">{pseudonym}</p>
                  </div>
                </div>
              )}
              
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Relationship Type
                </label>
                <select
                  value={relationshipType}
                  onChange={(e) => setRelationshipType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="partner">Partner</option>
                  <option value="family">Family Member</option>
                  <option value="friend">Friend</option>
                </select>
              </div>
              
              <div className="flex justify-end space-x-3 mt-8">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setPseudonym('');
                    setSearchQuery('');
                    setRelationshipType('partner');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleInvite}
                  disabled={!pseudonym || inviting}
                  className={`px-4 py-2 rounded-md text-white ${
                    !pseudonym || inviting
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-teal-500 hover:bg-teal-600'
                  }`}
                >
                  {inviting ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionsList;