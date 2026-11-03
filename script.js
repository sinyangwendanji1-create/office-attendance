async function handleAttendance(type) {
  const studentId = document.getElementById('studentIdInput').value;
  const taskDone = document.getElementById('taskInput').value;

  if (!studentId.trim()) {
    alert("Please enter your Student ID.");
    return;
  }

  if (!taskDone.trim()) {
    alert("Please enter the task completed today.");
    return;
  }

  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;

      try {
        const response = await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_id: studentId,
            type: type,
            lat: latitude,
            lng: longitude,
            task_done: taskDone
          })
        });

        const result = await response.json();
        alert(result.message);
      } catch (err) {
        alert("Failed to record attendance: " + err.message);
      }
    },
    (error) => {
      alert("Error fetching GPS location: " + error.message);
    }
  );
}