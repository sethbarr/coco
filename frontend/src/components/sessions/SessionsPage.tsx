import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import api from '../../utils/api';

interface SessionSummary {
  id: string;
  type: 'individual' | 'joint';
  createdAt: string;
  endedAt: string | null;
  participants: Array<{ user: { id: string; pseudonym: string } }>;
  messages: Array<{ sentAt: string; isAi: boolean }>;
}

const SessionsPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get('/sessions')
      .then(res => setSessions(res.data))
      .catch(err => setError(err.response?.data?.message || 'Failed to load sessions'))
      .finally(() => setLoading(false));
  }, []);

  const sessionLabel = (s: SessionSummary) => {
    if (s.type === 'individual') return 'Individual session with Coco';
    const others = s.participants
      .filter(p => p.user.id !== user?.id)
      .map(p => p.user.pseudonym)
      .join(', ');
    return `Joint session with ${others || 'partner'}`;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">All Sessions</h1>
      <div className="bg-white rounded-lg shadow-md p-6">
        {loading ? (
          <p className="text-gray-500">Loading sessions…</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : sessions.length === 0 ? (
          <p className="text-gray-500">
            No sessions yet.{' '}
            <Link to="/chat" className="text-teal-600 hover:text-teal-800">Start talking with Coco</Link>.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {sessions.map(s => (
              <li key={s.id} className="py-3 flex items-center justify-between">
                <div>
                  <Link to={`/sessions/${s.id}`} className="font-medium text-teal-700 hover:text-teal-900">
                    {sessionLabel(s)}
                  </Link>
                  <div className="text-sm text-gray-500">
                    Started {new Date(s.createdAt).toLocaleString()}
                    {s.endedAt && ' · ended'}
                    {s.messages?.[0] && ` · last activity ${new Date(s.messages[0].sentAt).toLocaleString()}`}
                  </div>
                </div>
                <Link
                  to={`/sessions/${s.id}`}
                  className="bg-teal-500 hover:bg-teal-600 text-white text-sm py-1 px-3 rounded"
                >
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-4">
        <Link to="/dashboard" className="text-teal-600 hover:text-teal-800">← Back to Dashboard</Link>
      </div>
    </div>
  );
};

export default SessionsPage;
