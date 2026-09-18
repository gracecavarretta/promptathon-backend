const { callGemini } = require('../lib/gemini');

const CATEGORIES = new Set([
  'Food delivery',
  'Subscriptions',
  'Coffee',
  'Convenience',
  'Other',
]);

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

function stripJsonFences(text) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function isValidClassification(value) {
  return (
    value &&
    typeof value === 'object' &&
    CATEGORIES.has(value.category) &&
    typeof value.clean_name === 'string' &&
    value.clean_name.trim().length > 0
  );
}

function fallbackResult(merchant) {
  return { category: 'Other', clean_name: merchant };
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  let body;
  try {
    body = getRequestBody(req);
  } catch {
    return sendJson(res, 400, { error: 'Request body must be valid JSON' });
  }

  if (!Array.isArray(body.merchants) || body.merchants.some((merchant) => typeof merchant !== 'string')) {
    return sendJson(res, 400, { error: 'merchants must be an array of strings' });
  }

  const merchants = body.merchants;
  const results = Object.fromEntries(merchants.map((merchant) => [merchant, fallbackResult(merchant)]));

  if (merchants.length === 0) {
    return sendJson(res, 200, { results });
  }

  const prompt = [
    'Classify each credit card merchant string below.',
    'Return ONLY a strict JSON object mapping each exact original string to an object with:',
    'category: exactly one of "Food delivery", "Subscriptions", "Coffee", "Convenience", "Other".',
    'clean_name: a short readable title-case name with no store numbers.',
    'Do not add markdown, explanation, or any other keys.',
    `Merchant strings: ${JSON.stringify(merchants)}`,
  ].join('\n');

  try {
    const text = await callGemini(prompt, 0, 'application/json');
    const parsed = JSON.parse(stripJsonFences(text));

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      for (const merchant of merchants) {
        if (isValidClassification(parsed[merchant])) {
          results[merchant] = {
            category: parsed[merchant].category,
            clean_name: parsed[merchant].clean_name.trim(),
          };
        }
      }
    }
  } catch {
    // The pre-populated results are the required fallback for every failed item.
  }

  return sendJson(res, 200, { results });
};