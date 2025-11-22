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
app.post('/api/event', (req, res) => {
  const { text, data } = req.body;
  
  console.log('Received event:', text);
  console.log('Data:', data);
  
  // Validate required fields
  if (!data || !data.recent_event || !data.year || data.month === undefined) {
    return res.status(400).json({ 
      error: 'Missing required fields: recent_event, year, month' 
    });
  }
  
  // Store the event for the frontend to pick up
  pendingEvents.push({
    text,
    data,
    timestamp: Date.now()
  });
  
  console.log(`Stored event "${data.recent_event}" for ${data.name || 'user'}`);
  
  res.json({ 
    success: true, 
    message: 'Event received and queued',
    eventCount: pendingEvents.length
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