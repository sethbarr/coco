import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { RootState } from '../store';
import { fetchSessions } from '../store/sessionSlice';
import { fetchConnections } from '../store/connectionSlice';

const Dashboard: React.FC = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { sessions } = useSelector((state: RootState) => state.sessions);
  const { connections } = useSelector((state: RootState) => state.connections);
  
  useEffect(() => {
    // @ts-ignore
    dispatch(fetchSessions());
    // @ts-ignore
    dispatch(fetchConnections());
  }, [dispatch]);
  
  // Filter for pending connections (invites)
  const pendingConnections = connections.filter(
    connection => connection.status === 'pending' && connection.recipientId === user?.id
  );
  
  // Get recent sessions (just the last 3)
  const recentSessions = sessions.slice(0, 3);
  
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pending Invites Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Pending Invites ({pendingConnections.length})
          </h2>
          
          {pendingConnections.length === 0 ? (
            <p className="text-gray-500">No pending invites</p>
          ) : (
            <ul className="space-y-3">
              {pendingConnections.map((connection) => (
                <li key={connection.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div>
                    <p className="font-medium">{connection.creator.pseudonym}</p>
                    <p className="text-sm text-gray-500">Sent you a connection request</p>
                  </div>
                  <div className="space-x-2">
                    <button 
                      className="bg-teal-500 hover:bg-teal-600 text-white px-3 py-1 rounded text-sm"
                      onClick={() => {
                        // This would need to be implemented
                        console.log('Accept connection', connection.id);
                      }}
                    >
                      Accept
                    </button>
                    <button 
                      className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-1 rounded text-sm"
                      onClick={() => {
                        // This would need to be implemented
                        console.log('Decline connection', connection.id);
                      }}
                    >
                      Decline
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        {/* Recent Sessions Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Recent Sessions
          </h2>
          
          {recentSessions.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-500 mb-4">You haven't had any sessions yet</p>
              <Link
                to="/chat"
                className="bg-teal-500 hover:bg-teal-600 text-white font-medium py-2 px-4 rounded inline-block"
              >
                Start a Session
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSessions.map((session) => (
                <Link
                  key={session.id}
                  to={`/sessions/${session.id}`}
                  className="block p-3 hover:bg-gray-50 rounded-md border border-gray-200"
                >
                  <h3 className="font-medium text-gray-800">
                    {session.type === 'individual' 
                      ? 'Individual Session'
                      : `Session with ${session.participants
                              .filter((p) => p.user.id !== user?.id)
                              .map((p) => p.user.pseudonym)
                              .join(', ')}`}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(session.createdAt).toLocaleDateString()} at {new Date(session.createdAt).toLocaleTimeString()}
                  </p>
                </Link>
              ))}
              
              <div className="mt-4 text-right">
                <Link to="/sessions" className="text-teal-600 hover:text-teal-800 font-medium">
                  View All Sessions →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Quick Start Section */}
      <div className="bg-gradient-to-r from-teal-500 to-blue-500 rounded-lg shadow-lg mt-8 p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold mb-2">Need someone to talk to?</h2>
            <p className="text-white/90 mb-2">Start a conversation with Coco or invite someone to a joint session.</p>
          </div>
          <div className="space-x-4">
            <Link
              to="/chat"
              className="bg-white/20 hover:bg-white/30 text-white font-medium py-2 px-4 rounded"
            >
              Individual Session
            </Link>
            <Link
              to="/connections"
              className="bg-white/20 hover:bg-white/30 text-white font-medium py-2 px-4 rounded"
            >
              My Connections
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;