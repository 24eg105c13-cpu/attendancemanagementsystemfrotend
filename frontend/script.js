const API = "http://localhost:8080/api";
const studentRows = document.getElementById("studentRows");
const attendanceRows = document.getElementById("attendanceRows");
const message = document.getElementById("message");

function showMessage(text, isError = false) {
  message.textContent = text;
  message.className = isError ? "error" : "";
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || `Request failed (${response.status})`);
  }
  if (response.status === 204) return null;
  return response.json();
}

async function loadStudents() {
  try {
    const students = await request(`${API}/students`);
    studentRows.innerHTML = "";
    if (!students.length) {
      studentRows.innerHTML = '<tr><td colspan="5">No students added yet.</td></tr>';
      return;
    }
    students.forEach(student => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${escapeHtml(student.rollNumber)}</td>
        <td>${escapeHtml(student.name)}</td>
        <td>${escapeHtml(student.email || "-")}</td>
        <td>
          <button class="present" type="button">Present</button>
          <button class="absent" type="button">Absent</button>
        </td>
        <td><button class="danger" type="button">Delete</button></td>`;
      row.querySelector(".present").addEventListener("click", () => markAttendance(student.id, "PRESENT"));
      row.querySelector(".absent").addEventListener("click", () => markAttendance(student.id, "ABSENT"));
      row.querySelector(".danger").addEventListener("click", () => deleteStudent(student.id));
      studentRows.appendChild(row);
    });
  } catch (error) {
    studentRows.innerHTML = '<tr><td colspan="5">Could not connect to backend. Start Spring Boot and check MySQL settings.</td></tr>';
    showMessage(error.message, true);
  }
}

async function loadAttendance() {
  try {
    const records = await request(`${API}/attendance`);
    attendanceRows.innerHTML = "";
    if (!records.length) {
      attendanceRows.innerHTML = '<tr><td colspan="4">No attendance records yet.</td></tr>';
      return;
    }
    records.slice().reverse().forEach(record => {
      const row = document.createElement("tr");
      row.innerHTML = `<td>${escapeHtml(record.studentName)}</td>
        <td>${escapeHtml(record.rollNumber)}</td>
        <td>${escapeHtml(record.date)}</td>
        <td>${escapeHtml(record.status)}</td>`;
      attendanceRows.appendChild(row);
    });
  } catch (error) {
    attendanceRows.innerHTML = '<tr><td colspan="4">Could not load attendance records.</td></tr>';
  }
}

document.getElementById("studentForm").addEventListener("submit", async event => {
  event.preventDefault();
  const student = {
    name: document.getElementById("name").value.trim(),
    rollNumber: document.getElementById("rollNumber").value.trim(),
    email: document.getElementById("email").value.trim()
  };
  try {
    await request(`${API}/students`, { method: "POST", body: JSON.stringify(student) });
    event.target.reset();
    showMessage("Student added successfully.");
    await loadStudents();
  } catch (error) {
    showMessage(error.message || "Unable to add student.", true);
  }
});

async function markAttendance(studentId, status) {
  try {
    await request(`${API}/attendance`, {
      method: "POST",
      body: JSON.stringify({ studentId, status })
    });
    showMessage(`Attendance marked ${status}.`);
    await loadAttendance();
  } catch (error) {
    showMessage(error.message || "Unable to mark attendance.", true);
  }
}

async function deleteStudent(id) {
  if (!confirm("Delete this student? Their attendance records will also be deleted.")) return;
  try {
    await request(`${API}/students/${id}`, { method: "DELETE" });
    showMessage("Student deleted.");
    await loadStudents();
    await loadAttendance();
  } catch (error) {
    showMessage(error.message || "Unable to delete student.", true);
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}

document.getElementById("refreshButton").addEventListener("click", () => {
  loadStudents();
  loadAttendance();
});
loadStudents();
loadAttendance();
