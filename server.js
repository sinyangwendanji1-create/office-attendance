const express = require('express');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('.'));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.post('/api/register', async (req, res) => {
  const { name, student_number } = req.body;

  const { error } = await supabase
    .from('students')
    .insert([{ name: name, student_number: student_number }]);

  if (error) {
    return res.status(500).json({ success: false, message: error.message });
  }

  return res.json({ success: true, message: `Successfully registered ${name}` });
});

app.post('/api/attendance', async (req, res) => {
  const { name, student_number, action, task_done } = req.body;
  const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  const { error } = await supabase
    .from('attendance')
    .insert([
      {
        name: name,
        student_number: student_number,
        action: action,
        task_done: task_done,
        ip_address: ipAddress,
        created_at: new Date()
      }
    ]);

  if (error) {
    return res.status(500).json({ success: false, message: error.message });
  }

  return res.json({ success: true, message: `Successfully logged ${action} for ${name}` });
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