import React, { useEffect, useState } from 'react';
import api from '../../utils/api';

interface BillingStatus {
  billingEnabled: boolean;
  subscription: { status: string; currentPeriodEnd: string | null; isPayer: boolean } | null;
}

/**
 * Shown when topic creation returns 402 UPGRADE_REQUIRED (only possible when
 * BILLING_ENABLED is on server-side). Checkout and subscription management
 * happen on Stripe-hosted pages — no card data in the app.
 */
const UpgradeCard: React.FC<{ connectionId: string; onCancel?: () => void }> = ({ connectionId, onCancel }) => {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get(`/billing/status?connectionId=${connectionId}`)
      .then(res => setStatus(res.data))
      .catch(() => setStatus(null));
  }, [connectionId]);

  const checkout = async (interval: 'month' | 'year') => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post('/billing/checkout', { connectionId, interval });
      window.location.href = res.data.url;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not start checkout');
      setBusy(false);
    }
  };

  const openPortal = async () => {
    setBusy(true);
    try {
      const res = await api.post('/billing/portal', { connectionId });
      window.location.href = res.data.url;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not open the billing portal');
      setBusy(false);
    }
  };

  return (
    <div className="bg-white border border-teal-200 rounded-lg p-5">
      <h3 className="font-semibold text-gray-800 mb-1">Work on more topics together</h3>
      <p className="text-sm text-gray-600 mb-4">
        The free plan includes one active topic per connection — with the full cycle of prep,
        joint sessions, and check-ins. A subscription covers both of you and unlocks unlimited topics.
      </p>
      {status?.subscription && status.subscription.isPayer ? (
        <button
          onClick={openPortal}
          disabled={busy}
          className="border border-teal-500 text-teal-600 hover:bg-teal-50 disabled:opacity-50 text-sm py-2 px-4 rounded"
        >
          Manage subscription
        </button>
      ) : (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => checkout('month')}
            disabled={busy}
            className="bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white text-sm py-2 px-4 rounded"
          >
            $19 / month
          </button>
          <button
            onClick={() => checkout('year')}
            disabled={busy}
            className="bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white text-sm py-2 px-4 rounded"
          >
            $149 / year <span className="opacity-80">(save 35%)</span>
          </button>
          {onCancel && (
            <button onClick={onCancel} className="text-sm text-gray-600 hover:text-gray-800 py-2 px-2">
              Not now
            </button>
          )}
        </div>
      )}
      <p className="text-xs text-gray-500 mt-3">
        Payment is handled by Stripe on their site. Your payment details never touch Coco, and your
        payment identity is never linked to your pseudonym here — see the{' '}
        <a href="/privacy" className="underline">privacy page</a>.
      </p>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
    </div>
  );
};

export default UpgradeCard;
