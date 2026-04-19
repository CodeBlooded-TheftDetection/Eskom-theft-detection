const caseId = localStorage.getItem("selectedCase");

// set report title
document.getElementById("reportTitle").textContent =
  "Report for Case #" + caseId;

function goBack() {
  let updatedCases = JSON.parse(localStorage.getItem("updatedCases")) || [];

  if (!updatedCases.includes(Number(caseId))) {
    updatedCases.push(Number(caseId));
  }

  localStorage.setItem("updatedCases", JSON.stringify(updatedCases));

  window.location.href = "cases.html";
}