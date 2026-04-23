const container = document.getElementById("casesContainer");

// fake cases (matches your Figma count)
const cases = [
  { id: 1, name: "John Makeba", location: "Soweto", risk: "HIGH" },
  { id: 2, name: "Sarah Nkosi", location: "Alexandra", risk: "MEDIUM" },
  { id: 3, name: "David Mokoena", location: "Sandton", risk: "LOW" },
  { id: 4, name: "Thabo Dlamini", location: "Pretoria", risk: "MEDIUM" },
  { id: 5, name: "Lerato Khumalo", location: "Midrand", risk: "HIGH" }
];

// get updated cases
const updatedCases = JSON.parse(localStorage.getItem("updatedCases")) || [];

function renderCases() {
  container.innerHTML = "";

  cases.forEach(c => {
    const isUpdated = updatedCases.includes(c.id);

    container.innerHTML += `
      <div class="case-card">
        
        <div class="case-info">
          <h3>${c.name}</h3>
          <p>${c.location}</p>

          <span class="badge ${c.risk.toLowerCase()}">${c.risk}</span>
          <span class="status ${isUpdated ? "resolved" : "open"}">
            ${isUpdated ? "REPORTED" : "OPEN"}
          </span>
        </div>

        <button onclick="generateReport(${c.id})">
          Generate Report
        </button>

      </div>
    `;
  });
}

function generateReport(id) {
  localStorage.setItem("selectedCase", id);
  window.location.href = "report.html";
}

renderCases();