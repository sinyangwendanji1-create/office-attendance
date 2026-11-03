const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', true);

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname)));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const OFFICE_LAT = -15.48778418675252;
const OFFICE_LNG = 28.347654584254244;
const MAX_RADIUS_METERS = 100;

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

app.post('/api/register', async (req, res) => {
  const { name, sin } = req.body;

  if (!name || !sin) {
    return res.status(400).json({ error: 'Please provide both a name and a student number.' });
  }

  const { data: existing } = await supabase
    .from('students')
    .select('*')
    .eq('sin', sin)
    .single();

  if (existing) {
    return res.status(400).json({ error: 'This student number is already registered.' });
  }

  const { error } = await supabase
    .from('students')
    .insert([{ sin: sin.trim(), name: name.trim() }]);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ message: `Successfully registered ${name}! You can now check in.` });
});

app.post('/api/record', async (req, res) => {
  const { name, sin, action, latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'Location access is required to check in or out.' });
  }

  const distance = Math.round(calculateDistance(OFFICE_LAT, OFFICE_LNG, latitude, longitude));

  if (distance > MAX_RADIUS_METERS) {
    return res.status(403).json({ 
      error: `Access denied. You are ${distance}m away from the office. You must be within ${MAX_RADIUS_METERS}m to check in.` 
    });
  }

  const { data: student } = await supabase
    .from('students')
    .select('*')
    .eq('sin', sin)
    .single();

  if (!student) {
    return res.status(403).json({ error: 'Student Number not found. Please register first.' });
  }

  if (student.name.trim().toLowerCase() !== name.trim().toLowerCase()) {
    return res.status(403).json({ error: `Name mismatch. Expected: "${student.name}"` });
  }

  let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
  if (clientIp === '::1' || clientIp === '127.0.0.1' || clientIp.includes('ffff:')) {
    clientIp = getLocalIP();
  }

  const timeString = new Date().toLocaleTimeString();
  const locationStatus = `Verified (${distance}m from office)`;

  const { error } = await supabase
    .from('attendance')
    .insert([{ 
      name: student.name, 
      action: action, 
      time: timeString,
      ip_address: clientIp,
      location_status: locationStatus
    }]);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const { data: history } = await supabase
    .from('attendance')
    .select('*')
    .order('id', { ascending: true });

  res.json({
    message: `Successfully recorded ${action} for ${student.name}! ${locationStatus}.`,
    history: history || []
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});