import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../utils/api';
import { TopicView } from './TopicsPage';
import SafetyScreenForm from './SafetyScreenForm';

interface PlanAgreement {
  id: string;
  text: string;
  status: string;
  owner: string | null;
}

interface PlanRecap {
  id: string;
  summary: string;
  createdAt: string;
  statusUpdates?: Array<{ status: string; text: string | null }>;
  suggestedCheckInDays: number | null;
  endorsedByMe: boolean;
  endorsedByPartner: boolean;
  fullyEndorsed: boolean;
  agreements: PlanAgreement[];
}

interface Plan {
  nextCheckInAt: string | null;
  recaps: PlanRecap[];
}

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
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  // Set when a joint/check-in start is blocked pending my safety check-in;
  // holds the action to retry after completion
  const [screenRetry, setScreenRetry] = useState<null | (() => void)>(null);

  const load = useCallback(() => {
    api.get(`/topics/${id}`)
      .then(res => {
        setTopic(res.data);
        setDraft(res.data.mySummary?.content || '');
      })
      .catch(err => setError(err.response?.data?.message || 'Failed to load topic'));
    api.get(`/topics/${id}/plan`)
      .then(res => setPlan(res.data))
      .catch(() => {});
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
      if (err.response?.data?.code === 'SAFETY_SCREEN_REQUIRED') {
        setScreenRetry(() => openJoint);
      } else {
        setError(err.response?.data?.message || 'Failed to open joint session');
      }
    } finally {
      setBusy(false);
    }
  };

  const startCheckin = async () => {
    setBusy(true);
    try {
      const res = await api.post(`/topics/${topic.id}/checkin`);
      navigate(`/sessions/${res.data.sessionId}`);
    } catch (err: any) {
      if (err.response?.data?.code === 'SAFETY_SCREEN_REQUIRED') {
        setScreenRetry(() => startCheckin);
      } else {
        setError(err.response?.data?.message || 'Failed to start check-in');
      }
    } finally {
      setBusy(false);
    }
  };

  const startReflection = async () => {
    setBusy(true);
    try {
      const res = await api.post(`/topics/${topic.id}/reflect`);
      navigate(`/sessions/${res.data.sessionId}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to open reflection');
    } finally {
      setBusy(false);
    }
  };

  const statusChip = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-blue-100 text-blue-700',
      kept: 'bg-green-100 text-green-700',
      struggling: 'bg-amber-100 text-amber-700',
      retired: 'bg-gray-100 text-gray-500',
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ml-2 ${styles[status] || 'bg-gray-100 text-gray-500'}`}>
        {status}
      </span>
    );
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

      {/* Our Plan */}
      {plan && plan.recaps.length > 0 && (() => {
        const endorsed = plan.recaps.filter(r => r.fullyEndorsed);
        const live = (a: PlanAgreement) => ['active', 'kept', 'struggling'].includes(a.status);
        const activeShared = endorsed.flatMap(r => r.agreements).filter(a => live(a) && !a.owner);
        const activePersonal = endorsed.flatMap(r => r.agreements).filter(a => live(a) && a.owner);
        const retired = endorsed.flatMap(r => r.agreements).filter(a => a.status === 'retired');
        const pending = plan.recaps.filter(r => !r.fullyEndorsed);
        return (
          <div className="bg-white rounded-lg shadow-md p-6 mb-4 border-t-4 border-blue-400">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-800">Our Plan</h2>
              {endorsed.length > 0 && (
                <button
                  onClick={async () => {
                    const res = await api.get(`/topics/${topic.id}/plan.md`, { responseType: 'blob' });
                    const url = URL.createObjectURL(res.data);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `our-plan.md`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="text-sm text-teal-600 hover:text-teal-800"
                >
                  ⬇ Download (Markdown)
                </button>
              )}
            </div>

            {plan.nextCheckInAt && (
              <p className={`text-sm mb-4 ${new Date(plan.nextCheckInAt) <= new Date() ? 'text-amber-700 font-medium' : 'text-gray-600'}`}>
                {new Date(plan.nextCheckInAt) <= new Date() ? '⏰ Check-in due — ' : 'Next check-in: '}
                {new Date(plan.nextCheckInAt).toLocaleDateString()}
                {new Date(plan.nextCheckInAt) <= new Date() && (
                  <button onClick={startCheckin} className="ml-2 underline text-teal-700">start your check-in</button>
                )}
              </p>
            )}

            {/* Recaps awaiting endorsement */}
            {pending.map(r => (
              <div key={r.id} className="border border-amber-200 bg-amber-50 rounded-md p-4 mb-4">
                <div className="text-xs text-amber-700 font-medium mb-2">
                  Session recap from {new Date(r.createdAt).toLocaleDateString()} — awaiting endorsement
                  ({[r.endorsedByMe, r.endorsedByPartner].filter(Boolean).length}/2)
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3">{r.summary}</p>
                {(r.statusUpdates?.length || 0) > 0 && (
                  <div className="mb-3">
                    <div className="text-xs font-medium text-gray-600 mb-1">Proposed status changes:</div>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {r.statusUpdates!.map((u, i) => (
                        <li key={i}>→ {u.text || 'an agreement'} {statusChip(u.status)}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {r.agreements.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs font-medium text-gray-600 mb-1">New agreements:</div>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {r.agreements.map(a => (
                        <li key={a.id}>• {a.owner ? <strong>{a.owner}: </strong> : ''}{a.text}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {r.endorsedByMe ? (
                  <span className="text-sm text-green-700">You've endorsed this — waiting for {topic.partner.pseudonym}</span>
                ) : (
                  <button
                    onClick={async () => {
                      await api.post(`/topics/${topic.id}/recaps/${r.id}/endorse`);
                      load();
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white text-sm py-1 px-3 rounded"
                  >
                    Endorse this recap
                  </button>
                )}
              </div>
            ))}

            {/* Active agreements */}
            {activeShared.length > 0 && (
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Our agreements</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  {activeShared.map(a => <li key={a.id}>{a.text}{statusChip(a.status)}</li>)}
                </ul>
              </div>
            )}
            {activePersonal.length > 0 && (
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Individual commitments</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  {activePersonal.map(a => <li key={a.id}><strong>{a.owner}:</strong> {a.text}{statusChip(a.status)}</li>)}
                </ul>
              </div>
            )}

            {retired.length > 0 && (
              <details className="mb-3">
                <summary className="text-sm text-gray-400 cursor-pointer">Retired agreements ({retired.length})</summary>
                <ul className="text-sm text-gray-400 space-y-1 mt-1">
                  {retired.map(a => <li key={a.id} className="line-through">{a.owner ? `${a.owner}: ` : ''}{a.text}</li>)}
                </ul>
              </details>
            )}

            {endorsed.length > 0 && (
              <div className="flex gap-2 mb-3">
                <button
                  onClick={startCheckin}
                  disabled={busy}
                  className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm py-2 px-4 rounded"
                >
                  {topic.checkinSessionId ? 'Rejoin check-in' : 'Start a check-in'}
                </button>
                <button
                  onClick={startReflection}
                  disabled={busy}
                  className="bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white text-sm py-2 px-4 rounded"
                >
                  Private reflection
                </button>
              </div>
            )}

            {/* Endorsed session notes */}
            {endorsed.length > 0 && (
              <details className="mt-2">
                <summary className="text-sm text-gray-500 cursor-pointer">Past session notes ({endorsed.length})</summary>
                {endorsed.map(r => (
                  <div key={r.id} className="mt-2 text-sm text-gray-600">
                    <div className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</div>
                    <p className="whitespace-pre-wrap">{r.summary}</p>
                  </div>
                ))}
              </details>
            )}
          </div>
        );
      })()}

      {screenRetry && (
        <div className="mb-4">
          <SafetyScreenForm
            connectionId={topic.connectionId}
            onComplete={() => {
              const retry = screenRetry;
              setScreenRetry(null);
              retry();
            }}
            onCancel={() => setScreenRetry(null)}
          />
        </div>
      )}
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      <Link to="/topics" className="text-teal-600 hover:text-teal-800">← Back to Topics</Link>
    </div>
  );
};

export default TopicDetailPage;
