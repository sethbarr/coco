/**
 * End-to-end smoke test against a running backend (default http://localhost:3001).
 * Exercises the trust-critical paths: signup + recovery codes, connection
 * invite/accept, safety-screen gating, topic creation, and password recovery.
 *
 * Usage: node scripts/e2e-smoke.js [baseUrl]
 * Exits non-zero on the first failure. Creates throwaway users each run
 * (unique suffix), so it's safe against a scratch database — do NOT point it
 * at production.
 */
const BASE = (process.argv[2] || process.env.E2E_BASE_URL || 'http://localhost:3001') + '/api';
const RUN = Date.now().toString(36);
const U1 = `e2e-a-${RUN}`;
const U2 = `e2e-b-${RUN}`;
const PASSWORD = 'e2e-password-1';

let failures = 0;

function check(name, condition, detail) {
  if (condition) {
    console.log(`  ok   ${name}`);
  } else {
    failures++;
    console.error(`  FAIL ${name}${detail ? ` — ${JSON.stringify(detail)}` : ''}`);
  }
}

async function req(method, path, token, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'x-auth-token': token } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

(async () => {
  console.log(`e2e smoke against ${BASE} (run ${RUN})`);

  // --- Signup ---
  console.log('signup');
  const key = JSON.stringify({ key: 'e2e' });
  const r1 = await req('POST', '/auth/register', null, { pseudonym: U1, password: PASSWORD, publicKey: key });
  const r2 = await req('POST', '/auth/register', null, { pseudonym: U2, password: PASSWORD, publicKey: key });
  check('both users register', r1.status === 200 && r2.status === 200, { s1: r1.status, s2: r2.status });
  check('recovery codes issued at signup', (r1.data?.recoveryCodes || []).length === 8);
  const t1 = r1.data.token;
  const t2 = r2.data.token;

  // --- Connection ---
  console.log('connection');
  const invite = await req('POST', '/connections/invite', t1, { recipientPseudonym: U2, relationshipType: 'partner' });
  check('invite sent', invite.status === 200 || invite.status === 201, invite);
  const connId = invite.data?.connection?.id || invite.data?.id;
  const accept = await req('PUT', `/connections/${connId}/accept`, t2);
  check('invite accepted', accept.status === 200, accept);

  // --- Safety-screen gate ---
  console.log('safety screen');
  const blocked = await req('POST', '/topics', t1, { connectionId: connId, title: 'e2e topic' });
  check('topic creation blocked before screen', blocked.status === 403 && blocked.data?.code === 'SAFETY_SCREEN_REQUIRED', blocked);

  const questions = await req('GET', `/connections/${connId}/safety-screen`, t1);
  check('screen questions served', questions.status === 200 && questions.data?.questions?.length === 4);

  const clearAnswers = { fear: false, physical: false, control: false, safe_disagree: true };
  const s1 = await req('POST', `/connections/${connId}/safety-screen`, t1, { answers: clearAnswers });
  check('clear screen accepted', s1.status === 201 && s1.data?.outcome === 'clear', s1);

  const flaggedAnswers = { ...clearAnswers, fear: true };
  const s2 = await req('POST', `/connections/${connId}/safety-screen`, t2, { answers: flaggedAnswers });
  check('flagged screen returns private resources', s2.status === 201 && s2.data?.outcome === 'flagged' && !!s2.data?.guidance);

  const view1 = await req('GET', `/connections/${connId}/safety-screen`, t1);
  check('partner outcome never leaks', view1.data?.partnerCompleted === true && !JSON.stringify(view1.data).includes('flagged'));

  // --- Topic after screen ---
  console.log('topic');
  const topic = await req('POST', '/topics', t1, { connectionId: connId, title: 'e2e topic' });
  check('topic creation allowed after screen', topic.status === 201, topic);

  // --- Messages + safety pipeline (no ANTHROPIC_API_KEY in CI: Coco uses
  // canned fallbacks and the classifier degrades to 'concern' on screen hits,
  // which is exactly the degraded mode worth asserting) ---
  console.log('messages');
  const session = await req('POST', '/sessions', t1, { type: 'individual' });
  const sessionId = session.data?.id || session.data?.session?.id;
  check('individual session created', (session.status === 200 || session.status === 201) && !!sessionId, session);

  const hello = await req('POST', '/messages', t1, { sessionId, content: 'hello coco' });
  check('message send returns AI reply', hello.status === 201 && !!hello.data?.aiMessage?.content, { status: hello.status });
  check('no safety card on ordinary message', !hello.data?.aiMessage?.encryptionMetadata?.safety);

  const risky = await req('POST', '/messages', t1, { sessionId, content: 'sometimes I think about hurting myself' });
  const safety = risky.data?.aiMessage?.encryptionMetadata?.safety;
  check('safety card attached on risk message', risky.status === 201 && !!safety && safety.resources?.length > 0, { safety });

  // --- Password recovery ---
  console.log('recovery');
  const code = r1.data.recoveryCodes[0];
  const recover = await req('POST', '/auth/recover', null, {
    pseudonym: U1, recoveryCode: code.toLowerCase(), newPassword: 'e2e-password-2'
  });
  check('recovery resets password', recover.status === 200, recover);

  const oldLogin = await req('POST', '/auth/login', null, { pseudonym: U1, password: PASSWORD });
  const newLogin = await req('POST', '/auth/login', null, { pseudonym: U1, password: 'e2e-password-2' });
  check('old password rejected', oldLogin.status === 400);
  check('new password accepted', newLogin.status === 200);

  const reuse = await req('POST', '/auth/recover', null, {
    pseudonym: U1, recoveryCode: code, newPassword: 'e2e-password-3'
  });
  check('spent code rejected', reuse.status === 401);

  console.log(failures === 0 ? '\nAll e2e checks passed' : `\n${failures} check(s) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
})().catch(err => {
  console.error('e2e smoke crashed:', err);
  process.exit(1);
});
