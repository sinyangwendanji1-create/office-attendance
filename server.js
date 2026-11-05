const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const supabaseUrl = 'https://dyprtgceuakftleqnmow.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5cHJ0Z2NldWFrZnRsZXFubW93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2ODcyNjAsImV4cCI6MjEwOTI2MzI2MH0.zwh2Uj451FPynXzMPoeHThvc5j6fID1_gLdMXHqef2E';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const OFFICE_PUBLIC_IP = process.env.OFFICE_PUBLIC_IP || "197.234.x.x"; 
const DAILY_OFFICE_PIN = "ZRDC-OFFICE-2026";
const VALID_OFFICE_TOKEN = "ZRDC-SECURE-2026";
const OFFICE_LAT = -15.3875;
const OFFICE_LNG = 28.3228;
const ALLOWED_RADIUS_KM = 2.0;

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No authorization token provided.' });
    }
    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
};

app.get('/api/logs', verifyToken, async (req, res) => {
    const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/checkin', verifyToken, async (req, res) => {
    const { sin, name, office_pin, office_token, lat, lng } = req.body;
    
    if (!sin || !name) {
        return res.status(400).json({ error: 'Name and SIN number are required.' });
    }

    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const clientIp = rawIp.split(',')[0].trim().replace(/^::ffff:/, '');
    const isLocal = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === 'localhost';
    if (!isLocal && clientIp !== OFFICE_PUBLIC_IP) {
        return res.status(403).json({ error: 'Quad-Lock Failed: You are not connected to the office network.' });
    }

    if (lat && lng) {
        const distance = calculateDistance(lat, lng, OFFICE_LAT, OFFICE_LNG);
        if (distance > ALLOWED_RADIUS_KM) {
            return res.status(403).json({ error: 'Quad-Lock Failed: GPS coordinates are outside the office radius.' });
        }
    } else {
        return res.status(403).json({ error: 'Quad-Lock Failed: GPS location data is required.' });
    }

    if (office_pin !== DAILY_OFFICE_PIN) {
        return res.status(403).json({ error: 'Quad-Lock Failed: Incorrect Office Access PIN.' });
    }

    if (office_token !== VALID_OFFICE_TOKEN) {
        return res.status(403).json({ error: 'Quad-Lock Failed: Invalid QR code token.' });
    }

    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toLocaleTimeString();

    const { error } = await supabase
        .from('attendance')
        .insert([{ user_id: req.user.id, sin, name, status: 'Checked In', date: today, check_in_time: now, lat, lng }]);

    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, message: 'Successfully checked in with Quad-Lock verification!' });
});

app.post('/api/checkout', verifyToken, async (req, res) => {
    const { sin, task_summary, signature_data } = req.body;
    
    if (!sin || !task_summary || !signature_data) {
        return res.status(400).json({ error: 'SIN, Task Summary, and Digital Signature are mandatory for checkout.' });
    }

    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toLocaleTimeString();

    const { error } = await supabase
        .from('attendance')
        .update({ status: 'Checked Out', check_out_time: now, task_summary, signature_data })
        .eq('user_id', req.user.id)
        .eq('date', today);

    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, message: 'Checked out successfully!' });
});

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});