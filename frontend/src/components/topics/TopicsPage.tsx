import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { fetchConnections } from '../../store/connectionSlice';
import api from '../../utils/api';

export interface TopicSummaryView {
  content: string | null;
  approvedAt: string | null;
  updatedAt?: string;
  approved?: boolean;
}

export interface TopicView {
  id: string;
  title: string;
  status: 'prep' | 'joint_ready' | 'closed';
  createdAt: string;
  partner: { id: string; pseudonym: string };
  mySummary: { content: string; approvedAt: string | null; updatedAt: string } | null;
  partnerSummary: TopicSummaryView | null;
  myPrepSessionId: string | null;
  myReflectionSessionId: string | null;
  jointSessionId: string | null;
  checkinSessionId: string | null;
  nextCheckInAt: string | null;
  bothApproved: boolean;
}

const statusBadge = (t: TopicView) => {
  if (t.status === 'joint_ready' || t.bothApproved)
    return <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Ready for joint session</span>;
  return <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">In preparation</span>;
};

const TopicsPage: React.FC = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { connections } = useSelector((state: RootState) => state.connections);

  const [topics, setTopics] = useState<TopicView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [connectionId, setConnectionId] = useState('');
  const [creating, setCreating] = useState(false);

  const activeConnections = connections.filter(c => c.status === 'active');

  useEffect(() => {
    // @ts-ignore
    dispatch(fetchConnections());
    api.get('/topics')
      .then(res => setTopics(res.data))
      .catch(err => setError(err.response?.data?.message || 'Failed to load topics'))
      .finally(() => setLoading(false));
  }, [dispatch]);

  useEffect(() => {
    if (!connectionId && activeConnections.length > 0) {
      setConnectionId(activeConnections[0].id);
    }
  }, [activeConnections, connectionId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !connectionId) return;
    setCreating(true);
    setError(null);
    try {
      const res = await api.post('/topics', { title: title.trim(), connectionId });
      setTopics([res.data, ...topics]);
      setTitle('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create topic');
    } finally {
      setCreating(false);
    }
  };

  const partnerName = (c: any) =>
    c.creator.id === user?.id ? c.recipient.pseudonym : c.creator.pseudonym;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Topics</h1>
      <p className="text-gray-600 mb-6">
        A topic is one issue you and a partner want to work through together. You each prepare
        privately with Coco, approve what you're comfortable sharing, then meet in a joint session.
      </p>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Start a new topic</h2>
        {activeConnections.length === 0 ? (
          <p className="text-gray-500 text-sm">
            You need an active connection first —{' '}
            <Link to="/connections" className="text-teal-600 hover:text-teal-800">invite your partner</Link>.
          </p>
        ) : (
          <form onSubmit={handleCreate} className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[240px]">
              <label className="block text-sm text-gray-600 mb-1">What do you want to work on?</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:border-teal-500"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder='e.g. "How we talk about money"'
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">With</label>
              <select
                className="border border-gray-300 rounded-md p-2 focus:outline-none focus:border-teal-500"
                value={connectionId}
                onChange={e => setConnectionId(e.target.value)}
              >
                {activeConnections.map(c => (
                  <option key={c.id} value={c.id}>{partnerName(c)}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={!title.trim() || creating}
              className="bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-md"
            >
              {creating ? 'Creating…' : 'Create Topic'}
            </button>
          </form>
        )}
        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Your topics</h2>
        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : topics.length === 0 ? (
          <p className="text-gray-500 text-sm">No topics yet. Create one above to begin.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {topics.map(t => (
              <li key={t.id} className="py-3 flex items-center justify-between">
                <div>
                  <Link to={`/topics/${t.id}`} className="font-medium text-teal-700 hover:text-teal-900">
                    {t.title}
                  </Link>
                  <div className="text-sm text-gray-500">with {t.partner.pseudonym}</div>
                </div>
                <div className="flex items-center gap-3">
                  {statusBadge(t)}
                  <Link
                    to={`/topics/${t.id}`}
                    className="bg-teal-500 hover:bg-teal-600 text-white text-sm py-1 px-3 rounded"
                  >
                    Open
                  </Link>
                </div>
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

export default TopicsPage;
