import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://dyprtgceuakftleqnmow.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5cHJ0Z2NldWFrZnRsZXFubW93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2ODcyNjAsImV4cCI6MjEwOTI2MzI2MH0.zwh2Uj451FPynXzMPoeHThvc5j6fID1_gLdMXHqef2E';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let signaturePad;

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('signatureCanvas');
    if (canvas) {
        signaturePad = new SignaturePad(canvas);
    }

    const token = localStorage.getItem('token');
    if (token) {
        showAppView();
        loadLogs(token);
    } else {
        showAuthView();
    }

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('emailInput').value;
        const password = document.getElementById('passwordInput').value;

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            document.getElementById('authMessage').innerText = error.message;
            return;
        }

        localStorage.setItem('token', data.session.access_token);
        showAppView();
        loadLogs(data.session.access_token);
    });

    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await supabase.auth.signOut();
        localStorage.removeItem('token');
        showAuthView();
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
            btn.classList.add('active');
            document.getElementById(btn.getAttribute('data-target')).classList.remove('hidden');
        });
    });

    document.getElementById('clearSigBtn').addEventListener('click', () => {
        if (signaturePad) signaturePad.clear();
    });

    document.getElementById('checkInBtn').addEventListener('click', async () => {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/checkin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                sin: document.getElementById('sinInput').value,
                name: document.getElementById('nameInput').value
            })
        });
        const result = await response.json();
        if (response.ok) {
            alert('Checked in successfully!');
            loadLogs(token);
        } else {
            alert(result.error || 'Check-in failed');
        }
    });

    document.getElementById('checkOutBtn').addEventListener('click', async () => {
        const token = localStorage.getItem('token');
        const taskSummary = document.getElementById('taskSummaryInput').value;
        const signatureData = signaturePad && !signaturePad.isEmpty() ? signaturePad.toDataURL() : '';

        const response = await fetch('/api/checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                sin: document.getElementById('sinInput').value,
                task_summary: taskSummary,
                signature_data: signatureData
            })
        });
        const result = await response.json();
        if (response.ok) {
            alert('Checked out successfully!');
            loadLogs(token);
        } else {
            alert(result.error || 'Check-out failed');
        }
    });

    document.getElementById('printBtn').addEventListener('click', () => window.print());
    document.getElementById('exportPdfBtn').addEventListener('click', () => alert('PDF export initialized'));
    document.getElementById('exportWordBtn').addEventListener('click', () => alert('Word export initialized'));
    document.getElementById('exportExcelBtn').addEventListener('click', () => alert('Excel export initialized'));
});

function showAuthView() {
    document.getElementById('authView').classList.remove('hidden');
    document.getElementById('appView').classList.add('hidden');
}

function showAppView() {
    document.getElementById('authView').classList.add('hidden');
    document.getElementById('appView').classList.remove('hidden');
}

async function loadLogs(token) {
    try {
        const response = await fetch('/api/logs', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to load logs');
        const logs = await response.json();
        const tbody = document.getElementById('logTableBody');
        tbody.innerHTML = '';
        logs.forEach(log => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${log.date || '-'}</td><td>${log.name}</td><td>${log.status}</td><td>${log.check_in_time || '-'}</td><td>${log.check_out_time || '-'}</td>`;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error(err);
    }
}