// Data fetcher for Instagram post generator
// Uses the same Google Sheets API as the main application

const GOOGLE_SHEETS_CONFIG = {
  spreadsheetId: "1G_8RMWjf0T9sNdMxKYy_Fc051I6zhdLLy6ehLak4CX4",
  apiKey: "AIzaSyCPyerGljBK4JJ-XA3aRr5cRvWssI3rwhI",
  sheets: {
    formatting: "formatting",
  },
};

/**
 * Fetch data from Google Sheets
 * @param {string} sheetName - Name of the sheet to fetch
 * @returns {Promise<Array>} Array of rows from the sheet
 */
async function fetchGoogleSheet(sheetName) {
  const sheetLink = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.spreadsheetId}/values/${sheetName}/?key=${GOOGLE_SHEETS_CONFIG.apiKey}`;

  try {
    const response = await fetch(sheetLink);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.values || [];
  } catch (error) {
    console.error("Error fetching data:", error);
    return [];
  }
}

/**
 * Parse various date formats and return a list of dates
 * @param {string} dateStr - Date string to parse
 * @returns {Array<Date>} Array of parsed dates
 */
function parseDates(dateStr) {
  const dates = [];
  const year = new Date().getFullYear();

  if (!dateStr || dateStr.trim() === "") {
    return dates;
  }

  const dateParts = dateStr.split(",").map((part) => part.trim());

  for (const part of dateParts) {
    if (part.startsWith("till ")) {
      const datePart = part.substring(5).trim();
      const [day, month] = datePart.split("/").map(Number);
      const endDate = new Date(year, month - 1, day);

      for (let d = new Date(); d <= endDate; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
      }
    } else if (part.includes("-")) {
      const [start, end] = part
        .split("-")
        .map((date) => date.trim().split("/").map(Number));
      const startDate = new Date(year, start[1] - 1, start[0]);
      const endDate = new Date(year, end[1] - 1, end[0]);

      for (let d = startDate; d <= endDate; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
      }
    } else {
      const [day, month] = part.split("/").map(Number);
      dates.push(new Date(year, month - 1, day));
    }
  }

  return dates;
}

/**
 * Parse exhibition date formats and return availability dates
 * @param {string} dateStr - Date string to parse
 * @returns {Array<Date>} Array of availability dates
 */
function parseExhibitionDates(dateStr) {
  if (!dateStr || dateStr.trim() === "") {
    const today = new Date();
    const dates = [];
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
  const normalizedDateStr = dateStr.trim();

  if (normalizedDateStr.startsWith("till ")) {
    const datePart = normalizedDateStr.substring(5).trim();
    const [day, month] = datePart.split("/").map(Number);
    const endDate = new Date(year, month - 1, day);

    for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }
  } else if (normalizedDateStr.includes("-")) {
    const [startPart, endPart] = normalizedDateStr
      .split("-")
      .map((s) => s.trim());
    const [startDay, startMonth] = startPart.split("/").map(Number);
    const [endDay, endMonth] = endPart.split("/").map(Number);

    const startDate = new Date(year, startMonth - 1, startDay);
    const endDate = new Date(year, endMonth - 1, endDay);

    for (let d = startDate; d <= endDate; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }
  } else {
    try {
      const [day, month] = normalizedDateStr.split("/").map(Number);
      dates.push(new Date(year, month - 1, day));
    } catch (error) {
      console.warn("Could not parse exhibition date:", normalizedDateStr);
      for (let i = 0; i < 365; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        dates.push(date);
      }
    }
  }

  return dates;
}

/**
 * Load and process all data from Google Sheets formatting tab
 * @returns {Promise<Array>} Processed activities from formatting sheet
 */
async function loadAllData() {
  try {
    console.log("Fetching data from formatting sheet...");
    const formattingData = await fetchGoogleSheet(
      GOOGLE_SHEETS_CONFIG.sheets.formatting
    );

    console.log("Raw formatting data:", formattingData);
    console.log(
      "Number of rows in formatting sheet:",
      formattingData ? formattingData.length : 0
    );

    const processedData = [];

    // Process formatting sheet data
    if (formattingData && formattingData.length > 1) {
      console.log("Processing formatting sheet data...");

      for (let i = 1; i < formattingData.length; i++) {
        const row = formattingData[i];
        console.log(`Row ${i}:`, row);

        // Check if row has enough columns (at least 6 for your structure including column F)
        if (row.length >= 6) {
          console.log(`Row ${i} - Event name (${row[0]}):`, row[0]);
          console.log(`Row ${i} - Category (${row[1]}):`, row[1]);
          console.log(`Row ${i} - Organizer (${row[2]}):`, row[2]);
          console.log(`Row ${i} - Date (${row[3]}):`, row[3]);
          console.log(`Row ${i} - Location (${row[4]}):`, row[4]);
          console.log(`Row ${i} - Category Order (${row[5]}):`, row[5]);

          // Process all rows (no "Y" filter needed for your structure)
          if (row[0] && row[0].trim() !== "") {
            console.log(`Processing row ${i} - Title: ${row[0]}`);

            const eventDateStr = row[3] ? row[3].trim() : "";
            const eventDates = parseDates(eventDateStr);
            const eventCategories = row[1] ? [row[1].trim()] : [];
            const eventAreas = []; // No area data in your structure
            const categoryOrder = row[5] ? parseInt(row[5].trim()) : 999; // Column F for ordering

            const activity = {
              id: `formatting_${i}`, // Generate ID based on row number
              title: row[0].trim(),
              dateStr: eventDateStr,
              dates: eventDates,
              venue: row[4] ? row[4].trim() : "",
              organization: row[2] ? row[2].trim() : "", // Organizer from column C
              cost: null, // No cost data in your structure
              url: null, // No URL data in your structure
              photo: null, // No photo data in your structure
              categories: eventCategories,
              areas: eventAreas,
              categoryOrder: categoryOrder, // Add category order from column F
              isExhibition: false,
              type: "activity",
            };

            console.log(`Added activity:`, activity);
            processedData.push(activity);
          } else {
            console.log(`Row ${i} skipped - no event name`);
          }
        } else {
          console.log(`Row ${i} skipped - not enough columns:`, row.length);
        }
      }
    } else {
      console.log("No data to process or insufficient rows");
    }

    console.log("Total processed activities:", processedData.length);
    return processedData;
  } catch (error) {
    console.error("Error loading data:", error);
    return [];
  }
}

/**
 * Get activities for a specific week
 * @param {Date} weekStart - Start date of the week
 * @param {Date} weekEnd - End date of the week
 * @returns {Promise<Array>} Activities happening in the specified week
 */
async function getWeeklyActivities(weekStart, weekEnd) {
  const allData = await loadAllData();

  return allData.filter((activity) => {
    return activity.dates.some((date) => {
      return date >= weekStart && date <= weekEnd;
    });
  });
}

/**
 * Group activities by category
 * @param {Array} activities - Array of activities
 * @returns {Object} Activities grouped by category
 */
function groupByCategory(activities) {
  const grouped = {};

  activities.forEach((activity) => {
    activity.categories.forEach((category) => {
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(activity);
    });
  });

  return grouped;
}

/**
 * Get activities for a specific category
 * @param {string} category - Category name
 * @param {Date} weekStart - Start date of the week
 * @param {Date} weekEnd - End date of the week
 * @returns {Promise<Array>} Activities in the category for the specified week
 */
async function getCategoryActivities(category, weekStart, weekEnd) {
  const weeklyActivities = await getWeeklyActivities(weekStart, weekEnd);

  return weeklyActivities.filter((activity) => {
    return activity.categories.includes(category);
  });
}

// Export functions for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    loadAllData,
    getWeeklyActivities,
    groupByCategory,
    getCategoryActivities,
    parseDates,
    parseExhibitionDates,
  };
}
