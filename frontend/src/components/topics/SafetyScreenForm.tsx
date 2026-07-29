import React, { useEffect, useState } from 'react';
import api from '../../utils/api';

interface Question {
  id: string;
  text: string;
}

interface Resource {
  name: string;
  contact: string | null;
  url: string | null;
}

/**
 * Private per-partner safety check-in, required once per connection before
 * joint work. Answers and outcome are never shown to the partner. A flagged
 * outcome shows private resources and guidance, then lets the person decide
 * whether to continue.
 */
const SafetyScreenForm: React.FC<{ connectionId: string; onComplete: () => void; onCancel?: () => void }> = ({
  connectionId,
  onComplete,
  onCancel,
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flagged, setFlagged] = useState<{ guidance: string; resources: Resource[] } | null>(null);

  useEffect(() => {
    api.get(`/connections/${connectionId}/safety-screen`)
      .then(res => setQuestions(res.data.questions))
      .catch(err => setError(err.response?.data?.message || 'Failed to load the check-in'));
  }, [connectionId]);

  const allAnswered = questions.length > 0 && questions.every(q => typeof answers[q.id] === 'boolean');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allAnswered) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post(`/connections/${connectionId}/safety-screen`, { answers });
      if (res.data.outcome === 'flagged') {
        setFlagged({ guidance: res.data.guidance, resources: res.data.resources || [] });
      } else {
        onComplete();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (flagged) {
    return (
      <div className="bg-amber-50 border border-amber-300 rounded-lg p-5">
        <h3 className="font-semibold text-amber-900 mb-2">Please read this before continuing</h3>
        <p className="text-sm text-gray-800 mb-4">{flagged.guidance}</p>
        <ul className="space-y-2 mb-4">
          {flagged.resources.map((r, i) => (
            <li key={i} className="text-sm text-gray-800">
              <span className="font-medium">
                {r.url ? (
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="underline">{r.name}</a>
                ) : r.name}
              </span>
              {r.contact && <span className="text-gray-600"> — {r.contact}</span>}
            </li>
          ))}
        </ul>
        <p className="text-xs text-gray-600 mb-4">
          Coco is an AI companion, not a therapist or crisis service. Your answers here are private
          and will never be shown to your partner.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onComplete}
            className="bg-teal-500 hover:bg-teal-600 text-white text-sm py-2 px-4 rounded"
          >
            I understand — continue
          </button>
          {onCancel && (
            <button onClick={onCancel} className="text-sm text-gray-600 hover:text-gray-800 py-2 px-4">
              Not right now
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <h3 className="font-semibold text-gray-800 mb-1">A quick private check-in first</h3>
      <p className="text-sm text-gray-600 mb-4">
        Before joint work begins, Coco asks each partner these questions privately.
        Your answers are never shown to your partner — only that you've completed this step.
      </p>
      {questions.length === 0 && !error ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 mb-4">
            {questions.map(q => (
              <fieldset key={q.id}>
                <legend className="text-sm text-gray-800 mb-1">{q.text}</legend>
                <div className="flex gap-4">
                  {[true, false].map(val => (
                    <label key={String(val)} className="flex items-center gap-1 text-sm text-gray-700">
                      <input
                        type="radio"
                        name={q.id}
                        checked={answers[q.id] === val}
                        onChange={() => setAnswers({ ...answers, [q.id]: val })}
                      />
                      {val ? 'Yes' : 'No'}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
          <div className="flex gap-3 items-center">
            <button
              type="submit"
              disabled={!allAnswered || submitting}
              className="bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white text-sm py-2 px-4 rounded"
            >
              {submitting ? 'Saving…' : 'Continue'}
            </button>
            {onCancel && (
              <button type="button" onClick={onCancel} className="text-sm text-gray-600 hover:text-gray-800">
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
      {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
    </div>
  );
};

export default SafetyScreenForm;
