let currentDataType = "events"; // Default to events
let currentFilter = "all"; // Default filter
let currentCategory = "all"; // Default category
let categories = new Set(); // To store unique categories
let currentArea = "all"; // Default area filter
let areas = new Set(); // To store unique areas

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
  if (currentDataType === "events") {
    categories = new Set();
    areas = new Set();
    categories.add("all");
    areas.add("all");

    // Collect all unique categories and areas
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row.length >= 13 && row[0].trim() === "Y") {
        // Categories (column D)
        const eventCategories = row[3].split(",").map((cat) => cat.trim());
        eventCategories.forEach((cat) => categories.add(cat));

        // Areas (column M)
        const eventAreas = row[12].split(",").map((area) => area.trim());
        eventAreas.forEach((area) => areas.add(area));
      }
    }

    updateCategoryButtons();
    updateAreaButtons();
  }

  const today = new Date();
  const todayString = today.toLocaleDateString("en-GB");

  // Calculate the next Saturday and Sunday
  const nextSaturday = new Date(today);
  nextSaturday.setDate(today.getDate() + (6 - today.getDay()));
  const nextSunday = new Date(nextSaturday);
  nextSunday.setDate(nextSaturday.getDate() + 1);
  const nextSaturdayString = nextSaturday.toLocaleDateString("en-GB");
  const nextSundayString = nextSunday.toLocaleDateString("en-GB");

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row.length >= 13 && row[0].trim() === "Y") {
      const eventDateStr = row[6] ? row[6].trim() : "";
      const eventDates = parseDates(eventDateStr);
      const eventCategories = row[3].split(",").map((cat) => cat.trim());
      const eventAreas = row[12].split(",").map((area) => area.trim());

      // Apply all filters
      if (
        currentFilter === "today" &&
        !eventDates.some(
          (date) => date.toLocaleDateString("en-GB") === todayString
        )
      ) {
        continue;
      }
      if (
        currentFilter === "weekend" &&
        !(
          eventDates.some(
            (date) => date.toLocaleDateString("en-GB") === nextSaturdayString
          ) ||
          eventDates.some(
            (date) => date.toLocaleDateString("en-GB") === nextSundayString
          )
        )
      ) {
        continue;
      }
      if (
        currentCategory !== "all" &&
        !eventCategories.includes(currentCategory)
      ) {
        continue;
      }
      if (currentArea !== "all" && !eventAreas.includes(currentArea)) {
        continue;
      }

      // Create event object
      const eventData = {
        title: row[2],
        date: eventDateStr,
        venue: row[10],
        url: row[5],
        photo: row[11] ? row[11].trim().replace(/^@/, "") : null,
      };

      // Create card element
      const card = document.createElement("div");
      card.className = "event-card";

      // Add image if available
      if (eventData.photo) {
        // Create a container for the image
        const imageContainer = document.createElement("div");
        imageContainer.className = "event-image-container";

        // Create both the direct image and linked image
        const image = document.createElement("img");
        image.className = "event-image";
        image.alt = eventData.title;

        // Create a link wrapper
        const imageLink = document.createElement("a");
        imageLink.href = eventData.photo;
        imageLink.target = "_blank";
        imageLink.textContent = "Click to view image"; // Add text for the link

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

        card.appendChild(imageContainer);
      }

      // Create content container
      const content = document.createElement("div");
      content.className = "event-content";

      // Create link
      const eventLink = document.createElement("a");
      eventLink.href = eventData.url;
      eventLink.target = "_blank";
      eventLink.style.textDecoration = "none";

      // Add title
      const title = document.createElement("h2");
      title.textContent = eventData.title;
      eventLink.appendChild(title);

      // Add date
      const date = document.createElement("p");
      date.innerHTML = `<i class="fas fa-calendar-alt"></i> ${eventData.date}`;
      eventLink.appendChild(date);

      // Add venue
      const venue = document.createElement("p");
      venue.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${eventData.venue}`;
      eventLink.appendChild(venue);

      // Assemble the card
      content.appendChild(eventLink);
      card.appendChild(content);
      eventList.appendChild(card);
    }
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

// Function to load data based on the current selection
async function loadData() {
  const sheetName =
    currentDataType === "events" ? "Event(new)" : "Exhibition(new)";
  const googleSheetData = await fetchGoogleSheet(sheetName);
  displayData(googleSheetData);
}

// Main function to execute on page load
async function main() {
  await loadData();

  // Add event listeners for the toggle buttons
  const eventsButton = document.getElementById("eventsButton");
  const exhibitionsButton = document.getElementById("exhibitionsButton");

  eventsButton.addEventListener("click", function () {
    currentDataType = "events";
    currentCategory = "all";
    currentArea = "all"; // Reset area when switching
    updateActiveToggleButton(this);
    const filterButtonsContainer = document.getElementById(
      "filterButtonsContainer"
    );
    filterButtonsContainer.style.display = "flex";
    loadData();
  });

  exhibitionsButton.addEventListener("click", function () {
    currentDataType = "exhibition";
    currentArea = "all"; // Reset area when switching
    const filterButtonsContainer = document.getElementById(
      "filterButtonsContainer"
    );
    filterButtonsContainer.style.display = "none";
    document.getElementById("categoryFilterContainer").style.display = "none";
    updateActiveToggleButton(this);
    loadData();
  });

  // Initially set the filter buttons visibility based on the current data type
  const filterButtonsContainer = document.getElementById(
    "filterButtonsContainer"
  );
  if (currentDataType === "exhibition") {
    filterButtonsContainer.style.display = "none";
  }

  // Add event listeners for filter buttons
  document.getElementById("todayButton").addEventListener("click", function () {
    currentFilter = "today";
    updateActiveFilterButton(this);
    loadData();
  });

  document
    .getElementById("weekendButton")
    .addEventListener("click", function () {
      currentFilter = "weekend";
      updateActiveFilterButton(this);
      loadData();
    });

  document.getElementById("allButton").addEventListener("click", function () {
    currentFilter = "all";
    updateActiveFilterButton(this);
    loadData();
  });
}

// Function to update active filter button
function updateActiveFilterButton(activeButton) {
  const buttons = document.querySelectorAll(".filter-buttons button");
  buttons.forEach((button) => {
    button.classList.remove("active");
  });
  activeButton.classList.add("active");
}

// Add this new function to handle toggle button states
function updateActiveToggleButton(activeButton) {
  const buttons = document.querySelectorAll(".toggle-button");
  buttons.forEach((button) => {
    button.classList.remove("active");
  });
  activeButton.classList.add("active");
}

// Function to update category buttons
function updateCategoryButtons() {
  const container = document.getElementById("categoryFilterContainer");
  container.innerHTML = ""; // Clear existing buttons

  // Only show category filter for events
  if (currentDataType === "events") {
    container.style.display = "flex";

    // Add "All" button
    const allButton = document.createElement("button");
    allButton.id = "allCategoriesButton";
    allButton.className = `category-button ${
      currentCategory === "all" ? "active" : ""
    }`;
    allButton.textContent = "全部";
    allButton.addEventListener("click", () => {
      currentCategory = "all";
      updateCategoryButtons();
      loadData();
    });
    container.appendChild(allButton);

    // Add button for each category
    categories.forEach((category) => {
      if (category === "all") return; // Skip "all" as it's already added

      const button = document.createElement("button");
      button.className = `category-button ${
        currentCategory === category ? "active" : ""
      }`;
      button.textContent = category;
      button.addEventListener("click", () => {
        currentCategory = category;
        updateCategoryButtons();
        loadData();
      });
      container.appendChild(button);
    });
  } else {
    container.style.display = "none";
  }
}

// Add new function to update area buttons
function updateAreaButtons() {
  const container = document.getElementById("areaFilterContainer");
  container.innerHTML = "";

  if (currentDataType === "events" || currentDataType === "exhibition") {
    container.style.display = "flex";

    // Add "All" button
    const allButton = document.createElement("button");
    allButton.id = "allAreasButton";
    allButton.className = `area-button ${
      currentArea === "all" ? "active" : ""
    }`;
    allButton.textContent = "全部地區";
    allButton.addEventListener("click", () => {
      currentArea = "all";
      updateAreaButtons();
      loadData();
    });
    container.appendChild(allButton);

    // Add button for each area
    areas.forEach((area) => {
      if (area === "all") return;

      const button = document.createElement("button");
      button.className = `area-button ${currentArea === area ? "active" : ""}`;
      button.textContent = area;
      button.addEventListener("click", () => {
        currentArea = area;
        updateAreaButtons();
        loadData();
      });
      container.appendChild(button);
    });
  } else {
    container.style.display = "none";
  }
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

// Run main function
main();
