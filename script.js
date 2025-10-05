let currentFilter = "all"; // Default filter (can be "all" or a specific date string)
let currentCategory = "all"; // Default category
let categories = new Set(); // To store unique categories
let currentArea = "all"; // Default area filter
let areas = new Set(); // To store unique areas
let combinedData = []; // To store combined events and exhibitions data

// Authentication and saved activities state
let currentUser = null;
let savedActivities = new Set(); // Store saved activity IDs
let isSignUpMode = false;

async function fetchGoogleSheet(sheetName) {
  const sheetLink = `https://sheets.googleapis.com/v4/spreadsheets/1G_8RMWjf0T9sNdMxKYy_Fc051I6zhdLLy6ehLak4CX4/values/${sheetName}/?key=AIzaSyCPyerGljBK4JJ-XA3aRr5cRvWssI3rwhI`;

  try {
    const response = await fetch(sheetLink);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.values; // Return the values directly
  } catch (error) {
    console.error("Error fetching data:", error);
    return []; // Return an empty array on error
  }
}

// Function to fetch CSV data
async function fetchCSV(url) {
  const response = await fetch(url);
  const data = await response.text();
  return data;
}

// Function to parse CSV and display events or exhibitions
function displayData(data) {
  const eventList = document.getElementById("eventList");
  eventList.innerHTML = ""; // Clear previous entries

  // Reset and update categories and areas
  categories = new Set();
  areas = new Set();
  categories.add("all");
  categories.add("展覽"); // Add exhibitions as a category
  areas.add("all");

  // Collect all unique categories and areas from combined data
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    if (item.isExhibition) {
      // For exhibitions, just add areas
      if (item.areas) {
        item.areas.forEach((area) => areas.add(area));
      }
    } else {
      // For events, add both categories and areas
      if (item.categories) {
        item.categories.forEach((cat) => categories.add(cat));
      }
      if (item.areas) {
        item.areas.forEach((area) => areas.add(area));
      }
    }
  }

  generateAllFilterButtons();

  const today = new Date();

  for (let i = 0; i < data.length; i++) {
    const item = data[i];

    // Apply category filter first
    if (currentCategory === "展覽" && !item.isExhibition) {
      continue; // Show only exhibitions when "展覽" is selected
    }
    if (
      currentCategory !== "all" &&
      currentCategory !== "展覽" &&
      (!item.categories || !item.categories.includes(currentCategory))
    ) {
      continue; // Show only events with matching category
    }

    // Apply date filters to both events and exhibitions
    if (currentFilter !== "all") {
      const availableDates = item.dates || [];
      // currentFilter is now a specific date string in "dd/mm/yyyy" format
      if (
        !availableDates.some(
          (date) => date.toLocaleDateString("en-GB") === currentFilter
        )
      ) {
        continue;
      }
    }

    // Apply area filter
    if (
      currentArea !== "all" &&
      (!item.areas || !item.areas.includes(currentArea))
    ) {
      continue;
    }

    // Create event/exhibition object from processed data
    const eventData = {
      title: item.title,
      date: item.dateStr,
      venue: item.venue,
      cost: item.cost,
      url: item.url,
      photo: item.photo,
    };

    // Create card element
    const card = document.createElement("div");
    card.className = "event-card";

    // Add heart button (only show if user is signed in)
    if (currentUser && item.id) {
      const heartBtn = document.createElement("button");
      heartBtn.className = `heart-btn ${
        savedActivities.has(item.id) ? "saved" : ""
      }`;
      heartBtn.innerHTML = `<i class="fas fa-heart"></i>`;
      heartBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await toggleSavedActivity(item);
        // Update heart button state based on current saved status
        if (savedActivities.has(item.id)) {
          heartBtn.classList.add("saved");
        } else {
          heartBtn.classList.remove("saved");
        }
      });
      card.appendChild(heartBtn);
    }

    // Create image container
    const imageContainer = document.createElement("div");
    imageContainer.className = "event-image-container";

    // Add image if available, otherwise add default icon
    if (eventData.photo) {
      // Create both the direct image and linked image
      const image = document.createElement("img");
      image.className = "event-image";
      image.alt = eventData.title;

      // Create a link wrapper
      const imageLink = document.createElement("a");
      imageLink.href = eventData.photo;
      imageLink.target = "_blank";
      imageLink.textContent = "Click to view image";

      // Set image source
      image.src = eventData.photo;

      // Add both versions
      imageContainer.appendChild(image);
      imageContainer.appendChild(imageLink);

      // Style to only show one version
      imageLink.style.display = "none";

      // If the direct image fails to load, show the link
      image.onerror = function () {
        image.style.display = "none";
        imageLink.style.display = "flex";
      };
    } else {
      // Add default icon when no photo is available
      const defaultIcon = document.createElement("i");
      defaultIcon.className = "fas fa-image event-default-icon";
      imageContainer.appendChild(defaultIcon);
    }

    card.appendChild(imageContainer);

    // Create content container
    const content = document.createElement("div");
    content.className = "event-content";

    // Add title with link (only title is clickable)
    const title = document.createElement("h2");
    const titleLink = document.createElement("a");
    titleLink.href = eventData.url;
    titleLink.target = "_blank";
    titleLink.style.textDecoration = "none";
    titleLink.textContent = eventData.title;
    title.appendChild(titleLink);
    content.appendChild(title);

    // Add date (not clickable)
    const date = document.createElement("p");
    date.innerHTML = `<i class="fas fa-calendar-alt"></i> ${eventData.date}`;
    content.appendChild(date);

    // Add venue (not clickable)
    const venue = document.createElement("p");
    venue.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${eventData.venue}`;
    content.appendChild(venue);

    // Add cost if available (not clickable)
    if (eventData.cost) {
      const cost = document.createElement("p");
      cost.innerHTML = `<i class="fas fa-dollar-sign"></i> ${eventData.cost}`;
      cost.className = "event-cost";
      content.appendChild(cost);
    }

    // Assemble the card
    card.appendChild(content);
    eventList.appendChild(card);
  }

  if (eventList.children.length === 0) {
    console.log("No events found for the selected filter.");
  }
}

// // Function to parse a single CSV line, accounting for quoted fields and empty items
// function parseCSVLine(data) {
//   const dataArray = [];
//   let element = "";
//   let withinQuotes = false;

//   for (let i = 0; i < data.length; i++) {
//     const char = data[i];

//     if (char === "," && !withinQuotes) {
//       dataArray.push(element.trim().replace(/^"|"$/g, ""));
//       element = "";
//     } else {
//       element += char;

//       if (char === '"') {
//         withinQuotes = !withinQuotes;
//       }
//     }
//   }
//   dataArray.push(element.trim().replace(/^"|"$/g, ""));
//   return dataArray;
// }

// Function to parse various date formats and return a list of dates
function parseDates(dateStr) {
  const dates = [];
  const year = new Date().getFullYear(); // Use current year

  // Split the input string by commas
  const dateParts = dateStr.split(",").map((part) => part.trim()); // Trim whitespace

  for (const part of dateParts) {
    if (part.startsWith("till ")) {
      // Handle "till [date]/[month]" format
      const datePart = part.substring(5).trim(); // Extract the date after "till "
      const [day, month] = datePart.split("/").map(Number);
      const endDate = new Date(year, month - 1, day);

      // Add all dates from today to the end date
      for (let d = new Date(); d <= endDate; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d)); // Add each date from today to end date
      }
    } else if (part.includes("-")) {
      // Handle date ranges (e.g., "1/12-3/12")
      const [start, end] = part
        .split("-")
        .map((date) => date.trim().split("/").map(Number));
      const startDate = new Date(year, start[1] - 1, start[0]);
      const endDate = new Date(year, end[1] - 1, end[0]);

      for (let d = startDate; d <= endDate; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d)); // Add each date in the range
      }
    } else {
      // Handle single date (e.g., "16/11")
      const [day, month] = part.split("/").map(Number);
      dates.push(new Date(year, month - 1, day)); // Add single date
    }
  }

  return dates; // Return all parsed dates
}

// Function to parse exhibition date formats and return availability dates
function parseExhibitionDates(dateStr) {
  if (!dateStr || dateStr.trim() === "") {
    // Empty date means available every day - return a large range
    const today = new Date();
    const dates = [];
    // Generate dates for next 365 days to represent "always available"
    for (let i = 0; i < 365; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  }

  const dates = [];
  const year = new Date().getFullYear();
  const today = new Date();

  // Remove extra whitespace and normalize
  const normalizedDateStr = dateStr.trim();

  if (normalizedDateStr.startsWith("till ")) {
    // Format: "till 9/11" - available every day from today until that date
    const datePart = normalizedDateStr.substring(5).trim();
    const [day, month] = datePart.split("/").map(Number);
    const endDate = new Date(year, month - 1, day);

    // Add all dates from today until the end date
    for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }
  } else if (normalizedDateStr.includes("-")) {
    // Format: "8/10-9/11" - available only during that specific period
    const [startPart, endPart] = normalizedDateStr
      .split("-")
      .map((s) => s.trim());
    const [startDay, startMonth] = startPart.split("/").map(Number);
    const [endDay, endMonth] = endPart.split("/").map(Number);

    const startDate = new Date(year, startMonth - 1, startDay);
    const endDate = new Date(year, endMonth - 1, endDay);

    // Only add dates within the specified period
    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      dates.push(new Date(d));
    }
  } else {
    // Handle other formats or single dates
    try {
      const [day, month] = normalizedDateStr.split("/").map(Number);
      dates.push(new Date(year, month - 1, day));
    } catch (error) {
      console.warn("Could not parse exhibition date:", normalizedDateStr);
      // If parsing fails, assume it's always available
      for (let i = 0; i < 365; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        dates.push(date);
      }
    }
  }

  return dates;
}

// Function to load and combine both events and exhibitions data
async function loadData() {
  try {
    // Fetch both events and exhibitions data
    const [eventsData, exhibitionsData] = await Promise.all([
      fetchGoogleSheet("Event(new)"),
      fetchGoogleSheet("Exhibition(new)"),
    ]);

    // Process events data
    const processedEvents = [];
    if (eventsData && eventsData.length > 1) {
      for (let i = 1; i < eventsData.length; i++) {
        const row = eventsData[i];
        if (row.length >= 14 && row[0].trim() === "Y") {
          const eventDateStr = row[6] ? row[6].trim() : "";
          const eventDates = parseDates(eventDateStr);
          const eventCategories = row[3].split(",").map((cat) => cat.trim());
          const eventAreas = row[12].split(",").map((area) => area.trim());
          const uniqueId = row[13] ? row[13].trim() : null; // Column N - unique ID

          processedEvents.push({
            id: uniqueId,
            title: row[2],
            dateStr: eventDateStr,
            dates: eventDates,
            venue: row[10],
            cost: row[1] && row[1].trim() !== "" && row[1].trim().toUpperCase() !== "N/A" ? row[1].trim() : null, // Column B - cost
            url: row[5],
            photo: row[11] ? row[11].trim().replace(/^@/, "") : null,
            categories: eventCategories,
            areas: eventAreas,
            isExhibition: false,
          });
        }
      }
    }

    // Process exhibitions data
    const processedExhibitions = [];
    if (exhibitionsData && exhibitionsData.length > 1) {
      for (let i = 1; i < exhibitionsData.length; i++) {
        const row = exhibitionsData[i];
        if (row.length >= 14 && row[0].trim() === "Y") {
          const exhibitionDateStr = row[6] ? row[6].trim() : "";
          const exhibitionDates = parseExhibitionDates(exhibitionDateStr);
          const exhibitionAreas = row[12]
            ? row[12].split(",").map((area) => area.trim())
            : [];
          const uniqueId = row[13] ? row[13].trim() : null; // Column N - unique ID

          processedExhibitions.push({
            id: uniqueId,
            title: row[2],
            dateStr: exhibitionDateStr,
            dates: exhibitionDates, // Now exhibitions have proper date availability
            venue: row[10],
            cost: row[1] && row[1].trim() !== "" && row[1].trim().toUpperCase() !== "N/A" ? row[1].trim() : null, // Column B - cost
            url: row[5],
            photo: row[11] ? row[11].trim().replace(/^@/, "") : null,
            categories: [], // Exhibitions don't have categories except being exhibitions
            areas: exhibitionAreas,
            isExhibition: true,
          });
        }
      }
    }

    // Combine and store the data
    combinedData = [...processedEvents, ...processedExhibitions];
    displayData(combinedData);
  } catch (error) {
    console.error("Error loading data:", error);
  }
}

// Function to generate all filter buttons in three separate rows
function generateAllFilterButtons() {
  generateDateFilterButtons();
  generateCategoryFilterButtons();
  generateAreaFilterButtons();
}

// Function to generate date filter buttons
function generateDateFilterButtons() {
  const container = document.getElementById("dateFiltersContainer");
  container.innerHTML = ""; // Clear existing buttons

  // Add "All" button for dates
  const allDateButton = document.createElement("button");
  allDateButton.textContent = "All";
  allDateButton.className = `filter-btn ${
    currentFilter === "all" ? "active" : ""
  }`;
  allDateButton.addEventListener("click", () => {
    currentFilter = "all";
    generateAllFilterButtons();
    loadData();
  });
  container.appendChild(allDateButton);

  // Add buttons for next 30 days
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    const dateString = date.toLocaleDateString("en-GB");
    const displayText =
      i === 0
        ? "Today"
        : i === 1
        ? "Tomorrow"
        : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    const button = document.createElement("button");
    button.textContent = displayText;
    button.className = `filter-btn ${
      currentFilter === dateString ? "active" : ""
    }`;
    button.addEventListener("click", () => {
      currentFilter = dateString;
      generateAllFilterButtons();
      loadData();
    });
    container.appendChild(button);
  }
}

// Function to generate category filter buttons
function generateCategoryFilterButtons() {
  const container = document.getElementById("categoryFiltersContainer");
  container.innerHTML = ""; // Clear existing buttons

  // Add "All" button for categories
  const allCategoryButton = document.createElement("button");
  allCategoryButton.textContent = "All";
  allCategoryButton.className = `filter-btn ${
    currentCategory === "all" ? "active" : ""
  }`;
  allCategoryButton.addEventListener("click", () => {
    currentCategory = "all";
    generateAllFilterButtons();
    loadData();
  });
  container.appendChild(allCategoryButton);

  // Add button for each category
  categories.forEach((category) => {
    if (category === "all") return; // Skip "all" as it's already added

    const button = document.createElement("button");
    button.className = `filter-btn ${
      currentCategory === category ? "active" : ""
    }`;
    button.textContent = category;
    button.addEventListener("click", () => {
      currentCategory = category;
      generateAllFilterButtons();
      loadData();
    });
    container.appendChild(button);
  });
}

// Function to generate area filter buttons
function generateAreaFilterButtons() {
  const container = document.getElementById("areaFiltersContainer");
  container.innerHTML = ""; // Clear existing buttons

  // Add "All" button for areas
  const allAreaButton = document.createElement("button");
  allAreaButton.textContent = "All";
  allAreaButton.className = `filter-btn ${
    currentArea === "all" ? "active" : ""
  }`;
  allAreaButton.addEventListener("click", () => {
    currentArea = "all";
    generateAllFilterButtons();
    loadData();
  });
  container.appendChild(allAreaButton);

  // Add button for each area
  areas.forEach((area) => {
    if (area === "all") return;

    const button = document.createElement("button");
    button.className = `filter-btn ${currentArea === area ? "active" : ""}`;
    button.textContent = area;
    button.addEventListener("click", () => {
      currentArea = area;
      generateAllFilterButtons();
      loadData();
    });
    container.appendChild(button);
  });
}

// Main function to execute on page load
async function main() {
  // Generate all filter buttons first
  generateAllFilterButtons();

  // Load saved activities first (if user is signed in)
  if (currentUser) {
    await loadSavedActivitiesFromBackend();
  }

  // Then load data (hearts will now show correct state)
  await loadData();
}

function createEventCard(event) {
  const card = document.createElement("div");
  card.className = "event-card";

  // Create image if available
  if (event.photo) {
    const image = document.createElement("img");
    image.src = event.photo;
    image.className = "event-image";
    image.alt = event.title;
    card.appendChild(image);
  }

  const content = document.createElement("div");
  content.className = "event-content";

  // ... rest of your existing event card content ...
  // Move all your existing content creation into the content div

  card.appendChild(content);
  return card;
}

function processEventData(data) {
  return data.map((row) => ({
    // ... other event properties ...
    photo: row[11] ? row[11].replace("@", "") : null, // Column L (index 11) contains photo URL
  }));
}

// Authentication Functions
async function initializeAuth() {
  // Check if user is already signed in (from localStorage)
  const savedUser = localStorage.getItem("currentUser");
  const token = localStorage.getItem("authToken");

  // Skip auth check for local development (when no backend is available)
  const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  if (!savedUser || !token) {
    if (isLocalDev) {
      // For local development, create a mock user
      currentUser = { userId: 'demo-user', name: 'Demo User' };
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      localStorage.setItem('authToken', 'demo-token');
      updateAuthUI();
      setupEventListeners();
      return;
    } else {
      // Redirect to sign-in page if not authenticated (production)
      window.location.href = "signin.html";
      return;
    }
  }

  currentUser = JSON.parse(savedUser);
  updateAuthUI();

  // Setup event listeners
  setupEventListeners();
}

async function loadSavedActivitiesFromBackend() {
  const token = localStorage.getItem("authToken");
  if (!token) return;

  try {
    const response = await fetch(
      "https://xplore-hk-backend.onrender.com/api/activities/saved",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      // Update local savedActivities set
      savedActivities.clear();
      data.savedActivities.forEach((id) => savedActivities.add(id));

      // Update heart button states if data is already displayed
      updateHeartButtonStates();
    } else {
      console.error("Failed to load saved activities");
    }
  } catch (error) {
    console.error("Error loading saved activities:", error);
  }
}

// Function to update heart button states based on savedActivities
function updateHeartButtonStates() {
  const heartButtons = document.querySelectorAll(".heart-btn");
  heartButtons.forEach((button) => {
    // Get the activity ID from the button's click handler context
    // We need to find the activity ID from the button's parent card
    const card = button.closest(".event-card");
    if (card) {
      // Find the activity ID by looking for the title link
      const titleLink = card.querySelector("h2 a");
      if (titleLink) {
        // We need to match this with our combinedData
        const title = titleLink.textContent;
        const activity = combinedData.find((item) => item.title === title);
        if (activity && activity.id) {
          if (savedActivities.has(activity.id)) {
            button.classList.add("saved");
          } else {
            button.classList.remove("saved");
          }
        }
      }
    }
  });
}

// Add event listeners for auth and navigation
function setupEventListeners() {
  // Add event listeners
  document.getElementById("signOutBtn")?.addEventListener("click", signOut);

  // Bottom navigation
  document
    .getElementById("discoverTab")
    ?.addEventListener("click", () => switchTab("discover"));
  document
    .getElementById("savedTab")
    ?.addEventListener("click", () => switchTab("saved"));
  document
    .getElementById("profileTab")
    ?.addEventListener("click", () => switchTab("profile"));
  document
    .getElementById("exploreFromEmpty")
    ?.addEventListener("click", () => switchTab("discover"));
}

// Tab switching functionality
async function switchTab(tab) {
  const discoverContent = document.getElementById("discoverContent");
  const savedContent = document.getElementById("savedContent");
  const profileContent = document.getElementById("profileContent");
  const discoverTab = document.getElementById("discoverTab");
  const savedTab = document.getElementById("savedTab");
  const profileTab = document.getElementById("profileTab");
  const filtersSection = document.querySelector(".filters-section");

  // Hide all content views
  discoverContent.style.display = "none";
  savedContent.style.display = "none";
  profileContent.style.display = "none";

  // Remove active class from all tabs
  discoverTab.classList.remove("active");
  savedTab.classList.remove("active");
  profileTab.classList.remove("active");

  // Show selected content and activate tab
  if (tab === "discover") {
    discoverContent.style.display = "block";
    discoverTab.classList.add("active");
    filtersSection.style.display = "block";
  } else if (tab === "saved") {
    savedContent.style.display = "block";
    savedTab.classList.add("active");
    filtersSection.style.display = "none";
    await displaySavedActivities();
  } else if (tab === "profile") {
    profileContent.style.display = "block";
    profileTab.classList.add("active");
    filtersSection.style.display = "none";
    updateProfileView();
  }
}

function signOut() {
  currentUser = null;
  savedActivities.clear();
  localStorage.removeItem("currentUser");
  localStorage.removeItem("savedActivities");
  localStorage.removeItem("savedActivitiesData");
  window.location.href = "signin.html";
}

function updateAuthUI() {
  // Update profile view with user info
  updateProfileView();
}

function updateProfileView() {
  const profileUserName = document.getElementById("profileUserName");
  const savedCount = document.getElementById("savedCount");

  if (currentUser && profileUserName) {
    profileUserName.textContent = currentUser.name || currentUser.userId;
  }

  if (savedCount) {
    savedCount.textContent = savedActivities.size;
  }
}

// Saved Activities Functions
async function toggleSavedActivity(activity) {
  if (!currentUser || !activity.id) return;

  const token = localStorage.getItem("authToken");
  if (!token) {
    alert("Please sign in to save activities");
    return;
  }

  const activityId = activity.id; // Use unique ID from Column N

  try {
    const response = await fetch(
      "https://xplore-hk-backend.onrender.com/api/activities/save",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ activityId: activityId }),
      }
    );

    if (response.ok) {
      try {
        const data = await response.json();

        // Update local savedActivities set based on backend response
        if (data.saved) {
          savedActivities.add(activityId);
        } else {
          savedActivities.delete(activityId);
        }

        // Update UI - only update what's necessary
        try {
          if (currentTab === "saved") {
            await displaySavedActivities();
          }
          // Update profile stats if on profile tab
          updateProfileView();
        } catch (uiError) {
          console.error("UI update error:", uiError);
          // Don't show alert for UI errors, heart state is already updated
        }
      } catch (jsonError) {
        console.error("JSON parsing error:", jsonError);
        alert("Response parsing error. Please try again.");
      }
    } else {
      const errorText = await response.text();
      alert("Failed to save activity: " + errorText);
    }
  } catch (error) {
    console.error("Error toggling saved activity:", error);
    console.error("Full error details:", error.message, error.stack);
    alert("Network error: " + error.message + ". Please try again.");
  }
}

async function getSavedActivities() {
  if (!currentUser) return [];

  const token = localStorage.getItem("authToken");
  if (!token) return [];

  try {
    const response = await fetch(
      "https://xplore-hk-backend.onrender.com/api/activities/saved",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();

      // Update local savedActivities set
      savedActivities.clear();
      data.savedActivities.forEach((id) => savedActivities.add(id));

      // Filter combinedData to get full activity objects
      const filtered = combinedData.filter(
        (activity) => activity.id && data.savedActivities.includes(activity.id)
      );

      return filtered;
    } else {
      console.error("Failed to fetch saved activities");
      return [];
    }
  } catch (error) {
    console.error("Error fetching saved activities:", error);
    return [];
  }
}

async function displaySavedActivities() {
  const savedEventList = document.getElementById("savedEventList");
  const emptyState = document.getElementById("emptyState");
  const savedData = await getSavedActivities();

  if (savedData.length === 0) {
    savedEventList.style.display = "none";
    emptyState.style.display = "block";
    return;
  }

  savedEventList.style.display = "block";
  emptyState.style.display = "none";
  savedEventList.innerHTML = "";

  savedData.forEach((activity) => {
    if (!activity) return;

    const card = document.createElement("div");
    card.className = "event-card";

    // Add heart button (always saved on this page)
    if (activity.id) {
      const heartBtn = document.createElement("button");
      heartBtn.className = "heart-btn saved";
      heartBtn.innerHTML = `<i class="fas fa-heart"></i>`;
      heartBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await toggleSavedActivity(activity);
        // Remove card from display
        card.remove();
        // Check if no more saved activities
        const remainingSaved = await getSavedActivities();
        if (remainingSaved.length === 0) {
          await displaySavedActivities();
        }
      });
      card.appendChild(heartBtn);
    }

    // Create image container
    const imageContainer = document.createElement("div");
    imageContainer.className = "event-image-container";

    if (activity.photo) {
      const image = document.createElement("img");
      image.className = "event-image";
      image.alt = activity.title;
      image.src = activity.photo;
      image.onerror = function () {
        image.style.display = "none";
        const defaultIcon = document.createElement("i");
        defaultIcon.className = "fas fa-image event-default-icon";
        imageContainer.appendChild(defaultIcon);
      };
      imageContainer.appendChild(image);
    } else {
      const defaultIcon = document.createElement("i");
      defaultIcon.className = "fas fa-image event-default-icon";
      imageContainer.appendChild(defaultIcon);
    }

    card.appendChild(imageContainer);

    // Create content container
    const content = document.createElement("div");
    content.className = "event-content";

    // Create link
    const eventLink = document.createElement("a");
    eventLink.href = activity.url;
    eventLink.target = "_blank";
    eventLink.style.textDecoration = "none";

    // Add title
    const title = document.createElement("h2");
    title.textContent = activity.title;
    eventLink.appendChild(title);

    // Add date
    const date = document.createElement("p");
    date.innerHTML = `<i class="fas fa-calendar-alt"></i> ${activity.dateStr}`;
    eventLink.appendChild(date);

    // Add venue
    const venue = document.createElement("p");
    venue.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${activity.venue}`;
    eventLink.appendChild(venue);

    // Add cost if available
    if (activity.cost) {
      const cost = document.createElement("p");
      cost.innerHTML = `<i class="fas fa-dollar-sign"></i> ${activity.cost}`;
      cost.className = "event-cost";
      eventLink.appendChild(cost);
    }

    content.appendChild(eventLink);
    card.appendChild(content);
    savedEventList.appendChild(card);
  });
}

// Initialize everything
document.addEventListener("DOMContentLoaded", async function () {
  await initializeAuth();
  // Run main function after auth is initialized
  await main();
});
