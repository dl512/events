let currentFilter = "all"; // Default filter (can be "all" or a specific date string)
let currentCategory = "all"; // Default category
let categories = new Set(); // To store unique categories
let currentArea = "all"; // Default area filter
let areas = new Set(); // To store unique areas
let combinedData = []; // To store combined events and exhibitions data

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
      url: item.url,
      photo: item.photo,
    };

    // Create card element
    const card = document.createElement("div");
    card.className = "event-card";

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
        if (row.length >= 13 && row[0].trim() === "Y") {
          const eventDateStr = row[6] ? row[6].trim() : "";
          const eventDates = parseDates(eventDateStr);
          const eventCategories = row[3].split(",").map((cat) => cat.trim());
          const eventAreas = row[12].split(",").map((area) => area.trim());

          processedEvents.push({
            title: row[2],
            dateStr: eventDateStr,
            dates: eventDates,
            venue: row[10],
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
        if (row.length >= 13 && row[0].trim() === "Y") {
          const exhibitionDateStr = row[6] ? row[6].trim() : "";
          const exhibitionDates = parseExhibitionDates(exhibitionDateStr);
          const exhibitionAreas = row[12]
            ? row[12].split(",").map((area) => area.trim())
            : [];

          processedExhibitions.push({
            title: row[2],
            dateStr: exhibitionDateStr,
            dates: exhibitionDates, // Now exhibitions have proper date availability
            venue: row[10],
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

  // Then load data
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

// Run main function
main();
