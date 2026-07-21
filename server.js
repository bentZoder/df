import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const geminiApiKey = process.env.GEMINI_API_KEY || '';
const googleTtsApiKey = process.env.GOOGLE_TTS_API_KEY || '';
const geminiEndpoint = 'https://gemini.googleapis.com/v1/models/gemini-2.5-flash:generateText';
const googleTtsEndpoint = 'https://texttospeech.googleapis.com/v1/text:synthesize';

if (!geminiApiKey) {
  console.warn('Warning: GEMINI_API_KEY is not set in environment variables.');
}
if (!googleTtsApiKey) {
  console.warn('Warning: GOOGLE_TTS_API_KEY is not set in environment variables.');
}

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '1mb' }));

app.post('/api/tts', async (req, res) => {
  if (!googleTtsApiKey) {
    return res.status(500).json({ error: 'Google TTS API key is not configured.' });
  }

  try {
    const response = await fetch(`${googleTtsEndpoint}?key=${encodeURIComponent(googleTtsApiKey)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Google TTS error:', response.status, data);
      return res.status(502).json({ error: 'Google TTS returned an error.', details: data });
    }
    res.json(data);
  } catch (error) {
    console.error('TTS proxy error:', error);
    res.status(500).json({ error: 'Internal TTS proxy error.' });
  }
});

app.post('/api/gemini', async (req, res) => {
  const { prompt } = req.body || {};

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing prompt in request body.' });
  }

  const systemInstruction = `You are an AI brain for a 3D talking head avatar named Julia. Output only valid JSON that conforms exactly to the schema: {\n  \"speechText\": string,\n  \"avatarMood\": string,\n  \"avatarGesture\": string\n}.\nThe values must be strings. avatarMood must be one of: neutral, happy, sad, angry, fear, disgust, love, sleep. avatarGesture must be one of: none, handup, index, ok, thumbup, thumbdown, side, shrug, namaste. Do not add any extra keys, comments, or markdown.`;

  const requestBody = {
    "prompt": {
      "messages": [
        { "role": "system", "content": systemInstruction },
        { "role": "user", "content": prompt }
      ],
      "temperature": 0.7,
      "maxOutputTokens": 450
    }
  };

  try {
    const response = await fetch(geminiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${geminiApiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Gemini API error:', response.status, text);
      return res.status(502).json({ error: 'Gemini API returned an error.', details: text });
    }

    const data = await response.json();
    const output = data?.candidates?.[0]?.content?.[0]?.text || data?.output?.[0]?.content?.text || JSON.stringify(data);

    // Parse JSON from Gemini response safely.
    let parsed = null;
    try {
      parsed = JSON.parse(output);
    } catch (parseError) {
      console.warn('Gemini returned non-JSON output, attempting to extract JSON substring.');
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    }

    if (!parsed || typeof parsed !== 'object') {
      return res.status(502).json({ error: 'Gemini response did not contain valid JSON.' });
    }

    const { speechText, avatarMood, avatarGesture } = parsed;
    if (typeof speechText !== 'string' || typeof avatarMood !== 'string' || typeof avatarGesture !== 'string') {
      return res.status(502).json({ error: 'Gemini response JSON lacked typed fields.' });
    }

    const validMoods = ['neutral', 'happy', 'sad', 'angry', 'fear', 'disgust', 'love', 'sleep'];
    const validGestures = ['none', 'handup', 'index', 'ok', 'thumbup', 'thumbdown', 'side', 'shrug', 'namaste'];
    if (!validMoods.includes(avatarMood)) {
      return res.status(502).json({ error: 'avatarMood is invalid.' });
    }
    if (!validGestures.includes(avatarGesture)) {
      return res.status(502).json({ error: 'avatarGesture is invalid.' });
    }

    res.json({ speechText, avatarMood, avatarGesture });
  } catch (error) {
    console.error('Gemini proxy error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
