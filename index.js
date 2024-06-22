var request = new XMLHttpRequest();
var csvData = new Array();
var numList = new Array();

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
    if (dataArray[0] === "Y" && dataArray[1] === "Free") {
      csvData.push(dataArray);
    }
  }
}
processFile("event.csv");
processFile("exhibition.csv");

function showEvent(n) {
  $("img").attr("src", "img/" + csvData[n][11] + ".jpg");
  $(".name").text(csvData[n][2]);
  $(".date").text(csvData[n][6]);
  $(".location").text(csvData[n][10]);
  $(".link").attr("href", csvData[n][5]);
}

function initialize() {
  var randNum = Math.floor(Math.random() * csvData.length);
  numList.push(randNum);
  var pointer = 0;
  showEvent(numList[pointer]);
}

initialize();

$(".next").on("click", function () {
  randNum = Math.floor(Math.random() * csvData.length);
  numList.push(randNum);
  showEvent(randNum);
});

$(".prev").on("click", function () {
  if (numList.length > 1) {
    numList.pop();
    showEvent(numList[numList.length - 1]);
  }
});

console.log(csvData);
