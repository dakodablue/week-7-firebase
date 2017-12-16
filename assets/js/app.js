/*jslint esversion: 6, browser: true*/
/*global window, console, $, jQuery, firebase, moment, alert*/

// Initialize Firebase
  var config = {
    apiKey: "AIzaSyCukuhS3YrOIarGaiv7Z7HnOgo1he4mGEU",
    authDomain: "ucb-firebase.firebaseapp.com",
    databaseURL: "https://ucb-firebase.firebaseio.com",
    projectId: "ucb-firebase",
    storageBucket: "ucb-firebase.appspot.com",
    messagingSenderId: "467051167139"
  };
  firebase.initializeApp(config);

// Variable to reference the database.
let db = firebase.database();

// Set elements as jQuery objects
const $tableBody = $('tbody');
var $trainName = $('#train-name');
var $trainDest = $('#train-dest');
var $trainHr = $('#train-hr');
var $trainMin = $('#train-min');
var $trainPer;
var $trainAm = $('#train-am');
var $trainPm = $('#train-pm');
var $freqHrs = $('#freq-hrs');
var $freqMins = $('#freq-mins');
const $trainInput = $('#train-input');
const $trainSubmitBtn = $('#train-input button[type=submit]');
const $trainAddBtn = $('#train-add-btn');
const $trainSaveBtn = $('#train-save-btn');
const $trainCancelBtn = $('#train-cancel-btn');

const editImg = "assets/img/edit.svg";
const delImg = "assets/img/trash.svg";

// Variables to hold image titles
const editTitle = "Click to edit below";
const delTitle = "Click to delete";

// Array to hold data keys / attributes and flag for whether value is an integer or not
let dataKeys = [
  ["trainName", false],
  ["trainDest", false],
  ["trainHr", true],
  ["trainMin", true],
  ["trainPer", true],
  ["freqHrs", true],
  ["freqMins", true]
];

// Variables for input field defaults
let trainHrDef = "6";
let trainMinDef = "0";
let freqHrsDef = "1";
let freqMinsDef = "0";

// Varible to hold name of submit button clicked
let clickedBtn = "";

// Variable to hold whether or not Save button is hidden
let isSaveBtn = false;

// Variables to hold modal components and alerts
const $overlay = $('.overlay');
const $alert = $('#alert');
const $okBtn = $('#ok-btn');
const alerts = [
  "Train frequency must be greater than 0 minutes. Please enter a valid time.",
  "Train frequency must be less than or equal to 24 hours. Please enter a valid time."
];

// Click event to determine which submit button was clicked
$trainSubmitBtn.on('click', function (e) {
  clickedBtn = $(this).attr('name');
});

// Submit event to get and push user input to firebase database. Submit event was used to allow for HTML5 form validation
$trainInput.submit(function (e) {
  e.preventDefault();
  // Before submitting, verify that the frequency entered is valid. If not, show user modal message
  if ($freqHrs.val() === '0' && $freqMins.val() === '0') {
    $alert.text(alerts[0]);
    $overlay.toggle('shake', 400);
  } else if ($freqHrs.val() === '24' && $freqMins.val() > '0') {
    $alert.text(alerts[1]);
    $overlay.toggle('shake', 400);
  } else {
    // If valid, call function to return user input as an object
    let trainObj = getFormInput();
    // Check which submit button was clicked
    if (clickedBtn === 'add') {
      // Merge user input and timestamp objects
      trainObj = Object.assign(trainObj, {
        timestamp: firebase.database.ServerValue.TIMESTAMP
      });
      // Push user input for train into database
      db.ref().push(trainObj);
    } else if (clickedBtn === 'save') {
      // Retrieve key from data attribute
      let key = $trainSaveBtn.attr('data-key');
      // Update user input for edited train into database
      db.ref().child(key).update(trainObj);
    }
    // Call function to reset form passing display styles for buttons
    resetForm('inline-block', 'none');
  }
});

