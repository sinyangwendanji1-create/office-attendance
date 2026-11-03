async function registerStudent() {
  const nameInput = document.getElementById('studentName').value.trim();
  const passwordInput = document.getElementById('sinPassword').value.trim();

  if (!nameInput || !passwordInput) {
    alert('Please enter both your Name and Student Number to register.');
    return;
  }

  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameInput, sin: passwordInput })
    });

    const data = await response.json();

    if (response.ok) {
      alert(data.message);
    } else {
      alert(data.error || 'Registration failed.');
    }
  } catch (err) {
    alert('Failed to connect to the server.');
  }
}

async function submitAttendance(action) {
  const nameInput = document.getElementById('studentName').value.trim();
  const passwordInput = document.getElementById('sinPassword').value.trim();

  if (!nameInput || !passwordInput) {
    alert('Please enter both your Student Name and Student Number.');
    return;
  }

  try {
    const response = await fetch('/api/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameInput, sin: passwordInput, action: action })
    });

    const data = await response.json();

    if (response.ok) {
      alert(data.message);
      if (data.history) {
        updateHistoryLog(data.history);
      }
    } else {
      alert(data.error || 'An error occurred.');
    }
  } catch (err) {
    alert('Failed to connect to the server.');
  }
}

function updateHistoryLog(history) {
  const logList = document.getElementById('historyLog');
  if (!logList) return;
  logList.innerHTML = '';
  history.slice().reverse().forEach(entry => {
    const li = document.createElement('li');
    li.textContent = `${entry.time} - ${entry.name}: ${entry.action}`;
    logList.appendChild(li);
  });
}