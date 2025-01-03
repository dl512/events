let currentDataType = "events"; // Default to events
let currentFilter = "all"; // Default filter

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

  const today = new Date();
  const todayString = today.toLocaleDateString("en-GB"); // Format as DD/MM

  // Calculate the next Saturday and Sunday
  const nextSaturday = new Date(today);
  nextSaturday.setDate(today.getDate() + (6 - today.getDay()));

  const nextSunday = new Date(nextSaturday);
  nextSunday.setDate(nextSaturday.getDate() + 1);

  const nextSaturdayString = nextSaturday.toLocaleDateString("en-GB");
  const nextSundayString = nextSunday.toLocaleDateString("en-GB");

  // console.log(
  //   `Next Saturday: ${nextSaturdayString}, Next Sunday: ${nextSundayString}`
  // );

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row.length >= 7 && row[0].trim() === "Y") {
      // Ensure there are enough columns
      const eventDateStr = row[6] ? row[6].trim() : ""; // Date in the CSV (7th column)
      const eventDates = parseDates(eventDateStr); // Get all dates covered by this event

      // Log the original date string and parsed dates
      // console.log(`Original Date String for row ${i}: "${eventDateStr}"`);
      // console.log(
      //   `Parsed Event Dates for row ${i}: ${eventDates
      //     .map((date) => date.toLocaleDateString("en-GB"))
      //     .join(", ")}`
      // );

      // Filter based on selected criteria
      if (
        currentFilter === "today" &&
        !eventDates.some(
          (date) => date.toLocaleDateString("en-GB") === todayString
        )
      ) {
        continue; // Skip if today is not in the list
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
        continue; // Skip if next Saturday and Sunday are not both in the list
      }

      const eventDiv = document.createElement("div");
      eventDiv.classList.add("event");

      const eventLink = document.createElement("a");
      eventLink.href = row[5]; // URL from the sixth column
      eventLink.target = "_blank"; // Open link in a new tab
      eventLink.style.textDecoration = "none"; // Remove underline

      const title = document.createElement("h2");
      title.textContent = row[2]; // Title (third column)

      const date = document.createElement("p");
      date.innerHTML = `<i class="fas fa-calendar-alt"></i> ${eventDateStr}`; // Display the original date string

      const venue = document.createElement("p");
      venue.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${row[10]}`; // Venue (fifth column)

      // Append elements to the link
      eventLink.appendChild(title);
      eventLink.appendChild(date);
      eventLink.appendChild(venue);
      eventDiv.appendChild(eventLink);
      eventList.appendChild(eventDiv);
    }
  }

  // If no events are displayed, log a message
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

  // Add event listener to the toggle switch
  document
    .getElementById("toggleSwitch")
    .addEventListener("change", function () {
      currentDataType = this.checked ? "exhibition" : "events";
      document.getElementById("toggleLabel").textContent = this.checked
        ? "睇展覽"
        : "搵活動";
      loadData();

      // Show or hide filter buttons based on current data type
      const filterButtonsContainer = document.getElementById(
        "filterButtonsContainer"
      );
      if (currentDataType === "exhibition") {
        filterButtonsContainer.style.display = "none"; // Hide filter buttons
      } else {
        filterButtonsContainer.style.display = "flex"; // Show filter buttons for events
      }
    });

  // Initially set the filter buttons visibility based on the current data type
  const filterButtonsContainer = document.getElementById(
    "filterButtonsContainer"
  );
  if (currentDataType === "exhibition") {
    filterButtonsContainer.style.display = "none"; // Hide on load if exhibitions are selected
  }

  // Add event listeners for filter buttons only if current data type is events
  if (currentDataType === "events") {
    document
      .getElementById("todayButton")
      .addEventListener("click", function () {
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
}

// Function to update active filter button
function updateActiveFilterButton(activeButton) {
  const buttons = document.querySelectorAll(".filter-buttons button");
  buttons.forEach((button) => {
    button.classList.remove("active");
  });
  activeButton.classList.add("active");
}

// Run main function
main();
