const { callGemini } = require('../lib/gemini');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, status, body) {
  res.status(status).json(body);
}

function getRequestBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  if (typeof req.body === 'string' && req.body.trim()) {
    return JSON.parse(req.body);
  }

  return {};
}

function isValidRequest(body) {
  return (
    typeof body.scenario === 'string' &&
    typeof body.horizonYears === 'number' &&
    body.redirectedRange &&
    typeof body.redirectedRange.p10 === 'number' &&
    typeof body.redirectedRange.p90 === 'number' &&
    Array.isArray(body.habits)
  );
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { success: false });
  }

  let body;
  try {
    body = getRequestBody(req);
  } catch {
    return sendJson(res, 400, { success: false });
  }

  if (!isValidRequest(body)) {
    return sendJson(res, 400, { success: false });
  }

  const prompt = [
    'Write a letter from the recipient\'s future self.',
    'Keep it under 120 words, warm, a little funny, and never shaming.',
    'Frame the message as tradeoffs. For example, do not ask them to stop buying coffee.',
    'Use only numbers that appear in the supplied JSON. Never invent or calculate any other numbers.',
    'Return plain text only with no markdown. Sign exactly: — Future You',
    `Input JSON: ${JSON.stringify(body)}`,
  ].join('\n');

  try {
    const letter = await callGemini(prompt, 0.7, 'text/plain');
    return sendJson(res, 200, { success: true, letter });
  } catch {
    return sendJson(res, 200, { success: false });
  }
};