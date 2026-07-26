import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { RootState } from '../../store';
import {
  fetchConnections,
  inviteConnection,
  acceptConnection,
  declineConnection,
  removeConnection,
  Connection,
} from '../../store/connectionSlice';
import api from '../../utils/api';

const ConnectionsPage: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const { connections, loading, error } = useSelector((state: RootState) => state.connections);

  const [pseudonym, setPseudonym] = useState('');
  const [relationshipType, setRelationshipType] = useState('partner');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [startingSession, setStartingSession] = useState<string | null>(null);

  useEffect(() => {
    // @ts-ignore
    dispatch(fetchConnections());
  }, [dispatch]);

  const partnerOf = (conn: Connection) =>
    conn.creator.id === user?.id ? conn.recipient : conn.creator;

  const incoming = connections.filter(c => c.status === 'pending' && c.recipient.id === user?.id);
  const outgoing = connections.filter(c => c.status === 'pending' && c.creator.id === user?.id);
  const active = connections.filter(c => c.status === 'active');

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(null);
    if (!pseudonym.trim()) return;
    // @ts-ignore
    const result = await dispatch(inviteConnection({ recipientPseudonym: pseudonym.trim(), relationshipType }));
    if (result.type.endsWith('rejected')) {
      setInviteError(typeof result.payload === 'string' ? result.payload : 'Failed to send invitation');
    } else {
      setInviteSuccess(`Invitation sent to ${pseudonym.trim()}`);
      setPseudonym('');
      // @ts-ignore
      dispatch(fetchConnections());
    }
  };

  const startJointSession = async (conn: Connection) => {
    const partner = partnerOf(conn);
    setStartingSession(conn.id);
    try {
      const response = await api.post('/sessions', {
        type: 'joint',
        participantIds: [partner.id],
      });
      navigate(`/sessions/${response.data.id}`);
    } catch (err: any) {
      setInviteError(err.response?.data?.message || 'Failed to start joint session');
    } finally {
      setStartingSession(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">My Connections</h1>

      {/* Invite form */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Invite someone to connect</h2>
        <p className="text-sm text-gray-500 mb-4">
          Enter the pseudonym of the person you want to work with. Once they accept, you can start
          joint sessions together with Coco.
        </p>
        <form onSubmit={handleInvite} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm text-gray-600 mb-1">Pseudonym</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:border-teal-500"
              value={pseudonym}
              onChange={(e) => setPseudonym(e.target.value)}
              placeholder="e.g. testuser2"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Relationship</label>
            <select
              className="border border-gray-300 rounded-md p-2 focus:outline-none focus:border-teal-500"
              value={relationshipType}
              onChange={(e) => setRelationshipType(e.target.value)}
            >
              <option value="partner">Partner</option>
              <option value="family">Family</option>
              <option value="friend">Friend</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={!pseudonym.trim() || loading}
            className="bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-md"
          >
            Send Invitation
          </button>
        </form>
        {inviteError && <p className="text-red-600 text-sm mt-3">{inviteError}</p>}
        {inviteSuccess && <p className="text-green-600 text-sm mt-3">{inviteSuccess}</p>}
      </div>

      {/* Incoming invitations */}
      {incoming.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Invitations for you</h2>
          <ul className="divide-y divide-gray-100">
            {incoming.map(conn => (
              <li key={conn.id} className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-800">{conn.creator.pseudonym}</span>
                  <span className="text-sm text-gray-500 ml-2">({conn.relationshipType})</span>
                </div>
                <div className="space-x-2">
                  <button
                    // @ts-ignore
                    onClick={() => dispatch(acceptConnection(conn.id))}
                    className="bg-teal-500 hover:bg-teal-600 text-white text-sm py-1 px-3 rounded"
                  >
                    Accept
                  </button>
                  <button
                    // @ts-ignore
                    onClick={() => dispatch(declineConnection(conn.id))}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm py-1 px-3 rounded"
                  >
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Active connections */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Connected</h2>
        {active.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No active connections yet. Invite someone above to begin shared work.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {active.map(conn => {
              const partner = partnerOf(conn);
              return (
                <li key={conn.id} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-800">{partner.pseudonym}</span>
                    <span className="text-sm text-gray-500 ml-2">({conn.relationshipType})</span>
                  </div>
                  <div className="space-x-2">
                    <button
                      onClick={() => startJointSession(conn)}
                      disabled={startingSession === conn.id}
                      className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm py-1 px-3 rounded"
                    >
                      {startingSession === conn.id ? 'Starting…' : 'Start Joint Session'}
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Remove connection with ${partner.pseudonym}?`)) {
                          // @ts-ignore
                          dispatch(removeConnection(conn.id));
                        }
                      }}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm py-1 px-3 rounded"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Outgoing invitations */}
      {outgoing.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Waiting on</h2>
          <ul className="divide-y divide-gray-100">
            {outgoing.map(conn => (
              <li key={conn.id} className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-800">{conn.recipient.pseudonym}</span>
                  <span className="text-sm text-gray-500 ml-2">({conn.relationshipType}) — pending</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      <Link to="/dashboard" className="text-teal-600 hover:text-teal-800">← Back to Dashboard</Link>
    </div>
  );
};

export default ConnectionsPage;
