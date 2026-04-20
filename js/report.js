
  // Case data store
  const caseData = {
    "ETD-2026-001": {
      risk: "HIGH", riskLabel: "HIGH RISK", riskClass: "high",
      date: "2026-04-08", status: "Open", assigned: "Unassigned",
      suspect: "John Makeba", location: "Soweto",
      address: "123 Vilakazi Street, Soweto",
      description: "Illegal connection detected with bypass meter. Estimated theft of 500kWh per month.",
      loss: "R12,500/month", riskLevel: "High"
    },
    "ETD-2026-002": {
      risk: "MEDIUM", riskLabel: "MEDIUM RISK", riskClass: "medium",
      date: "2026-04-07", status: "Assigned", assigned: "Mike Johnson",
      suspect: "Sarah Cohen", location: "Sandton",
      address: "45 Rivonia Road, Sandton",
      description: "Tampered meter detected during routine inspection. Ongoing investigation.",
      loss: "R8,000/month", riskLevel: "Medium"
    },
    "ETD-2026-003": {
      risk: "HIGH", riskLabel: "HIGH RISK", riskClass: "high",
      date: "2026-04-06", status: "Assigned", assigned: "Jane Smith",
      suspect: "David Sithole", location: "Alexandra",
      address: "17 London Road, Alexandra",
      description: "Major illegal connection feeding multiple units. High theft volume confirmed.",
      loss: "R18,000/month", riskLevel: "High"
    },
    "ETD-2026-004": {
      risk: "MEDIUM", riskLabel: "MEDIUM RISK", riskClass: "medium",
      date: "2026-04-05", status: "Open", assigned: "Unassigned",
      suspect: "Maria van der Merwe", location: "Pretoria",
      address: "22 Church Street, Pretoria",
      description: "Suspected meter bypass. Field inspection pending.",
      loss: "R5,500/month", riskLevel: "Medium"
    },
    "ETD-2026-005": {
      risk: "LOW", riskLabel: "LOW RISK", riskClass: "low",
      date: "2026-04-03", status: "Resolved", assigned: "Mike Johnson",
      suspect: "Peter Nkosi", location: "Randburg",
      address: "89 Republic Road, Randburg",
      description: "Faulty meter causing incorrect readings. Issue resolved with meter replacement.",
      loss: "R2,000/month", riskLevel: "Low"
    }
  };

  // Load case from localStorage --- temporary till the api is linked
  const selectedId = localStorage.getItem("selectedCaseId") || "ETD-2026-001";
  const c = caseData[selectedId] || caseData["ETD-2026-001"]; // putt the information in a variable as we are accessing properties -- a folder basically

// Fill in all case details into HTML elements
  document.getElementById("reportSubtitle").textContent = "Case Report - " + selectedId;
  document.getElementById("caseNumber").textContent = selectedId;
  document.getElementById("dateReported").textContent = c.date;
  document.getElementById("caseStatus").textContent = c.status;
  document.getElementById("assignedInvestigator").textContent = c.assigned;
  document.getElementById("suspectName").textContent = c.suspect;
  document.getElementById("suspectLocation").textContent = c.location;
  document.getElementById("fullAddress").textContent = c.address;
  document.getElementById("description").textContent = c.description;
  document.getElementById("estLoss").textContent = c.loss;
  document.getElementById("riskLevel").textContent = c.riskLevel;
  document.getElementById("riskBadge").textContent = c.riskLabel;

  // Update risk badge colour
  const badge = document.getElementById("riskBadge");
  if (c.riskClass === "medium") {
    badge.style.background = "#fef3c7";
    badge.style.color = "#92400e";
  } else if (c.riskClass === "low") {
    badge.style.background = "#dcfce7";
    badge.style.color = "#166534";
  }


// Format date and time for South Africa 
  const now = new Date();
  document.getElementById("genDate").textContent =
    "Generated on: " + now.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" }) +
    " at " + now.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });

  // Printing the  handler-- doesnt work as yet 
  function downloadPDF() {
    window.print();
  }