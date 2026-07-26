import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../utils/api';
import { TopicView } from './TopicsPage';

const Step: React.FC<{ n: number; title: string; done: boolean; children: React.ReactNode }> = ({ n, title, done, children }) => (
  <div className="bg-white rounded-lg shadow-md p-6 mb-4">
    <div className="flex items-center mb-3">
      <div className={`h-7 w-7 rounded-full flex items-center justify-center text-sm font-bold mr-3
        ${done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
        {done ? '✓' : n}
      </div>
      <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
    </div>
    {children}
  </div>
);

const TopicDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [topic, setTopic] = useState<TopicView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.get(`/topics/${id}`)
      .then(res => {
        setTopic(res.data);
        setDraft(res.data.mySummary?.content || '');
      })
      .catch(err => setError(err.response?.data?.message || 'Failed to load topic'));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (error) {
    return (
      <div className="max-w-3xl mx-auto">
        <p className="text-red-600">{error}</p>
        <Link to="/topics" className="text-teal-600 hover:text-teal-800">← Back to Topics</Link>
      </div>
    );
  }
  if (!topic) return <div className="max-w-3xl mx-auto text-gray-500">Loading…</div>;

  const myApproved = !!topic.mySummary?.approvedAt;
  const partnerApproved = !!topic.partnerSummary?.approved;
  const draftChanged = draft.trim() !== (topic.mySummary?.content || '').trim();

  const startPrep = async () => {
    setBusy(true);
    try {
      const res = await api.post(`/topics/${topic.id}/prep`);
      navigate(`/sessions/${res.data.sessionId}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to open prep session');
    } finally {
      setBusy(false);
    }
  };

  const saveDraft = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      await api.put(`/topics/${topic.id}/summary`, { content: draft.trim() });
      load();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save summary');
    } finally {
      setSaving(false);
    }
  };

  const approve = async () => {
    setBusy(true);
    try {
      await api.post(`/topics/${topic.id}/summary/approve`);
      load();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to approve summary');
    } finally {
      setBusy(false);
    }
  };

  const openJoint = async () => {
    setBusy(true);
    try {
      const res = await api.post(`/topics/${topic.id}/joint`);
      navigate(`/sessions/${res.data.sessionId}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to open joint session');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{topic.title}</h1>
        <p className="text-gray-600">Working through this with {topic.partner.pseudonym}</p>
      </div>

      <Step n={1} title="Prepare privately with Coco" done={!!topic.mySummary}>
        <p className="text-sm text-gray-600 mb-3">
          Coco will help you organize your thoughts: what happens, how it feels, what you need,
          and what a good outcome looks like. This conversation is private — your partner never sees it.
        </p>
        <button
          onClick={startPrep}
          disabled={busy}
          className="bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white text-sm py-2 px-4 rounded"
        >
          {topic.myPrepSessionId ? 'Continue prep session' : 'Start prep session'}
        </button>
      </Step>

      <Step n={2} title="Approve your shared summary" done={myApproved && !draftChanged}>
        <p className="text-sm text-gray-600 mb-3">
          This is the <strong>only</strong> thing from your prep work that {topic.partner.pseudonym} and
          Coco will bring into the joint session. Coco can draft it during prep — paste or write it
          here, edit until it feels right, then approve it. Editing after approval requires
          re-approving, and your partner can see when it was last changed.
        </p>
        <textarea
          className="w-full border border-gray-300 rounded-md p-3 focus:outline-none focus:border-teal-500 min-h-[120px]"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="In my own words, first person: what this issue feels like for me, what I need, and what I hope we get to…"
        />
        <div className="flex gap-2 mt-3 items-center">
          <button
            onClick={saveDraft}
            disabled={saving || !draft.trim() || !draftChanged}
            className="bg-gray-700 hover:bg-gray-800 disabled:opacity-50 text-white text-sm py-2 px-4 rounded"
          >
            {saving ? 'Saving…' : 'Save draft'}
          </button>
          <button
            onClick={approve}
            disabled={busy || !topic.mySummary || draftChanged || myApproved}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm py-2 px-4 rounded"
          >
            {myApproved && !draftChanged ? 'Approved ✓' : 'Approve for sharing'}
          </button>
          {draftChanged && topic.mySummary && (
            <span className="text-xs text-amber-600">Unsaved changes — save before approving</span>
          )}
        </div>
      </Step>

      <Step n={3} title={`${topic.partner.pseudonym}'s summary`} done={partnerApproved}>
        {partnerApproved && topic.partnerSummary?.content ? (
          <blockquote className="border-l-4 border-teal-300 pl-4 text-gray-700 text-sm whitespace-pre-wrap">
            {topic.partnerSummary.content}
          </blockquote>
        ) : topic.partnerSummary ? (
          <p className="text-sm text-gray-500">
            {topic.partner.pseudonym} has drafted a summary but hasn't approved it yet.
          </p>
        ) : (
          <p className="text-sm text-gray-500">
            {topic.partner.pseudonym} hasn't finished their prep yet. You'll see their summary here
            once they approve it.
          </p>
        )}
        {topic.partnerSummary?.approved && topic.partnerSummary.updatedAt && (
          <p className="text-xs text-gray-400 mt-2">
            Last updated {new Date(topic.partnerSummary.updatedAt).toLocaleString()}
          </p>
        )}
      </Step>

      <Step n={4} title="Joint session with Coco" done={!!topic.jointSessionId}>
        {topic.bothApproved || topic.jointSessionId ? (
          <>
            <p className="text-sm text-gray-600 mb-3">
              Coco has both of your approved summaries and will open the conversation with the
              common ground it sees, then guide you through it together.
            </p>
            <button
              onClick={openJoint}
              disabled={busy}
              className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm py-2 px-4 rounded"
            >
              {topic.jointSessionId ? 'Open joint session' : 'Begin joint session'}
            </button>
          </>
        ) : (
          <p className="text-sm text-gray-500">
            Unlocks when both of you have approved your shared summaries
            ({[myApproved, partnerApproved].filter(Boolean).length}/2 approved).
          </p>
        )}
      </Step>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      <Link to="/topics" className="text-teal-600 hover:text-teal-800">← Back to Topics</Link>
    </div>
  );
};

export default TopicDetailPage;
