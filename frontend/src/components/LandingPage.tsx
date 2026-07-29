import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { Coco } from './coco/Coco';

const Step: React.FC<{ n: number; state: any; title: string; children: React.ReactNode }> = ({ n, state, title, children }) => (
  <div className="bg-white rounded-lg shadow-md p-6 text-center">
    <div className="flex justify-center mb-3">
      <Coco state={state} size={88} />
    </div>
    <div className="text-xs font-semibold text-teal-600 mb-1">STEP {n}</div>
    <h3 className="font-semibold text-gray-800 mb-2">{title}</h3>
    <p className="text-sm text-gray-600">{children}</p>
  </div>
);

const LandingPage: React.FC = () => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  return (
    <div className="max-w-5xl mx-auto pb-12">
      {/* Hero */}
      <div className="text-center pt-8 pb-12">
        <div className="flex justify-center mb-6">
          <Coco state="listening" size={200} tier="hero" title="Coco, listening" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Hard conversations, made easier.
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
          Coco helps you and your partner work through one issue at a time — each of you prepares
          privately with Coco, shares only what you choose, then meets in a guided conversation
          that ends with real, checkable agreements.
        </p>
        <div className="flex justify-center gap-4">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="bg-teal-500 hover:bg-teal-600 text-white font-medium py-3 px-8 rounded-lg"
            >
              Go to your dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/signup"
                className="bg-teal-500 hover:bg-teal-600 text-white font-medium py-3 px-8 rounded-lg"
              >
                Get started — it's free
              </Link>
              <Link
                to="/login"
                className="border border-teal-500 text-teal-600 hover:bg-teal-50 font-medium py-3 px-8 rounded-lg"
              >
                Log in
              </Link>
            </>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-4">
          No email or real name required — just a username.
        </p>
      </div>

      {/* How it works */}
      <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">How it works</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        <Step n={1} state="reflecting" title="Prepare in private">
          Pick one topic. Coco helps you untangle what happens, what you feel, and what you
          actually need — before anyone else is in the room.
        </Step>
        <Step n={2} state="asking" title="Share what you choose">
          You write and approve a short summary for your partner. Nothing else from your private
          prep is ever shared — the summary is the only bridge.
        </Step>
        <Step n={3} state="hopeful" title="Talk it through together">
          When you're both ready, Coco facilitates a joint conversation — briefed by both
          summaries, neutral by design, one step at a time.
        </Step>
        <Step n={4} state="celebrating" title="Agree, then follow through">
          Sessions end with small, specific agreements and a check-in date. Coco runs the
          check-ins: what worked, what didn't, keep or adjust.
        </Step>
      </div>

      {/* The supportive wide pose */}
      <div className="bg-white rounded-lg shadow-md p-8 mb-12 flex flex-col md:flex-row items-center gap-8">
        <Coco state="supportive" size={150} tier="hero" title="Coco with a partner" />
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">A neutral third voice</h2>
          <p className="text-gray-600 mb-2">
            Coco never takes sides. It reflects charged statements back neutrally, makes sure you
            both get equal air time, and looks for the common ground you can't always see from
            inside the argument.
          </p>
          <p className="text-gray-600">
            Between check-ins, either of you can talk to Coco privately about how the plan is
            going — it helps you figure out what to bring to the next conversation, not build a
            case against each other.
          </p>
        </div>
      </div>

      {/* Safety & privacy */}
      <div className="bg-gradient-to-r from-teal-500 to-blue-500 rounded-lg shadow-lg p-8 text-white mb-12 flex flex-col md:flex-row items-center gap-8">
        <div className="shrink-0" style={{ ['--coco-line' as any]: '#ffffff' }}>
          <Coco state="safety" size={130} tier="mid" title="Coco, arms open" />
        </div>
        <div>
          <h2 className="text-xl font-bold mb-2">Built for sensitive conversations</h2>
          <ul className="space-y-1 text-white/90 text-sm mb-3">
            <li>• Your private sessions are never shown to your partner — only summaries you approve.</li>
            <li>• A private safety check-in before joint work; your answers stay yours.</li>
            <li>• Every message is checked for crisis signals, with real resources when it matters.</li>
            <li>• Coco is an AI companion — not a therapist, and honest about both.</li>
          </ul>
          <Link to="/privacy" className="underline text-white font-medium text-sm">
            Read the plain-language privacy & safety page →
          </Link>
        </div>
      </div>

      {/* Bottom CTA */}
      {!isAuthenticated && (
        <div className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <Coco state="encouraging" size={96} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            One topic. Two perspectives. A plan you both endorse.
          </h2>
          <Link
            to="/signup"
            className="inline-block bg-teal-500 hover:bg-teal-600 text-white font-medium py-3 px-8 rounded-lg"
          >
            Start your first topic
          </Link>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
