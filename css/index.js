let card = document.querySelector(".card");
let boards = Array.from(card.querySelectorAll("li"));

// Set CSS Variable to represent how many list items we have
card.style.setProperty("--boards", boards.length);

// Give each list item an offset for the background-position so the images appear complete across all the list items
boards.forEach((board, i) => {
  board.style.setProperty("--offset-x", -i / boards.length);
});

// If browser supports Pointer Events, allow rotation about Y axis via pointer move, instead of using an infinite animation
const TOTAL_DEGREES = 84;
let clientWidth = window.innerWidth;
let step = TOTAL_DEGREES / clientWidth;
if ("PointerEvent" in window) {
  card.style.animationIterationCount = 2;
  document.body.addEventListener("pointermove", (e) => {
    card.style.setProperty("--angle", `${-42 + e.clientX * step}deg`);
  });
}

// Adjust Pointer Event ratios based on new screen width
window.addEventListener("resize", (e) => {
  clientWidth = window.innerWidth;
  step = TOTAL_DEGREES / clientWidth;
});

function orientIt(e) {
  var amount = e.gamma / 12;
  card.style.setProperty("--angle", `${-e.gamma}deg`);
}

//Support for accelerometer around Y axis (e.g. in your hand facing you tilting it to the left and the right... best when orientationlocked). Disable when pointer events are happening.
if (window.DeviceOrientationEvent) {
  card.style.animationIterationCount = 2;
  if (window.PointerEvent) {
    document.body.addEventListener("pointermove", stopOrientation);
    document.body.addEventListener("pointercancel", startOrientation);
    document.body.addEventListener("pointerleave", startOrientation);
  }
  startOrientation();
}

function stopOrientation(e) {
  window.removeEventListener("deviceorientation", orientIt);
}
function startOrientation(e) {
  window.addEventListener("deviceorientation", orientIt);
}
