import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { fetchSessions, createSession } from '../../store/sessionSlice';
import { fetchConnections } from '../../store/connectionSlice';
import { AppDispatch, RootState } from '../../store';

const SessionsList: React.FC = () => {
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [sessionType, setSessionType] = useState<'individual' | 'joint'>('individual');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  
  const { sessions, loading: sessionsLoading, error: sessionsError } = useSelector(
    (state: RootState) => state.sessions
  );
  const { connections, loading: connectionsLoading } = useSelector(
    (state: RootState) => state.connections
  );
  const { user } = useSelector((state: RootState) => state.auth);

  // Fetch sessions and connections when component mounts
  useEffect(() => {
    dispatch(fetchSessions());
    dispatch(fetchConnections());
  }, [dispatch]);

  // Filter active connections that can be invited to a joint session
  const activeConnections = connections.filter(
    (connection) => connection.status === 'active'
  );

  // Handle creating a new session
  const handleCreateSession = async () => {
    if (isCreating) return;

    setIsCreating(true);
    try {
      const participantIds = sessionType === 'joint' ? selectedParticipants : [];
      const result = await dispatch(createSession({ type: sessionType, participantIds })).unwrap();
      setShowNewSessionModal(false);
      setSelectedParticipants([]);
      navigate(`/sessions/${result.id}`);
    } catch (error) {
      console.error('Failed to create session:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // Handle participant selection
  const toggleParticipant = (participantId: string) => {
    if (selectedParticipants.includes(participantId)) {
      setSelectedParticipants(selectedParticipants.filter((id) => id !== participantId));
    } else {
      setSelectedParticipants([...selectedParticipants, participantId]);
    }
  };

  // Reset modal state when closing
  const closeModal = () => {
    setShowNewSessionModal(false);
    setSessionType('individual');
    setSelectedParticipants([]);
  };

  // Group sessions by date (today, yesterday, this week, older)
  const groupSessionsByDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
    
    const groups: { [key: string]: typeof sessions } = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: [],
    };
    
    sessions.forEach((session) => {
      const sessionDate = new Date(session.createdAt);
      sessionDate.setHours(0, 0, 0, 0);
      
      if (sessionDate.getTime() === today.getTime()) {
        groups.today.push(session);
      } else if (sessionDate.getTime() === yesterday.getTime()) {
        groups.yesterday.push(session);
      } else if (sessionDate >= thisWeekStart) {
        groups.thisWeek.push(session);
      } else {
        groups.older.push(session);
      }
    });
    
    return groups;
  };
  
  const sessionGroups = groupSessionsByDate();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Your Conversations</h1>
        <button
          onClick={() => setShowNewSessionModal(true)}
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
          New Conversation
        </button>
      </div>

      {sessionsError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {sessionsError}
        </div>
      )}

      {sessionsLoading ? (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading conversations...</p>
        </div>
      ) : sessions.length === 0 ? (
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
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Conversations Yet</h2>
          <p className="text-gray-600 mb-6">
            Start your first conversation with Coco or invite someone to a joint session.
          </p>
          <button
            onClick={() => setShowNewSessionModal(true)}
            className="px-4 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600"
          >
            Start a Conversation
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Today's sessions */}
          {sessionGroups.today.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-700 mb-3">Today</h2>
              <div className="space-y-3">
                {sessionGroups.today.map((session) => (
                  <SessionCard key={session.id} session={session} userId={user?.id} />
                ))}
              </div>
            </div>
          )}

          {/* Yesterday's sessions */}
          {sessionGroups.yesterday.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-700 mb-3">Yesterday</h2>
              <div className="space-y-3">
                {sessionGroups.yesterday.map((session) => (
                  <SessionCard key={session.id} session={session} userId={user?.id} />
                ))}
              </div>
            </div>
          )}

          {/* This week's sessions */}
          {sessionGroups.thisWeek.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-700 mb-3">This Week</h2>
              <div className="space-y-3">
                {sessionGroups.thisWeek.map((session) => (
                  <SessionCard key={session.id} session={session} userId={user?.id} />
                ))}
              </div>
            </div>
          )}

          {/* Older sessions */}
          {sessionGroups.older.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-700 mb-3">Older</h2>
              <div className="space-y-3">
                {sessionGroups.older.map((session) => (
                  <SessionCard key={session.id} session={session} userId={user?.id} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* New Session Modal */}
      {showNewSessionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Start a New Conversation</h2>
              
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-medium mb-2">Conversation Type</label>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setSessionType('individual')}
                    className={`flex-1 py-2 px-4 rounded-md border ${
                      sessionType === 'individual'
                        ? 'bg-teal-50 border-teal-500 text-teal-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Individual
                  </button>
                  <button
                    type="button"
                    onClick={() => setSessionType('joint')}
                    className={`flex-1 py-2 px-4 rounded-md border ${
                      sessionType === 'joint'
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Joint
                  </button>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  {sessionType === 'individual'
                    ? 'Have a one-on-one conversation with Coco'
                    : 'Invite others to a group conversation facilitated by Coco'}
                </p>
              </div>
              
              {sessionType === 'joint' && (
                <div className="mb-6">
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Select Participants
                  </label>
                  {connectionsLoading ? (
                    <div className="text-center py-4">Loading connections...</div>
                  ) : activeConnections.length === 0 ? (
                    <div className="text-center py-4 bg-gray-50 rounded-md">
                      <p className="text-gray-600 mb-2">No active connections found</p>
                      <Link to="/connections" className="text-teal-600 hover:text-teal-800 text-sm font-medium">
                        Invite someone first
                      </Link>
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md divide-y">
                      {activeConnections.map((connection) => {
                        const participant = connection.creatorId === user?.id
                          ? connection.recipient
                          : connection.creator;
                        
                        return (
                          <div
                            key={connection.id}
                            className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                            onClick={() => toggleParticipant(participant.id)}
                          >
                            <input
                              type="checkbox"
                              checked={selectedParticipants.includes(participant.id)}
                              onChange={() => toggleParticipant(participant.id)}
                              className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                            />
                            <label className="ml-3 block text-gray-700">
                              {participant.pseudonym}
                              <span className="text-xs text-gray-500 ml-2">
                                ({connection.relationshipType})
                              </span>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {sessionType === 'joint' && selectedParticipants.length === 0 && (
                    <p className="mt-2 text-sm text-red-500">
                      Please select at least one participant for a joint session
                    </p>
                  )}
                </div>
              )}
              
              <div className="flex justify-end space-x-3 mt-8">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateSession}
                  disabled={
                    isCreating ||
                    (sessionType === 'joint' && selectedParticipants.length === 0) ||
                    (sessionType === 'joint' && activeConnections.length === 0)
                  }
                  className={`px-4 py-2 rounded-md text-white ${
                    isCreating ||
                    (sessionType === 'joint' && selectedParticipants.length === 0) ||
                    (sessionType === 'joint' && activeConnections.length === 0)
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-teal-500 hover:bg-teal-600'
                  }`}
                >
                  {isCreating ? 'Creating...' : 'Start Conversation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Session Card Component
interface SessionCardProps {
  session: any;
  userId?: string;
}

const SessionCard: React.FC<SessionCardProps> = ({ session, userId }) => {
  const sessionTime = new Date(session.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Get participants excluding current user
  const otherParticipants = session.participants
    .filter((p: any) => p.user.id !== userId)
    .map((p: any) => p.user.pseudonym);

  // Get the latest message (could be empty if no messages yet)
  const latestMessage = session.messages && session.messages.length > 0 ? session.messages[0] : null;

  return (
    <Link
      to={`/sessions/${session.id}`}
      className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
    >
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-medium text-gray-800">
              {session.type === 'individual'
                ? 'Individual Session with Coco'
                : `Session with ${otherParticipants.join(', ')}`}
            </h3>
            <p className="text-sm text-gray-500">{sessionTime}</p>
          </div>
          <span
            className={`px-2 py-1 text-xs rounded-full ${
              session.endedAt
                ? 'bg-gray-100 text-gray-800'
                : 'bg-green-100 text-green-800'
            }`}
          >
            {session.endedAt ? 'Ended' : 'Active'}
          </span>
        </div>
        
        {latestMessage ? (
          <p className="text-gray-600 text-sm truncate">
            <span className="font-medium">
              {latestMessage.isAi
                ? 'Coco'
                : latestMessage.sender.id === userId
                ? 'You'
                : latestMessage.sender.pseudonym}
              :
            </span>{' '}
            {latestMessage.encryptedContent}
          </p>
        ) : (
          <p className="text-gray-500 text-sm italic">No messages yet</p>
        )}
      </div>
      <div
        className={`h-1 ${
          session.type === 'individual' ? 'bg-teal-500' : 'bg-blue-500'
        }`}
      ></div>
    </Link>
  );
};

export default SessionsList;