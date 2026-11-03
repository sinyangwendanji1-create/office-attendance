const express = require('express');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('.'));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
            
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

app.post('/api/register', async (req, res) => {
  const { name, student_number } = req.body;
  const { error } = await supabase
    .from('students')
    .insert([{ name, student_number }]);

  if (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
  return res.json({ success: true, message: `Successfully registered ${name}` });
});

app.post('/api/attendance', async (req, res) => {
  const { name, student_number, action, task_done, lat, lng } = req.body;
  const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  const officeLat = -15.48778418675252;
  const officeLng = 28.347654584254244;

  let locationStatus = 'Location not shared';
  if (lat !== null && lng !== null && lat !== undefined && lng !== undefined) {
    const distance = calculateHaversineDistance(lat, lng, officeLat, officeLng);
    locationStatus = distance <= 100 ? `Verified (${Math.round(distance)}m from office)` : `Remote (${Math.round(distance)}m away)`;
  }

  const { error } = await supabase
    .from('attendance')
    .insert([
      {
        name,
        student_number,
        action_type: action,
        task_done,
        location_status: locationStatus,
        ip_address: ipAddress,
        created_at: new Date()
      }
    ]);

  if (error) {
    return res.status(500).json({ success: false, message: error.message });
  }

  return res.json({ success: true, message: `Successfully logged ${action} (${locationStatus})` });
});

app.get('/api/logs', async (req, res) => {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return res.status(500).json([]);
  res.json(data);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));