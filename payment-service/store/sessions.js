/**
 * In-Memory Session Store
 * A session is created when a calling app wants to start a checkout.
 * Sessions expire after 30 minutes.
 */

const sessions = new Map();

function createSession(data) {
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  sessions.set(data.sessionId, { ...data, expiresAt, createdAt: new Date().toISOString() });
  console.log('[Session] Created:', data.sessionId);
}

function getSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  if (new Date(session.expiresAt) < new Date()) {
    sessions.delete(sessionId);
    console.log('[Session] Expired:', sessionId);
    return null;
  }
  return session;
}

function updateSession(sessionId, updates) {
  const session = sessions.get(sessionId);
  if (!session) return;
  sessions.set(sessionId, { ...session, ...updates });
}

module.exports = { createSession, getSession, updateSession };