// Cancel button click event to clear and reset form
$trainCancelBtn.on('click', function () {
  // Call function to reset form passing display styles for buttons
  resetForm('inline-block', 'none');
});

$okBtn.on('click', function () {
  $overlay.toggle('fade', 400);
});

// Delete button click event to remove node from firebase and remove element from table
$tableBody.on('click', '.delete', function () {
  // Below function call is made if Save button is NOT hidden
  if (isSaveBtn) {
    // Call function to reset form passing display styles for buttons
    resetForm('inline-block', 'none');
  }
  // Call function to get table row ID that equals node key
  let key = nodeKey($(this));
  // // Query firebase database using key value and remove node
  db.ref().child(key).remove();
  $(`#${key}`).remove();
});

// Edit button click event to load node data back into form for editing
$tableBody.on('click', '.edit', function () {
  // Call function to reset form passing display styles for buttons
  resetForm('none', 'inline-block');
  // Call function to get table row ID that equals node key
  let key = nodeKey($(this));
  // Store key as data attribute on Save button
  $trainSaveBtn.attr('data-key', key);
  // Query firebase database using key value and population form with results
  db.ref().child(key).once('value').then(function (snapshot) {
    let data = snapshot.val();
    $trainName.val(data.trainName);
    $trainDest.val(data.trainDest);
    $trainHr.val(data.trainHr);
    $trainMin.val(data.trainMin);
    $trainAm.prop('checked', data.trainPer === 1 ? true : false);
    $trainPm.prop('checked', data.trainPer === 2 ? true : false);
    $freqHrs.val(data.freqHrs);
    $freqMins.val(data.freqMins);
  });
});

// Event to retrieve firebase train data to populate table
db.ref().orderByChild('timestamp').on('child_added', function (snapshot) {
  // Call function to create table data
  buildHtml(snapshot.key, snapshot.val(), 'create');
// Error handler
}, function (errorObj) {
  console.log("Error handled: " + errorObj.code);
});

// Event to update firebase train node and table data
db.ref().on('child_changed', function (snapshot) {
  // Call function to update table data
  buildHtml(snapshot.key, snapshot.val(), 'update');
// Error handler
}, function (errorObj) {
  console.log("Error handled: " + errorObj.code);
});

// Event to synchronize table data for nodes deleted by other users
db.ref().on('child_removed', function (snapshot) {
  let key = snapshot.key;
  $tableBody.find(`#${key}`).remove();
// Error handler
}, function (errorObj) {
  console.log("Error handled: " + errorObj.code);
});

// Function to get values from the input fields and return as an object
let getFormInput = function () {
  let trainObj = {};
  // This needs to be assigned in the click event or the default value will get stored
  $trainPer = $('[name="train-per"]:checked');
  // Using dataKeys array, loop through each data-attribute, convert value to integer (if applicable), and add to data object
  $.each(dataKeys, function(i, key) {
    let k0 = key[0];
    let k1 = key[1];
    let k2 = '$' + k0;
    let v = window[k2].val();
    if (k1 === true) {
      v = parseInt(v);
    } else {
      v = v.trim();
    }
    trainObj[k0] = v;
  });
  return trainObj;
};

// Function to build and append table row or table data with firebase train data
let buildHtml = function (key, data, type) {
  // Call function to get train's next arrival time
  let nextTrain = nextArrival(data);
  // Call function to get time until arrival
  let arrives = arrivesIn(nextTrain);
  arrives = (arrives.length === 0 ? 'Boarding' : arrives);
  // Function calls to format frequency
  let freq = formatHr(data.freqHrs) + formatMin(data.freqMins);
  let html;
  // Build out table data
  let tableData = 
     `<td data-trainname="${data.trainName}">${data.trainName}</td>
      <td data-traindest="${data.trainDest}">${data.trainDest}</td>
      <td data-freqhrs="${data.freqHrs}" data-freqmins="${data.freqMins}">${freq}</td>
      <td data-trainhr="${data.trainHr}" data-trainmin="${data.trainMin}" data-trainper="${data.trainPer}">${nextTrain}</td>
      <td>${arrives}</td>
      <td>
        <a class="edit" href="#link-to-bottom"><img src="${editImg}" title="${editTitle}" alt=""></a>
        <a class="delete"><img src="${delImg}" title="${delTitle}" alt=""></a>
      </td>`;
  // If train data is new, add new table row
  if (type === 'create') {
    html = 
     `<tr id="${key}">
        ${tableData}
      </tr>`;
    $tableBody.append(html);
  // Else update existing train data in table
  } else {
    html = tableData;
    $tableBody.find(`#${key}`)
      .empty()
      .append(html);
  }
};

