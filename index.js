var request = new XMLHttpRequest();
var csvData = new Array();
var numList = new Array();
var day = 60 * 60 * 24 * 1000;
var date = new Date();
var today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
var pointer = 0;

var beginDate = today;
var week = new Array();
for (i = 0; i <= (7 - today.getDay()) % 7; i++) {
  week.push(beginDate);
  beginDate = new Date(beginDate.getTime() + day);
}

function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

const selector = getQueryParam("value");
console.log(selector);

function processData(data) {
  const dataArray = [];
  let element = "";
  let withinQuotes = false;

  for (let i = 0; i < data.length; i++) {
    const char = data[i];

    if (char === "," && !withinQuotes) {
      dataArray.push(element.trim().replace(/^"|"$/g, ""));
      element = "";
    } else {
      element += char;

      if (char === '"') {
        withinQuotes = !withinQuotes;
      }
    }
  }
  dataArray.push(element.trim().replace(/^"|"$/g, ""));
  return dataArray;
}

function processFile(fileName) {
  request.open("GET", fileName, false);
  request.send(null);
  var jsonObject = request.responseText.split(/\r?\n|\r/);

  for (var i = 1; i < jsonObject.length; i++) {
    const dataArray = processData(jsonObject[i]);
    if (dataArray[0] === "Y") {
      csvData.push(dataArray);
    }
  }
}

processFile("event.csv");
processFile("exhibition.csv");

function showEvent(n) {
  if (csvData[n][11].length > 0) {
    $(".eventImg").attr("src", "img/" + csvData[n][11] + ".jpg");
  } else {
    if (csvData[n][3].length > 0) {
      $(".eventImg").attr("src", "img/standard/" + csvData[n][3] + ".png");
    } else {
      $(".eventImg").attr("src", "img/standard/17. 其他.png");
    }
  }

  if (csvData[n][1] === "Free") {
    $(".free").show();
  } else {
    $(".free").hide();
  }

  $(".name").text(csvData[n][2]);

  if (csvData[n][6].length > 0) {
    $(".date-emojii").show();
    $(".date").text(csvData[n][6]);
  } else {
    $(".date-emojii").hide();
    $(".date").text("");
  }

  if (csvData[n][10].length > 0) {
    $(".location-emojii").show();
    $(".location").text(csvData[n][10]);
  } else {
    $(".location-emojii").hide();
    $(".location").text("");
  }

  if (csvData[n][5].length > 0) {
    $(".link").attr("href", csvData[n][5]);
  } else {
    $(".link").attr("href", "https://www.instagram.com/" + csvData[n][4]);
  }
}

function strToDate(str) {
  return new Date(
    2024,
    parseInt(str.split("/")[1]) - 1,
    parseInt(str.split("/")[0])
  );
}

function dateStrToArray(dateStr) {
  var dateList = [];
  if (dateStr.includes("till")) {
    var beginDate = today;
    var endDate = strToDate(dateStr.split(" ")[1]);
    while (beginDate <= endDate) {
      dateList.push(beginDate);
      beginDate = new Date(beginDate.getTime() + day);
    }
  } else {
    tempList = dateStr.split(",");
    for (i = 0; i < tempList.length; i++) {
      if (tempList[i].includes("-") === false) {
        dateList.push(strToDate(tempList[i]));
      } else {
        var beginDate = strToDate(tempList[i].split("-")[0]);
        var endDate = strToDate(tempList[i].split("-")[1]);

        while (beginDate <= endDate) {
          dateList.push(beginDate);
          beginDate = new Date(beginDate.getTime() + day);
        }
      }
    }
  }
  return dateList;
}

function includeDate(dateList, date) {
  for (i = 0; i < dateList.length; i++) {
    if (date.getTime() == dateList[i].getTime()) {
      return true;
    }
  }
  return false;
}

function includeWeek(dateList, week) {
  for (i = 0; i < week.length; i++) {
    for (j = 0; j < dateList.length; j++) {
      if (week[i].getTime() == dateList[j].getTime()) {
        return true;
      }
    }
  }
  return false;
}

function selectEvent(selector) {
  if (selector === "all") {
    var randNum = Math.floor(Math.random() * csvData.length);
    var isExhibition = csvData[randNum][3];
    while (isExhibition == "exhibition") {
      var randNum = Math.floor(Math.random() * csvData.length);
      var isExhibition = csvData[randNum][3];
    }
  } else {
    if (selector == "today") {
      var randNum = Math.floor(Math.random() * csvData.length);
      var dateList = dateStrToArray(csvData[randNum][6]);
      var isExhibition = csvData[randNum][3];
      while (
        includeDate(dateList, today) == false ||
        isExhibition == "exhibition"
      ) {
        var randNum = Math.floor(Math.random() * csvData.length);
        var dateList = dateStrToArray(csvData[randNum][6]);
        var isExhibition = csvData[randNum][3];
      }
    } else {
      if (selector == "exhibition") {
        var randNum = Math.floor(Math.random() * csvData.length);
        var isExhibition = csvData[randNum][3];
        while (isExhibition != "exhibition") {
          var randNum = Math.floor(Math.random() * csvData.length);
          var isExhibition = csvData[randNum][3];
        }
      }
    }
  }
  return randNum;
}

function initialize(selector) {
  console.log(selector);
  numList = new Array();
  var eventIndex = selectEvent(selector);
  numList.push(eventIndex);
  showEvent(eventIndex);
}

initialize(selector);

$(".next").on("click", function () {
  var eventIndex = selectEvent(selector);
  numList.push(eventIndex);
  showEvent(eventIndex);
});

$(".prev").on("click", function () {
  if (numList.length > 1) {
    numList.pop();
    showEvent(numList[numList.length - 1]);
  }
});

console.log(csvData);
