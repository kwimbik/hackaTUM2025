import { branches, initBranches, resetBranches, splitAllBranches, splitSpecificBranch, addMonthlyWage } from './branches.js';
import { generateRandomEvent, generateLifeAlteringEvent, checkEventTriggers, clearEvents, markerSpacing, getEventDefinition } from './events.js';
import { setupCameraControls, areStickmenVisible, resetCamera, isDragging } from './camera.js';
import { updateStatsTable } from './ui.js';
import { drawTimelineLines, drawMarkers, drawEventMarkers, drawReactions, drawBranchNumbers, updateStickmanPositions } from './rendering.js';

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

// UI Elements
const pauseBtn = document.getElementById("pauseBtn") as HTMLButtonElement;
const resumeBtn = document.getElementById("resumeBtn") as HTMLButtonElement;
const splitAllBtn = document.getElementById("splitAllBtn") as HTMLButtonElement;
const splitOneBtn = document.getElementById("splitOneBtn") as HTMLButtonElement;
const generateEventBtn = document.getElementById("generateEventBtn") as HTMLButtonElement;
const lifeAlteringEventBtn = document.getElementById("lifeAlteringEventBtn") as HTMLButtonElement;
const resetBtn = document.getElementById("resetBtn") as HTMLButtonElement;

// State
let paused = false;
let autoPaused = false;
let timelineOffset = 0;
let lastMonthIndex = -1; // Track which month we're on

const scrollSpeed = 1.0;

// Setup camera controls
setupCameraControls(canvas);

// Pause/Resume handlers
pauseBtn.addEventListener("click", () => {
  paused = true;
  autoPaused = false;
  pauseBtn.disabled = true;
  resumeBtn.disabled = false;
  branches.forEach(branch => {
    branch.stickmanGif.src = "uma_musume.webp";
  });
});

resumeBtn.addEventListener("click", () => {
  paused = false;
  autoPaused = false;
  pauseBtn.disabled = false;
  resumeBtn.disabled = true;
  resetCamera();
  branches.forEach(branch => {
    branch.stickmanGif.src = "stickman_run.gif";
  });
});

// Button handlers
splitAllBtn.addEventListener("click", () => {
  splitAllBranches(timelineOffset);
  updateStatsTable();
});

splitOneBtn.addEventListener("click", () => {
  if (branches.length === 0) return;
  const randomBranch = branches[Math.floor(Math.random() * branches.length)];
  splitSpecificBranch(randomBranch.id, timelineOffset);
  updateStatsTable();
});

generateEventBtn.addEventListener("click", () => {
  generateRandomEvent(timelineOffset);
});

lifeAlteringEventBtn.addEventListener("click", () => {
  generateLifeAlteringEvent(timelineOffset);
});

resetBtn.addEventListener("click", () => {
  resetBranches(timelineOffset);
  clearEvents();
  lastMonthIndex = -1;
  timelineOffset = 0; // Reset time back to January 2025
  updateStatsTable();
});

// Auto-pause when stickmen are off-screen
function checkAutoPause() {
  if (paused) return;
  
  if (!areStickmenVisible(canvas, timelineOffset)) {
    paused = true;
    autoPaused = true;
    pauseBtn.disabled = true;
    resumeBtn.disabled = false;
    branches.forEach(branch => {
      branch.stickmanGif.src = "uma_musume.webp";
    });
  }
}

// Check if a new month has passed and add monthly wage
function checkMonthlyWage() {
  const stickmanWorldX = 200;
  const currentMonthIndex = Math.floor((stickmanWorldX - timelineOffset) / markerSpacing);
  
  if (currentMonthIndex !== lastMonthIndex && lastMonthIndex !== -1) {
    // New month! Add monthly wage to all branches
    addMonthlyWage();
    updateStatsTable();
    console.log(`Month ${currentMonthIndex}: Added monthly wages!`);
  }
  
  lastMonthIndex = currentMonthIndex;
}

// Animation loop
function loop() {
  requestAnimationFrame(loop);

  if (!paused) {
    timelineOffset -= scrollSpeed;
    checkEventTriggers(timelineOffset, updateStatsTable);
    checkMonthlyWage();
  }
  
  if (!isDragging) {
    checkAutoPause();
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawTimelineLines(ctx, canvas, timelineOffset);
  drawMarkers(ctx, canvas, timelineOffset);
  drawEventMarkers(ctx, timelineOffset);
  drawReactions(ctx, timelineOffset);
  drawBranchNumbers(ctx, timelineOffset);
  updateStickmanPositions(timelineOffset);
}

// Initialize and start
initBranches(timelineOffset);
updateStatsTable();
loop();