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

app.post('/api/attendance', async (req, res) => {
  const { student_id, type, lat, lng, task_done } = req.body;

  const officeLat = -15.48778418675252;
  const officeLng = 28.347654584254244;
  const distance = calculateHaversineDistance(lat, lng, officeLat, officeLng);

  const locationStatus = distance <= 100 ? 'On-site' : `Remote (${Math.round(distance)}m away)`;

  const { data, error } = await supabase
    .from('attendance')
    .insert([
      {
        student_id: student_id,
        action_type: type,
        location_status: locationStatus,
        task_done: task_done,
        created_at: new Date()
      }
    ]);

  if (error) {
    return res.status(500).json({ success: false, message: error.message });
  }

  return res.json({ success: true, message: `Successfully logged ${type} (${locationStatus})` });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));