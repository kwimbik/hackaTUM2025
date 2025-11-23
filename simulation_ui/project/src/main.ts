import { branches, initBranches, resetBranches, splitAllBranches, splitSpecificBranch, addMonthlyWage, setOnboardingData, OnboardingData } from './branches.js';
import { generateRandomEvent, generateLifeAlteringEvent, checkEventTriggers, clearEvents, markerSpacing, getEventDefinition, generateEventFromAPI, processQueuedEvents } from './events.js';
import { setupCameraControls, areStickmenVisible, resetCamera, isDragging } from './camera.js';
import { updateStatsTable } from './ui.js';
import { drawTimelineLines, drawMarkers, drawEventMarkers, drawReactions, drawBranchNumbers, updateStickmanPositions } from './rendering.js';
import { startPolling, stopPolling, mapFamilyStatus, ExternalEvent } from './apiClient.js';
import { BackgroundAudioPlayer } from './audioPlayer.js';

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
const speedSlider = document.getElementById("speedSlider") as HTMLInputElement | null;
const speedValue = document.getElementById("speedValue") as HTMLElement | null;
const endScreen = document.getElementById("endScreen") as HTMLElement | null;
const endSubtitle = document.getElementById("endSubtitle") as HTMLElement | null;
const winningBadge = document.getElementById("winningBadge") as HTMLElement | null;
const scoreRows = document.getElementById("scoreRows") as HTMLElement | null;
const restartBtn = document.getElementById("restartBtn") as HTMLButtonElement | null;

// State
let paused = true;
let autoPaused = false;
let timelineOffset = 0;
let lastMonthIndex = -1; // Track which month we're on
let revealStarted = false;
let simulationStarted = false;

let scrollSpeed = 1.0;
let maxMonths = 30; // default fallback if backend config is unavailable
let endScreenShown = false;

function getCurrentMonthIndex(): number {
  const stickmanWorldX = 200;
  return Math.floor((stickmanWorldX - timelineOffset) / markerSpacing);
}

function publishDebugState() {
  (window as any).stickmanState = {
    timelineOffset,
    monthIndex: getCurrentMonthIndex(),
    paused,
    scrollSpeed,
    maxMonths,
    endScreenShown
  };
}

async function loadSimulationConfig() {
  try {
    const response = await fetch("http://localhost:3000/api/config");
    if (!response.ok) {
      console.warn(`Failed to load config, status ${response.status}`);
      return;
    }
    const data = await response.json();
    if (typeof data.num_layers === "number" && !Number.isNaN(data.num_layers)) {
      maxMonths = data.num_layers;
      console.log(`Loaded num_layers from backend: ${maxMonths}`);
    }
  } catch (error) {
    console.warn("Unable to fetch simulation config; using default maxMonths", error);
  }
}
loadSimulationConfig();

function formatCurrency(value: number): string {
  if (!isFinite(value)) return "-";
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function renderFinalScoreboard() {
  if (!scoreRows) return;
  scoreRows.innerHTML = "";
  const sorted = [...branches]
    .sort((a, b) => (b.money ?? 0) - (a.money ?? 0))
    .slice(0, 9);
  sorted.forEach((branch, idx) => {
    const row = document.createElement("div");
    row.className = "score-row";
    const loan = branch.currentLoan ?? 0;
    const wage = branch.monthlyWage ?? 0;
    const kids = branch.childCount ?? 0;
    const status = branch.maritalStatus || "Single";
    row.innerHTML = `
      <div class="score-rank">${idx + 1}</div>
      <div>
        <div class="score-name">
          <span>${branch.name}</span>
          ${idx === 0 ? '<span class="score-winning">Top player</span>' : ''}
        </div>
        <div class="score-metrics">
          <div class="score-metric">
            <span>Money</span>
            <strong>${formatCurrency(branch.money || 0)}</strong>
          </div>
          <div class="score-metric">
            <span>Monthly wage</span>
            <strong>${formatCurrency(wage)}</strong>
          </div>
          <div class="score-metric">
            <span>Loan</span>
            <strong>${formatCurrency(loan)}</strong>
          </div>
          <div class="score-metric">
            <span>Family</span>
            <strong>${status}${kids > 0 ? ` | ${kids} kid${kids > 1 ? "s" : ""}` : ""}</strong>
          </div>
        </div>
      </div>
    `;
    scoreRows.appendChild(row);
  });

  if (winningBadge) {
    if (sorted.length > 0) {
      winningBadge.style.display = "inline-flex";
      winningBadge.textContent = `${sorted[0].name} leads`;
    } else {
      winningBadge.style.display = "none";
    }
  }
}

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
  // Queued events will be processed automatically in render loop
  updateStatsTable();
});

splitOneBtn.addEventListener("click", () => {
  if (branches.length === 0) return;
  const randomBranch = branches[Math.floor(Math.random() * branches.length)];
  splitSpecificBranch(randomBranch.id, timelineOffset);
  // Queued events will be processed automatically in render loop
  updateStatsTable();
});

generateEventBtn.addEventListener("click", () => {
  generateRandomEvent(timelineOffset);
});

lifeAlteringEventBtn.addEventListener("click", () => {
  generateLifeAlteringEvent(timelineOffset);
});

resetBtn.addEventListener("click", () => {
  resetSimulation();
});

