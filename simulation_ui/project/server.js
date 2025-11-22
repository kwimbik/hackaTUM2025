const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// In-memory storage for incoming events
let pendingEvents = [];

// POST endpoint to receive events from external programs
app.post('/api/event', async (req, res) => {
  const { text, data } = req.body;

  console.log('Received event:', text);
  console.log('Data:', data);

  // Validate required fields
  if (!data || !data.recent_event || !data.year || data.month === undefined) {
    return res.status(400).json({
      error: 'Missing required fields: recent_event, year, month'
    });
  }

  // Generate TTS audio and WAIT for completion
  let ttsAudioId = null;
  let ttsDuration = 0;

  try {
    console.log('Generating TTS for event...');
    const ttsResponse = await fetch('http://localhost:5000/generate_tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text })
    });

    if (ttsResponse.ok) {
      const ttsData = await ttsResponse.json();
      ttsAudioId = ttsData.audioId;
      ttsDuration = ttsData.duration;
      console.log(`TTS ready: ${ttsAudioId} (${ttsDuration.toFixed(2)}s)`);
    } else {
      console.warn('TTS generation failed:', ttsResponse.statusText);
    }
  } catch (error) {
    console.warn('Could not connect to audio service:', error.message);
  }

  // Only add to queue AFTER TTS is ready (or failed)
  pendingEvents.push({
    text,
    data: {
      ...data,
      ttsAudioId: ttsAudioId,
      ttsDuration: ttsDuration
    },
    timestamp: Date.now()
  });

  console.log(`Event queued: "${data.recent_event}" for ${data.name || 'user'} (TTS: ${ttsAudioId ? 'ready' : 'none'})`);

  res.json({
    success: true,
    message: 'Event received and queued',
    eventCount: pendingEvents.length,
    ttsReady: !!ttsAudioId
  });
});

// GET endpoint for frontend to poll for new events
app.get('/api/events', (req, res) => {
  const events = [...pendingEvents];
  pendingEvents = []; // Clear after sending
  res.json({ events });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', pendingEvents: pendingEvents.length });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Timeline API Server running on http://localhost:${PORT}`);
  console.log(`📊 Frontend: http://localhost:${PORT}`);
  console.log(`📮 POST events to: http://localhost:${PORT}/api/event`);
  console.log(`\nExample curl command:`);
  console.log(`curl -X POST http://localhost:${PORT}/api/event \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"text":"Oscar went on vacation","data":{"name":"Oscar","current_income":64303.125,"family_status":"single","children":0,"recent_event":"go_on_vacation","year":2025,"month":5}}'`);
  console.log('');
});