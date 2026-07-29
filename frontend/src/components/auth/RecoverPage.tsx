import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';

/**
 * Reset a forgotten password with a one-time recovery code
 * (pseudonymous accounts have no email to send a reset link to).
 */
const RecoverPage: React.FC = () => {
  const [pseudonym, setPseudonym] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ remainingCodes: number } | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post('/auth/recover', { pseudonym, recoveryCode, newPassword });
      setDone({ remainingCodes: res.data.remainingCodes });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Recovery failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="flex justify-center items-center mt-8">
        <div className="bg-white shadow-md rounded-lg p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Password reset</h2>
          <p className="text-sm text-gray-600 mb-2">
            Your password has been changed and all existing sessions were signed out.
          </p>
          <p className="text-sm text-gray-600 mb-6">
            The code you used is now spent — you have {done.remainingCodes} recovery
            {done.remainingCodes === 1 ? ' code' : ' codes'} left. You can generate a fresh set
            from your dashboard after logging in.
          </p>
          <Link to="/login" className="inline-block bg-teal-500 hover:bg-teal-600 text-white font-medium py-2 px-6 rounded">
            Log in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center mt-8">
      <div className="bg-white shadow-md rounded-lg p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Recover your account</h2>
        <p className="text-sm text-gray-600 mb-6">
          Enter your username, one of the recovery codes you saved at signup, and a new password.
          Each code works once.
        </p>
        {error && (
          <div className="bg-red-100 border-l-4 border-red-400 text-red-700 p-4 mb-4" role="alert">
            <p>{error}</p>
          </div>
        )}
        <form onSubmit={onSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="pseudonym">Username</label>
            <input
              id="pseudonym"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-teal-500"
              value={pseudonym}
              onChange={e => setPseudonym(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="recoveryCode">Recovery code</label>
            <input
              id="recoveryCode"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-teal-500 font-mono"
              value={recoveryCode}
              onChange={e => setRecoveryCode(e.target.value)}
              placeholder="XXXX-XXXX"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="newPassword">New password</label>
            <input
              id="newPassword"
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-teal-500"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="confirmPassword">Confirm new password</label>
            <input
              id="confirmPassword"
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-teal-500"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white font-medium py-2 px-4 rounded"
          >
            {submitting ? 'Resetting…' : 'Reset password'}
          </button>
        </form>
        <p className="text-sm text-gray-500 mt-4 text-center">
          <Link to="/login" className="text-teal-600 hover:text-teal-800">← Back to login</Link>
        </p>
      </div>
    </div>
  );
};

export default RecoverPage;
