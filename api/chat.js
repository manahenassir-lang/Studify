// api/chat.js (Updated Gemini Endpoint)
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { system, messages } = req.body;
    const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';

    if (!apiKey) {
      return res.status(500).json({ error: 'Missing GEMINI_API_KEY environment variable on Vercel.' });
    }

    // Convert frontend's message format to Gemini's expected format
    const geminiContents = messages.map(msg => {
      if (Array.isArray(msg.content)) {
        const parts = msg.content.map(part => {
          if (part.type === 'text') return { text: part.text };
          if (part.type === 'image' || part.type === 'document') {
            return {
              inlineData: {
                mimeType: part.source.media_type,
                data: part.source.data
              }
            };
          }
          return null;
        }).filter(Boolean);
        return { role: msg.role === 'assistant' ? 'model' : 'user', parts };
      }

      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      };
    });

    // Updated URL to point to gemini-3.5-flash
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: geminiContents,
        systemInstruction: { parts: [{ text: system }] }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Gemini API Error' });
    }

    // Extract text output to match your index.html expectations
    const botText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    const formattedResponse = {
      content: [{ type: 'text', text: botText }]
    };

    return res.status(200).json(formattedResponse);

  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error: ' + error.message });
  }
}
