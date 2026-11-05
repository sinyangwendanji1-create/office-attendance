import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://dyprtgceuakftleqnmow.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5cHJ0Z2NldWFrZnRsZXFubW93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2ODcyNjAsImV4cCI6MjEwOTI2MzI2MH0.zwh2Uj451FPynXzMPoeHThvc5j6fID1_gLdMXHqef2E';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let signaturePad;
let html5QrCodeScanner = null;

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('signatureCanvas');
    if (canvas) {
        signaturePad = new SignaturePad(canvas);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    if (tokenParam) {
        document.getElementById('officeTokenInput').value = tokenParam;
    }

    const token = localStorage.getItem('token');
    if (token) {
        showAppView();
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
            const target = btn.getAttribute('data-target');
            document.getElementById(target).classList.remove('hidden');
            if (target === 'reportsTab') {
                loadLogs(localStorage.getItem('token'));
            }
        });
    });

    document.getElementById('clearSigBtn').addEventListener('click', () => {
        if (signaturePad) signaturePad.clear();
    });

    // QR Camera Scanner Trigger
    document.getElementById('scanQrBtn').addEventListener('click', () => {
        const container = document.getElementById('qrReaderContainer');
        container.classList.remove('hidden');
        
        if (!html5QrCodeScanner) {
            html5QrCodeScanner = new Html5Qrcode("reader");
        }
        
        html5QrCodeScanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: 250 },
            (decodedText) => {
                // Handle scanned result (extract token if it's a URL or direct string)
                let tokenVal = decodedText;
                try {
                    const url = new URL(decodedText);
                    const t = url.searchParams.get('token');
                    if (t) tokenVal = t;
                } catch (e) {
                    // Not a URL, use raw scanned text
                }
                document.getElementById('officeTokenInput').value = tokenVal;
                document.getElementById('portalMessage').innerText = 'QR Code scanned successfully!';
                document.getElementById('portalMessage').style.color = '#28a745';
                
                html5QrCodeScanner.stop();
                container.classList.add('hidden');
            },
            (errorMessage) => {
                // Scanning in progress...
            }
        ).catch(err => {
            document.getElementById('portalMessage').innerText = 'Camera permission denied or unavailable.';
            document.getElementById('portalMessage').style.color = '#dc3545';
        });
    });

    document.getElementById('closeScannerBtn').addEventListener('click', () => {
        if (html5QrCodeScanner) {
            html5QrCodeScanner.stop().catch(() => {});
        }
        document.getElementById('qrReaderContainer').classList.add('hidden');
    });

    // Check-In (Requires Name, SIN, PIN, QR Token, IP, and Geofence - NO Task Summary/Signature needed)
    document.getElementById('checkInBtn').addEventListener('click', async () => {
        const token = localStorage.getItem('token');
        const name = document.getElementById('nameInput').value.trim();
        const sin = document.getElementById('sinInput').value.trim();
        const officePin = document.getElementById('officePinInput').value.trim();
        const officeToken = document.getElementById('officeTokenInput').value.trim();
        const msgEl = document.getElementById('portalMessage');

        if (!name || !sin || !officePin || !officeToken) {
            msgEl.innerText = 'Error: Name, SIN, Office PIN, and QR Token are required to check in.';
            msgEl.style.color = '#dc3545';
            return;
        }

        msgEl.innerText = 'Acquiring GPS and verifying Quad-Lock...';
        msgEl.style.color = '#007bff';

        if (!navigator.geolocation) {
            msgEl.innerText = 'Error: Geolocation is required for verification.';
            msgEl.style.color = '#dc3545';
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                const response = await fetch('/api/checkin', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ sin, name, office_pin: officePin, office_token: officeToken, lat, lng })
                });
                const result = await response.json();
                if (response.ok) {
                    msgEl.innerText = 'Successfully Checked In!';
                    msgEl.style.color = '#28a745';
                } else {
                    msgEl.innerText = result.error || 'Check-in failed';
                    msgEl.style.color = '#dc3545';
                }
            },
            (error) => {
                msgEl.innerText = 'Error: Could not retrieve GPS location. Ensure location services are enabled.';
                msgEl.style.color = '#dc3545';
            },
            { timeout: 10000 }
        );
    });

    // Check-Out (Requires SIN, Task Summary, and Digital Signature)
    document.getElementById('checkOutBtn').addEventListener('click', async () => {
        const token = localStorage.getItem('token');
        const sin = document.getElementById('sinInput').value.trim();
        const taskSummary = document.getElementById('taskSummaryInput').value.trim();
        const msgEl = document.getElementById('portalMessage');

        if (!sin || !taskSummary) {
            msgEl.innerText = 'Error: SIN and Task Summary are required for check-out.';
            msgEl.style.color = '#dc3545';
            return;
        }

        if (!signaturePad || signaturePad.isEmpty()) {
            msgEl.innerText = 'Error: Digital signature is required for check-out verification.';
            msgEl.style.color = '#dc3545';
            return;
        }

        const signatureData = signaturePad.toDataURL();

        const response = await fetch('/api/checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ sin, task_summary: taskSummary, signature_data: signatureData })
        });
        const result = await response.json();
        if (response.ok) {
            msgEl.innerText = 'Successfully Checked Out!';
            msgEl.style.color = '#28a745';
        } else {
            msgEl.innerText = result.error || 'Check-out failed';
            msgEl.style.color = '#dc3545';
        }
    });

    document.getElementById('printBtn').addEventListener('click', () => window.print());
    document.getElementById('exportPdfBtn').addEventListener('click', () => alert('PDF export initialized'));
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
            tr.innerHTML = `<td>${log.date || '-'}</td><td>${log.name}</td><td>${log.sin || '-'}</td><td>${log.status}</td><td>${log.check_in_time || '-'}</td><td>${log.check_out_time || '-'}</td><td>${log.task_summary || '-'}</td>`;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.log(err);
    }
}