// Function to return key assigned to table row element
let nodeKey = function (obj) {
  return obj.parents('tr').attr('id');
};

// Function to calculate train's next arrival time
let nextArrival = function (data) {
  // Switch first train's hour to 24 hour format
  let trainHr = 0;
  if (data.trainHr < 12 && data.trainPer === 2) {
    trainHr = data.trainHr + 12;
  } else if (data.trainHr === 12 && data.trainPer === 1) {
    trainHr = 0;
  } else {
    trainHr = data.trainHr;
  }
  // Set first train time using moment function
  let firstTrain = moment({hours: trainHr, minutes: data.trainMin});
  // While first train time is less than current time, add train frequency
  while (firstTrain.isSameOrBefore(moment(), 'minute')) {
    firstTrain.add({hours: data.freqHrs, minutes: data.freqMins});
  }
  return firstTrain.format('h:mm A');
};

// Function to calculate difference between current time and next arrival time
let arrivesIn = function (nextTrain) {
  // Store difference in minutes
  let delta = moment(nextTrain, 'h:mm A').diff(moment(), 'minutes', true);
  // Round to nearest whole number
  delta = Math.round(delta);
  // If time is negative add a day
  delta = (delta < 0 ? delta + (24 * 60) : delta);
  // Call function to format hours and mins
  delta = formatHr(Math.floor(delta / 60)) + formatMin(delta % 60);
  return delta;
};

// Function to clear or set to default the form's input fields
let resetForm = function (add, save) {
  // Reset input fields
  $trainName.val("");
  $trainDest.val("");
  $trainHr.val(trainHrDef);
  $trainMin.val(trainMinDef);
  $trainAm.prop('checked', true);
  $trainPm.prop('checked', false);
  $freqHrs.val(freqHrsDef);
  $freqMins.val(freqMinsDef);
  
  // Reset form buttons
  $trainAddBtn.css('display', add);
  $trainSaveBtn
    .css('display', save)
    .attr('data-key', '');
  
  // If Add button display is none, Save button state is true
  isSaveBtn = (add === 'none' ? true : false);
};

// Moment timer function with loop to update Next Arrival and Arrives In columns
let timer = moment.duration(1, 'minutes').timer({
  loop: true
}, function () {
  let $tableRows = $('tbody tr');
  // Loop through each row in tbody
  $.each($tableRows, function (i, row) {
    let r = $(row);
    let key = r.attr('id');
    let data = {};
    // Using dataKeys array, loop through each data-attribute, convert value to integer (if applicable), and add to data object
    $.each(dataKeys, function(i, key) {
      let k0 = key[0];
      let k1 = key[1];
      let v = r.find(`[data-${k0}]`).attr(`data-${k0}`);
      data[k0] = (k1 === true ? parseInt(v) : v);
    });
    // Call function to update table data 
    buildHtml(key, data, 'update');
  });
});

// Function to format hour(s) displayed in table
let formatHr = function (hr) {
  switch (hr) {
    case 0:
      return "";
    case 1:
      return hr + ' hr ';
    default:
      return hr + ' hrs ';
  }
};

// Function to format minute(s) displayed in table
let formatMin = function (min) {
  switch (min) {
    case 0:
      return "";
    case 1:
      return min + ' min';
    default:
      return min + ' mins';
  }
};