// Speed control
speedSlider?.addEventListener("input", () => {
  const value = parseFloat(speedSlider.value);
  scrollSpeed = isNaN(value) ? 1.0 : value;
  if (speedValue) {
    speedValue.textContent = `${scrollSpeed.toFixed(1)}x`;
  }
});
if (speedValue && speedSlider) {
  speedValue.textContent = `${parseFloat(speedSlider.value || "1").toFixed(1)}x`;
}

function resetSimulation() {
  paused = true;
  autoPaused = false;
  endScreenShown = false;
  simulationStarted = false;
  revealStarted = false;
  lastMonthIndex = -1;
  timelineOffset = 0; // Reset time back to January 2025
  clearEvents();
  resetBranches(timelineOffset);
  updateStatsTable();
  if (endScreen) {
    endScreen.classList.add("hidden");
  }
  if (scoreRows) {
    scoreRows.innerHTML = "";
  }
  if (winningBadge) {
    winningBadge.style.display = "none";
  }
  if (resumeBtn) {
    resumeBtn.disabled = false;
  }
  if (pauseBtn) {
    pauseBtn.disabled = true;
  }
}

restartBtn?.addEventListener("click", () => {
  resetSimulation();
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

  // Start the animation loop NOW (after countdown, events are queued)
  loop();

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

async function triggerBackendRun() {
  try {
    const response = await fetch("http://localhost:3000/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      console.warn(`Backend run failed: ${response.status}`);
    } else {
      const data = await response.json();
      console.log("Backend simulation run result:", data);
    }
  } catch (err) {
    console.warn("Unable to trigger backend run from UI:", err);
  }
}

async function handleCtaClick() {
  if (revealStarted) return;
  // Fire-and-forget backend run; do not block the countdown
  triggerBackendRun();
  startRevealAnimation();
}

ctaBtn?.addEventListener("click", handleCtaClick);

function showEndScreen() {
  if (endScreenShown) return;
  endScreenShown = true;
  paused = true;
  autoPaused = false;
  if (endSubtitle) {
    endSubtitle.textContent = `Simulated ${maxMonths} months. Restart to run again.`;
  }
  // Render final stats before revealing
  renderFinalScoreboard();
  if (endScreen) {
    endScreen.classList.remove("hidden");
  }
}

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
    const monthsElapsed = getCurrentMonthIndex() + 1;
    if (!endScreenShown && monthsElapsed >= maxMonths) {
      showEndScreen();
    }
  }
  
  if (!isDragging) {
    checkAutoPause();
  }

  // Process queued events that are now on-camera
  processQueuedEvents(timelineOffset, canvas.width);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawTimelineLines(ctx, canvas, timelineOffset);
  drawMarkers(ctx, canvas, timelineOffset);
  drawEventMarkers(ctx, timelineOffset);
  drawReactions(ctx, timelineOffset);
  drawBranchNumbers(ctx, timelineOffset);
  updateStickmanPositions(timelineOffset);
  publishDebugState();
}

// Initialize and start
initBranches(timelineOffset);
updateStatsTable();

// Start background audio stream
let audioPlayer: BackgroundAudioPlayer | null = null;
try {
  audioPlayer = new BackgroundAudioPlayer('http://localhost:5000/audio_stream');
  console.log('Background audio stream started');
} catch (error) {
  console.error('Failed to start background audio:', error);
}

// Handle events from external API
function handleExternalEvent(event: ExternalEvent) {
  console.log(`📨 Processing external event: ${event.text}`);
  
  const { data } = event;
  
  // Prepare API data to be applied when event triggers (not immediately)
  const apiData = {
    name: data.name,
    monthlyWage: data.current_income / 12, // Convert annual to monthly
    currentLoan: data.current_loan || 0,
    maritalStatus: mapFamilyStatus(data.family_status),
    childCount: data.children,
    healthStatus: data.health_status || 'Healthy',
    ttsAudioId: data.ttsAudioId,
    ttsDuration: data.ttsDuration
  };
  
  console.log(`Event data queued to apply when stickman reaches it:`);
  console.log(`  - Name: ${apiData.name || '(unchanged)'}`);
  console.log(`  - Monthly Wage: ${apiData.monthlyWage}`);
  console.log(`  - Current Loan: ${apiData.currentLoan}`);
  console.log(`  - Marital Status: ${apiData.maritalStatus}`);
  console.log(`  - Children: ${apiData.childCount}`);
  console.log(`  - Health Status: ${apiData.healthStatus}`);
  
  // Determine target branch (default to 0 if not specified)
  const targetBranchId = data.branchId !== undefined ? data.branchId : 0;
  console.log(`  - Target Branch: #${targetBranchId}`);
  
  // Generate the event on the timeline with API data
  const eventQueued = generateEventFromAPI(
    data.recent_event,
    data.year,
    data.month,
    targetBranchId, // Use branchId from API request
    timelineOffset,
    apiData // Pass data to be applied when event triggers
  );
  
  if (eventQueued) {
    console.log(`Event "${data.recent_event}" queued for ${data.year}-${data.month}`);
    console.log(`  - Will be materialized when on-camera and branch exists`);
  } else {
    console.warn(`Failed to queue event "${data.recent_event}" - invalid event name`);
  }
}

// Start polling for external events from API
startPolling(handleExternalEvent);
console.log('🔗 API integration enabled - listening for external events');

// Don't start loop() here - it will be started in finalizeReveal() after countdown
// This ensures events are queued BEFORE the animation loop processes them
