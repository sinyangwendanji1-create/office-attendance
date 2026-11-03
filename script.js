async function handleAction(actionType) {
  const name = document.getElementById('studentName').value;
  const studentNumber = document.getElementById('studentNumber').value;
  const taskDone = document.getElementById('taskInput').value;

  if (!studentNumber.trim()) {
    alert("Please enter your Student Number (SIN).");
    return;
  }

  try {
    const response = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name,
        student_number: studentNumber,
        action: actionType,
        task_done: taskDone
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
        <td>${log.action || ''}</td>
        <td>${new Date(log.created_at).toLocaleTimeString()}</td>
        <td>${log.task_done || ''}</td>
        <td>${log.ip_address || ''}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.error(e);
  }
}

window.onload = loadLogs;