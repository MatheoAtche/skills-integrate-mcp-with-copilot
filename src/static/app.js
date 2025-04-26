document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const loginMessageDiv = document.getElementById("login-message");
  const closeBtn = document.querySelector(".close");
  const usernameDisplay = document.getElementById("username-display");
  const userInfo = document.getElementById("user-info");
  const authContainer = document.getElementById("auth-container");

  let isAuthenticated = false;
  let token = localStorage.getItem("auth_token");
  let currentUsername = localStorage.getItem("username");

  // Check if user is already authenticated
  if (token) {
    isAuthenticated = true;
    updateAuthUI();
    validateToken();
  }

  // Show login modal
  loginBtn.addEventListener("click", () => {
    loginModal.classList.remove("hidden");
    loginModal.classList.add("visible");
  });

  // Close login modal
  closeBtn.addEventListener("click", () => {
    loginModal.classList.remove("visible");
    loginModal.classList.add("hidden");
  });

  // Close modal when clicking outside
  window.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      loginModal.classList.remove("visible");
      loginModal.classList.add("hidden");
    }
  });

  // Handle login form submission
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    
    try {
      const response = await fetch("/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          username: username,
          password: password,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Save token and username
        token = data.access_token;
        currentUsername = data.username;
        localStorage.setItem("auth_token", token);
        localStorage.setItem("username", currentUsername);
        
        // Update UI
        isAuthenticated = true;
        updateAuthUI();
        
        // Close modal
        loginModal.classList.remove("visible");
        loginModal.classList.add("hidden");
        
        // Reset form
        loginForm.reset();
        
        // Refresh activities list
        fetchActivities();
      } else {
        // Show error
        loginMessageDiv.textContent = data.detail || "Login failed";
        loginMessageDiv.className = "error";
        loginMessageDiv.classList.remove("hidden");
      }
    } catch (error) {
      console.error("Login error:", error);
      loginMessageDiv.textContent = "An error occurred. Please try again.";
      loginMessageDiv.className = "error";
      loginMessageDiv.classList.remove("hidden");
    }
  });

  // Handle logout
  logoutBtn.addEventListener("click", () => {
    // Clear token and username
    localStorage.removeItem("auth_token");
    localStorage.removeItem("username");
    token = null;
    currentUsername = null;
    isAuthenticated = false;
    
    // Update UI
    updateAuthUI();
    
    // Refresh activities list
    fetchActivities();
  });

  // Update auth UI based on authentication status
  function updateAuthUI() {
    if (isAuthenticated) {
      loginBtn.classList.add("hidden");
      userInfo.classList.remove("hidden");
      usernameDisplay.textContent = currentUsername;
    } else {
      loginBtn.classList.remove("hidden");
      userInfo.classList.add("hidden");
    }
  }

  // Validate token by checking user profile
  async function validateToken() {
    try {
      const response = await fetch("/user/me", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        // Token is invalid, log out
        localStorage.removeItem("auth_token");
        localStorage.removeItem("username");
        token = null;
        currentUsername = null;
        isAuthenticated = false;
        updateAuthUI();
      }
    } catch (error) {
      console.error("Token validation error:", error);
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = `<option value="">-- Select an activity --</option>`;

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons if authenticated
        let participantsHTML = "";
        if (details.participants.length > 0) {
          participantsHTML = `
            <div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map((email) => {
                    if (isAuthenticated) {
                      return `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`;
                    } else {
                      return `<li><span class="participant-email">${email}</span></li>`;
                    }
                  })
                  .join("")}
              </ul>
            </div>`;
        } else {
          participantsHTML = `<p><em>No participants yet</em></p>`;
        }

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons if authenticated
      if (isAuthenticated) {
        document.querySelectorAll(".delete-btn").forEach((button) => {
          button.addEventListener("click", handleUnregister);
        });
      }

      // Show/hide signup form based on authentication
      signupForm.parentElement.style.display = isAuthenticated ? "block" : "none";
      
      // Add a message for non-authenticated users
      if (!isAuthenticated && !document.getElementById("auth-message")) {
        const authMessage = document.createElement("div");
        authMessage.id = "auth-message";
        authMessage.className = "info";
        authMessage.textContent = "Please login as a teacher to register or unregister students.";
        if (signupForm.parentElement.style.display === "none") {
          activitiesList.parentElement.appendChild(authMessage);
        }
      } else if (isAuthenticated && document.getElementById("auth-message")) {
        document.getElementById("auth-message").remove();
      }
      
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
