// api/chat.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { system, messages } = req.body;

    // Clean the API key programmatically to strip accidental whitespaces or linebreaks
    const apiKey = process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.trim() : '';

    if (!apiKey) {
      return res.status(500).json({ error: 'Missing ANTHROPIC_API_KEY environment variable on Vercel.' });
    }

    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey, // Using the safely cleaned key here
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        system: system,
        messages: messages
      })
    });

    const data = await aiResponse.json();

    if (!aiResponse.ok) {
      return res.status(aiResponse.status).json({ error: data.error?.message || 'AI Provider Error' });
    }

    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error: ' + error.message });
  }
}
