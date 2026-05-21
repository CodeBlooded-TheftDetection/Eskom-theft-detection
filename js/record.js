function saveOutcome() {

    let outcome = document.getElementById("outcomeType").value;
    let caseNo = document.getElementById("case-numb").value;
    let findings = document.getElementById("findings").value;
    let actions = document.getElementById("actions").value;
    let evidence = document.getElementById("evidence").value;
    let notes = document.getElementById("notes").value;
    

    // Save to localStorage
    localStorage.setItem("outcome", outcome);
    localStorage.setItem("findings", findings);
    localStorage.setItem("caseNo", caseNo);
    localStorage.setItem("actions", actions);
    localStorage.setItem("evidence", evidence);
    localStorage.setItem("notes", notes);

    alert("Case saved successfully!");

} 
 

function loadOutcome() {

    document.getElementById("outcomeType").value =
        localStorage.getItem("outcome");

    document.getElementById("findings").value =
        localStorage.getItem("findings");

    document.getElementById("actions").value =
        localStorage.getItem("actions");

    document.getElementById("evidence").value =
        localStorage.getItem("evidence");

    document.getElementById("notes").value =
        localStorage.getItem("notes");
}