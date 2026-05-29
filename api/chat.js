module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  try {
    const { system, messages } = req.body;

    // Convert messages to Gemini format
    const contents = messages.map(m => {
      if (typeof m.content === 'string') {
        return { role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] };
      }
      // Handle multipart (images, PDFs)
      const parts = m.content.map(part => {
        if (part.type === 'text') return { text: part.text };
        if (part.type === 'image') return { inlineData: { mimeType: part.source.media_type, data: part.source.data } };
        if (part.type === 'document') return { inlineData: { mimeType: 'application/pdf', data: part.source.data } };
        return { text: '' };
      });
      return { role: 'user', parts };
    });

    const body = {
      system_instruction: system ? { parts: [{ text: system }] } : undefined,
      contents,
      generationConfig: { maxOutputTokens: 1500, temperature: 0.7 }
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Gemini error' });
    }

    // Convert Gemini response to Anthropic-like format so frontend works unchanged
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.status(200).json({ content: [{ type: 'text', text }] });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
