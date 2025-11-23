const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const app = express();
const PORT = 3000;
const BRIDGE_PORT = 5001;
const AUDIO_SERVICE_PORT = 5000;
const ENRICHMENT_SERVICE_PORT = 5002;

// TTS control flag
const DISABLE_TTS = process.env.DISABLE_TTS === 'true';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// In-memory storage for incoming events
let pendingEvents = [];
let lastOnboarding = null;

function updateSettingsFile(selection) {
  const settingsPath = path.join(__dirname, '..', '..', 'settings.json');
  const raw = fs.readFileSync(settingsPath, 'utf8');
  const data = JSON.parse(raw);

  data.user_config = {
    ...(data.user_config || {}),
    age: Number(selection.age) || 0,
    education: selection.education || (data.user_config || {}).education,
    family_status: selection.familyStatus || (data.user_config || {}).family_status,
    career_length: Number(selection.careerLength) || (data.user_config || {}).career_length || 0
  };

  data.global_config = {
    ...(data.global_config || {}),
    loan_type: selection.loanType || (data.global_config || {}).loan_type,
    loan_years: Number(selection.loanYears) || (data.global_config || {}).loan_years
  };

  fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2), 'utf8');
  return data;
}

// Persist onboarding selections into settings.json
app.post('/api/settings', (req, res) => {
  const { loanType, loanYears, age, education, familyStatus, careerLength } = req.body || {};

  if (
    loanType === undefined ||
    loanYears === undefined ||
    age === undefined ||
    education === undefined ||
    familyStatus === undefined ||
    careerLength === undefined
  ) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const updated = updateSettingsFile({ loanType, loanYears, age, education, familyStatus, careerLength });
    lastOnboarding = { loanType, loanYears, age, education, familyStatus, careerLength };
    res.json({ success: true, settings: updated });
  } catch (err) {
    console.error('Failed to update settings.json', err);
    res.status(500).json({ success: false, error: 'Could not update settings' });
  }
});

// Expose minimal config data (num_layers) to the frontend
app.get('/api/config', (_req, res) => {
  try {
    const settingsPath = path.join(__dirname, '..', '..', 'settings.json');
    const raw = fs.readFileSync(settingsPath, 'utf8');
    const data = JSON.parse(raw);
    const numLayers = Number(data.num_layers) || 30;
    res.json({ num_layers: numLayers });
  } catch (error) {
    console.error('Failed to read settings for config endpoint', error);
    res.status(500).json({ num_layers: 30, error: 'Could not read settings.json' });
  }
});

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

  // Enrich the event text with Claude Haiku commentary and generate TTS
  // Only for interesting events (interesting flag === 1)
  let enrichedText = text; // Fallback to original text
  let ttsAudioId = null;
  let ttsDuration = 0;

  const isInteresting = data.interesting === 1;

  if (DISABLE_TTS) {
    console.log('TTS and enrichment disabled - skipping both');
  } else if (!isInteresting) {
    console.log('Event not marked as interesting - skipping enrichment and TTS');
  } else {
    try {
      console.log('Enriching event with sports commentary...');
      const enrichResponse = await fetch(`http://localhost:${ENRICHMENT_SERVICE_PORT}/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (enrichResponse.ok) {
        const enrichData = await enrichResponse.json();
        enrichedText = enrichData.enriched_text;
        console.log(`Enriched text: "${enrichedText}"`);
      } else {
        console.warn('Enrichment failed, using original text:', enrichResponse.statusText);
      }
    } catch (error) {
      console.warn('Could not connect to enrichment service, using original text:', error.message);
    }

    // Generate TTS audio and WAIT for completion
    try {
      console.log('Generating TTS for event...');
      const ttsResponse = await fetch('http://localhost:5000/generate_tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: enrichedText })
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
    text: enrichedText,  // Use enriched text for display
    originalText: text,   // Keep original for reference
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
  if (lastOnboarding) {
    try {
      updateSettingsFile(lastOnboarding);
      console.log('Settings refreshed from last onboarding selection before run.');
    } catch (err) {
      console.warn('Failed to refresh settings before run:', err);
    }
  }

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


// Spawn the audio mixer service
function startAudioService() {
  const audioServicePath = path.join(__dirname, '..', '..', 'audio_mixer_service.py');
  const audioProc = spawn('python3', [audioServicePath], {
    cwd: path.join(__dirname, '..', '..'),
    stdio: 'inherit',
    shell: false
  });
  audioProc.on('exit', (code) => {
    console.log(`audio_mixer_service.py exited with code ${code}`);
  });
}

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

// Spawn the event enrichment service
function startEnrichmentService() {
  const enrichmentPath = path.join(__dirname, '..', '..', 'event_enrichment_service.py');
  const enrichmentProc = spawn('python3', [enrichmentPath], {
    cwd: path.join(__dirname, '..', '..'),
    stdio: 'inherit',
    shell: false
  });
  enrichmentProc.on('exit', (code) => {
    console.log(`event_enrichment_service.py exited with code ${code}`);
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
  console.log(`Starting audio mixer service on http://localhost:${AUDIO_SERVICE_PORT}...`);
  startAudioService();
  console.log(`Starting Python bridge on http://localhost:${BRIDGE_PORT} (ui_bridge.py)...`);
  startBridgeServer();
  console.log(`Starting event enrichment service on http://localhost:${ENRICHMENT_SERVICE_PORT}...`);
  startEnrichmentService();
});
