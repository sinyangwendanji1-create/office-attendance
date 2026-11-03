async function handleAction(actionType) {
  const name = document.getElementById('studentName').value;
  const studentNumber = document.getElementById('studentNumber').value;
  const taskDone = document.getElementById('taskInput').value;

  if (!studentNumber.trim()) {
    alert("Please enter your Student Number (SIN).");
    return;
  }

  if (actionType === 'register') {
    if (!name.trim()) {
      alert("Please enter your name to register.");
      return;
    }
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, student_number: studentNumber })
      });
      const result = await response.json();
      alert(result.message);
    } catch (err) {
      alert("Error: " + err.message);
    }
    return;
  }

  if (!taskDone.trim()) {
    alert("Please enter the task completed today.");
    return;
  }

  if (!navigator.geolocation) {
    sendAttendanceData(actionType, name, studentNumber, taskDone, null, null);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      sendAttendanceData(actionType, name, studentNumber, taskDone, latitude, longitude);
    },
    (error) => {
      sendAttendanceData(actionType, name, studentNumber, taskDone, null, null);
    }
  );
}

async function sendAttendanceData(actionType, name, studentNumber, taskDone, lat, lng) {
  try {
    const response = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        student_number: studentNumber,
        action: actionType,
        task_done: taskDone,
        lat,
        lng
      })
    });
    const result = await response.json();
    alert(result.message);
    loadLogs();
  } catch (err) {
    alert("Error: " + err.message);
  }
}

async function loadLogs() {
  try {
    const res = await fetch('/api/logs');
    const logs = await res.json();
    const tbody = document.getElementById('logTableBody');
    tbody.innerHTML = '';
    
    logs.forEach(log => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${log.name || ''}</td>
        <td>${log.action_type || ''}</td>
        <td>${new Date(log.created_at).toLocaleTimeString()}</td>
        <td>${log.task_done || ''}</td>
        <td>${log.location_status || ''}</td>
        <td>${log.ip_address || ''}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.error(e);
  }
}

window.onload = loadLogs;