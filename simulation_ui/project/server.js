const express = require('express');
const cors = require('cors');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = 3000;
const BRIDGE_PORT = 5000;

// TTS control flag
const DISABLE_TTS = process.env.DISABLE_TTS === 'true';

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

  if (DISABLE_TTS) {
    console.log('TTS disabled - skipping generation');
  } else {
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

// Trigger main.py directly from the Node server (alternative to the Python bridge)
app.post('/run', (req, res) => {
  const mainPath = path.join(__dirname, '..', '..', 'main.py');
  console.log(`Executing main.py via Node bridge: ${mainPath}`);
  const proc = spawn('python', [mainPath], {
    cwd: path.join(__dirname, '..', '..'),
    shell: false,
  });

  let stdout = '';
  let stderr = '';
  proc.stdout.on('data', (data) => (stdout += data.toString()));
  proc.stderr.on('data', (data) => (stderr += data.toString()));

  proc.on('close', (code) => {
    res.status(code === 0 ? 200 : 500).json({
      status: code === 0 ? 'ok' : 'error',
      returncode: code,
      stdout,
      stderr,
    });
  });

  proc.on('error', (err) => {
    console.error('Failed to start main.py:', err);
    res.status(500).json({ status: 'error', error: String(err) });
  });
});


// Spawn the Python bridge (ui_bridge.py) to run main.py on demand
function startBridgeServer() {
  const bridgePath = path.join(__dirname, '..', '..', 'ui_bridge.py');
  const bridgeProc = spawn('python', [bridgePath], {
    cwd: path.join(__dirname, '..', '..'),
    stdio: 'inherit',
    shell: false
  });
  bridgeProc.on('exit', (code) => {
    console.log(`ui_bridge.py exited with code ${code}`);
  });
}

app.listen(PORT, () => {
  console.log(`\nTimeline API Server running on http://localhost:${PORT}`);
  console.log(`Frontend: http://localhost:${PORT}`);
  console.log(`POST events to: http://localhost:${PORT}/api/event`);
  console.log(`TTS: ${DISABLE_TTS ? 'DISABLED' : 'ENABLED'}`);
  console.log(`\nExample curl command:`);
  console.log(`curl -X POST http://localhost:${PORT}/api/event \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"text":"Oscar went on vacation","data":{"name":"Oscar","current_income":64303.125,"family_status":"single","children":0,"recent_event":"go_on_vacation","year":2025,"month":5}}'`);
  console.log('');
  console.log(`Spawning Python bridge on http://localhost:${BRIDGE_PORT} (ui_bridge.py)...`);
  startBridgeServer();
});
