const crypto = require('crypto');

const SECRET = process.env.SESSION_SECRET || 'dev_secret_change_me';

function signSession(sessionId) {
  const h = crypto.createHmac('sha256', SECRET);
  h.update(sessionId);
  return `${sessionId}.${h.digest('hex')}`;
}

function verifySessionToken(token) {
  if(!token) return false;
  const parts = token.split('.');
  if(parts.length !== 2) return false;
  const [id, sig] = parts;
  const h = crypto.createHmac('sha256', SECRET);
  h.update(id);
  const expected = h.digest('hex');
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) ? id : false;
}

function nowIso(){
  return new Date().toISOString();
}

module.exports = { signSession, verifySessionToken, nowIso };
