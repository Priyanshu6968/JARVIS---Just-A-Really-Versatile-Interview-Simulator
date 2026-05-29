const axios = require('axios');
require('dotenv').config();

const key = process.env.GROQ_API_KEY;
console.log('Groq key prefix:', key ? key.slice(0, 10) + '...' : 'MISSING');

async function test() {
  try {
    const resp = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a helpful assistant. Always respond with valid JSON.' },
          { role: 'user', content: 'Say {"status":"ok","message":"JARVIS is live"} exactly.' }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 50
      },
      {
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        timeout: 15000
      }
    );
    console.log('✅ SUCCESS — Groq replied:', resp.data.choices[0].message.content);
  } catch (e) {
    console.error('❌ FAILED:', e.response?.data || e.message);
  }
}

test();
