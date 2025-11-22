import { branches, initBranches, resetBranches, splitAllBranches, splitSpecificBranch, addMonthlyWage, setOnboardingData, OnboardingData } from './branches.js';
import { generateRandomEvent, generateLifeAlteringEvent, checkEventTriggers, clearEvents, markerSpacing, getEventDefinition, generateEventFromAPI, applyQueuedEvents } from './events.js';
import { setupCameraControls, areStickmenVisible, resetCamera, isDragging } from './camera.js';
import { updateStatsTable } from './ui.js';
import { drawTimelineLines, drawMarkers, drawEventMarkers, drawReactions, drawBranchNumbers, updateStickmanPositions } from './rendering.js';
import { startPolling, stopPolling, mapFamilyStatus, ExternalEvent } from './apiClient.js';

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const canvasContainer = document.querySelector(".canvas-container") as HTMLElement | null;

// UI Elements
const pauseBtn = document.getElementById("pauseBtn") as HTMLButtonElement;
const resumeBtn = document.getElementById("resumeBtn") as HTMLButtonElement;
const splitAllBtn = document.getElementById("splitAllBtn") as HTMLButtonElement;
const splitOneBtn = document.getElementById("splitOneBtn") as HTMLButtonElement;
const generateEventBtn = document.getElementById("generateEventBtn") as HTMLButtonElement;
const lifeAlteringEventBtn = document.getElementById("lifeAlteringEventBtn") as HTMLButtonElement;
const resetBtn = document.getElementById("resetBtn") as HTMLButtonElement;
const preScreen = document.querySelector(".pre-screen") as HTMLElement | null;
const ctaBtn = document.querySelector(".cta-btn") as HTMLButtonElement | null;
const countdownOverlay = document.getElementById("countdownOverlay") as HTMLElement | null;
const countdownValue = document.getElementById("countdownValue") as HTMLElement | null;
const bottomCurtain = document.getElementById("bottomCurtain") as HTMLElement | null;
const simulationShell = document.getElementById("simulationShell") as HTMLElement | null;

// State
let paused = true;
let autoPaused = false;
let timelineOffset = 0;
let lastMonthIndex = -1; // Track which month we're on
let revealStarted = false;
let simulationStarted = false;

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
  // Apply queued events for all branches
  for (const branch of branches) {
    applyQueuedEvents(branch.id, timelineOffset);
  }
  updateStatsTable();
});

splitOneBtn.addEventListener("click", () => {
  if (branches.length === 0) return;
  const randomBranch = branches[Math.floor(Math.random() * branches.length)];
  const branchIdsBefore = branches.map(b => b.id);
  splitSpecificBranch(randomBranch.id, timelineOffset);
  // Apply queued events for newly created branches
  const newBranches = branches.filter(b => branchIdsBefore.indexOf(b.id) === -1);
  for (const branch of newBranches) {
    applyQueuedEvents(branch.id, timelineOffset);
  }
  // Also check the original branch
  applyQueuedEvents(randomBranch.id, timelineOffset);
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

function resizeCanvas() {
  if (canvasContainer) {
    const containerWidth = canvasContainer.clientWidth;
    const containerHeight = canvasContainer.clientHeight;
    canvas.width = Math.max(800, containerWidth);
    canvas.height = Math.max(480, containerHeight);
  } else {
    canvas.width = window.innerWidth - 60;
    canvas.height = Math.max(480, Math.floor(window.innerHeight * 0.68));
  }
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

function finalizeReveal() {
  if (preScreen) {
    preScreen.classList.add("pre-screen--collapsed");
  }
  if (bottomCurtain) {
    bottomCurtain.classList.add("hidden");
  }
  simulationStarted = true;
  paused = false;
}

function startRevealAnimation() {
  if (revealStarted) return;
  revealStarted = true;
  paused = true;
  if (ctaBtn) {
    ctaBtn.disabled = true;
  }
  
  // Capture form data before hiding pre-screen
  const form = document.querySelector('.hero-form') as HTMLFormElement;
  if (form) {
    const formData = new FormData(form);
    const onboardingData: OnboardingData = {
      loanType: formData.get('loanType') as string || 'fixed',
      loanYears: parseInt(formData.get('loanYears') as string || '25'),
      age: parseInt(formData.get('age') as string || '30'),
      education: formData.get('education') as string || 'bachelor',
      familyStatus: formData.get('familyStatus') as string || 'single',
      careerLength: parseInt(formData.get('careerLength') as string || '5')
    };
    
    console.log('📋 Captured onboarding data:', onboardingData);
    setOnboardingData(onboardingData);
  }
  
  if (preScreen) {
    preScreen.style.display = "none";
  }
  if (!countdownOverlay || !countdownValue) {
    finalizeReveal();
    return;
  }

  countdownOverlay.classList.add("visible");
  let count = 3;

  const tick = () => {
    if (!countdownValue) return;
    if (count > 0) {
      countdownValue.textContent = count.toString();
      count -= 1;
      setTimeout(tick, 1000);
    } else {
      countdownValue.textContent = "GO!";
      setTimeout(() => {
        countdownOverlay.classList.remove("visible");
        countdownValue.textContent = "";
        finalizeReveal();
      }, 700);
    }
  };

  tick();
}

ctaBtn?.addEventListener("click", startRevealAnimation);

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

  if (simulationStarted && !paused) {
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

// Handle events from external API
function handleExternalEvent(event: ExternalEvent) {
  console.log(`📨 Processing external event: ${event.text}`);
  
  const { data } = event;
  
  // Prepare API data to be applied when event triggers (not immediately)
  const apiData = {
    monthlyWage: data.current_income / 12, // Convert annual to monthly
    maritalStatus: mapFamilyStatus(data.family_status),
    childCount: data.children
  };
  
  console.log(`✓ Event data queued to apply when stickman reaches it:`);
  console.log(`  - Monthly Wage: ${apiData.monthlyWage}`);
  console.log(`  - Marital Status: ${apiData.maritalStatus}`);
  console.log(`  - Children: ${apiData.childCount}`);
  
  // Determine target branch (default to 0 if not specified)
  const targetBranchId = data.branchId !== undefined ? data.branchId : 0;
  console.log(`  - Target Branch: #${targetBranchId}`);
  
  // Generate the event on the timeline with API data
  const eventGenerated = generateEventFromAPI(
    data.recent_event,
    data.year,
    data.month,
    targetBranchId, // Use branchId from API request
    timelineOffset,
    apiData // Pass data to be applied when event triggers
  );
  
  if (eventGenerated) {
    console.log(`✓ Event "${data.recent_event}" added to timeline at ${data.year}-${data.month}`);
  } else {
    console.warn(`Failed to generate event "${data.recent_event}" - may be in the past or invalid`);
  }
}

// Start polling for external events from API
startPolling(handleExternalEvent);
console.log('🔗 API integration enabled - listening for external events');

loop();