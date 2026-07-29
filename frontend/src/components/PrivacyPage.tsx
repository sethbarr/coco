import React from 'react';
import { Link } from 'react-router-dom';

const Q: React.FC<{ q: string; children: React.ReactNode }> = ({ q, children }) => (
  <div className="mb-6">
    <h3 className="font-semibold text-gray-800 mb-1">{q}</h3>
    <div className="text-sm text-gray-700 space-y-2">{children}</div>
  </div>
);

/**
 * Public privacy & safety FAQ. Deliberately written to describe what the app
 * ACTUALLY does — no aspirational claims. If a feature changes, change this
 * page in the same commit.
 */
const PrivacyPage: React.FC = () => (
  <div className="max-w-3xl mx-auto pb-12">
    <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy & Safety</h1>
    <p className="text-gray-600 mb-8">
      Coco is a place for sensitive conversations, so you deserve straight answers about who can
      see what, and what this app is and isn't. Plain language, no legal fog.
    </p>

    <h2 className="text-xl font-bold text-gray-900 mb-4">What Coco is — and isn't</h2>
    <Q q="Is Coco a therapist?">
      <p>
        No. Coco is an AI companion that helps you and your partner communicate — closer to a
        thoughtful, neutral friend than a clinician. Coco is not a therapist, doctor, or crisis
        service, and it will tell you so and point you to real humans (like the 988 Suicide &
        Crisis Lifeline) whenever a conversation goes somewhere that needs one.
      </p>
    </Q>
    <Q q="Who is Coco for?">
      <p>
        Adults (18+) working on communication in their relationships. Coco is not designed for
        crisis situations, active abuse, or as a substitute for professional care — and it's built
        to recognize when that line is being crossed and say so.
      </p>
    </Q>

    <h2 className="text-xl font-bold text-gray-900 mb-4">Who can see what</h2>
    <Q q="Can my partner see my private sessions?">
      <p>
        No, never. Your prep sessions and private reflections are yours alone. The <em>only</em>{' '}
        thing your partner ever sees from your private work is the shared summary that you wrote,
        edited, and explicitly approved. If you edit an approved summary, it becomes unapproved
        until you approve it again.
      </p>
    </Q>
    <Q q="What is shared between us?">
      <p>
        Approved shared summaries, joint session conversations (you're both in the room), wrap-up
        recaps and agreements, and check-in sessions. That's the complete list.
      </p>
    </Q>
    <Q q="Are my safety check-in answers shared with my partner?">
      <p>
        No. Before a connection's first joint work, each partner privately answers a few safety
        questions. Your partner only ever sees <em>that</em> you completed it — never your answers,
        and never the result. This is deliberate: if those questions surface something concerning,
        you get resources privately, and you stay in control of what happens next.
      </p>
    </Q>

    <h2 className="text-xl font-bold text-gray-900 mb-4">Safety features</h2>
    <Q q="Does Coco scan my messages?">
      <p>
        Yes — for safety, and only for safety. Every message is checked programmatically for signs
        of crisis: self-harm, violence, or abuse. When something is detected, Coco shows support
        resources (hotlines, therapist directories), and in serious moments pauses the session to
        put those resources first. This runs in code, not at Coco's discretion — it can't be
        talked out of it.
      </p>
      <p>
        When a safety flag is recorded, we log <em>that</em> it happened and its category — never
        the content of the message that triggered it.
      </p>
    </Q>
    <Q q="What about abuse resources in joint sessions?">
      <p>
        Domestic-violence resources are only ever shown in your private sessions, never on a
        screen your partner might see. Support that endangers the person it's meant for isn't
        support.
      </p>
    </Q>

    <h2 className="text-xl font-bold text-gray-900 mb-4">Your data</h2>
    <Q q="What do you know about me?">
      <p>
        As little as we can get away with: a username you chose, a password hash, and what you do
        in the app. No email, phone number, or real name is required — account recovery works
        through one-time codes instead of email. IP addresses do appear in security records
        (login sessions and security events) to protect your account.
      </p>
    </Q>
    <Q q="Are my conversations encrypted?">
      <p>
        In transit and at rest, yes: everything travels over TLS (the same encryption as your
        bank), and the database is encrypted at rest by our hosting provider.
      </p>
      <p>
        <strong>What we won't claim: Coco is not end-to-end encrypted.</strong> Coco (the AI) has
        to read your messages to respond to them, which means message content exists on our server
        in readable form. We think honesty about this beats a marketing claim. What protects you
        is TLS, at-rest encryption, strict access, and a design where the sensitive boundary —
        what your partner can see — is enforced by consent gates, not by promises.
      </p>
    </Q>
    <Q q="Is an AI company reading my conversations?">
      <p>
        Messages are processed by Anthropic's Claude API to generate Coco's responses (and to
        double-check possible safety signals). Under Anthropic's commercial API terms, that data
        is not used to train their models.
      </p>
    </Q>
    <Q q="Can I delete my account and data?">
      <p>
        Honest answer: not yet from inside the app. Account deletion involves real questions we
        want to get right — your joint sessions and agreements are your partner's history too.
        Self-serve deletion is on our roadmap; until then, deletion requests are handled manually.
      </p>
    </Q>

    <h2 className="text-xl font-bold text-gray-900 mb-4">Payments</h2>
    <Q q="If I pay, is my identity linked to my account?">
      <p>
        Payments are handled entirely by Stripe on their pages — card numbers never touch Coco's
        servers. Stripe necessarily knows who's paying; Coco stores only an anonymous Stripe
        reference and a subscription status, and we never import your name or email from Stripe
        into your pseudonymous account. One subscription covers both partners on a connection.
      </p>
    </Q>

    <div className="mt-8 pt-6 border-t border-gray-200 text-sm text-gray-500">
      <p>
        If you're in immediate danger, call your local emergency number. In the US you can call or
        text <strong>988</strong> (Suicide & Crisis Lifeline), or reach the National Domestic
        Violence Hotline at <strong>1-800-799-7233</strong>.
      </p>
      <p className="mt-3">
        <Link to="/" className="text-teal-600 hover:text-teal-800">← Back to Coco</Link>
      </p>
    </div>
  </div>
);

export default PrivacyPage;
