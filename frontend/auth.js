const API_BASE = "http://localhost:5000/api";

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (data.userId) {
        localStorage.setItem("userId", data.userId);
        if (data.username) localStorage.setItem("username", data.username);
        window.location.href = "index.html";
      } else {
        alert(data.message || "Login failed.");
      }
    } catch (err) {
      alert("Login failed.");
    }
  });
}

if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();
      alert(data.message || "Registration complete.");

      if (response.ok && data.needsOtp) {
        const otp = prompt("Enter the OTP sent to your email:");
        if (!otp) return;

        const verifyRes = await fetch(`${API_BASE}/auth/verify-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp })
        });

        const verifyData = await verifyRes.json();
        alert(verifyData.message || "Verification done.");

        if (verifyRes.ok) {
          window.location.href = "login.html";
        }
        return;
      }

      if (response.ok) {
        window.location.href = "login.html";
      }
    } catch (err) {
      alert("Registration failed.");
    }
  });
}
