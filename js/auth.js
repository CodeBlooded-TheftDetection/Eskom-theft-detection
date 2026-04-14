document.getElementById("loginForm").addEventListener("submit", function(e) {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const role = document.getElementById("role").value;
  const errorMsg = document.getElementById("errorMsg");

  if (email === "" || password === "" || role === "Select your role") {
    errorMsg.textContent = "Please fill in all fields";
    return;
  }

  // TEMP LOGIN
  window.location.href = "dashboard.html";
});