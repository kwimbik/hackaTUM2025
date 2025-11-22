import { branches, initBranches, resetBranches, splitAllBranches, splitSpecificBranch, addMonthlyWage } from './branches.js';
import { generateRandomEvent, generateLifeAlteringEvent, checkEventTriggers, clearEvents, markerSpacing, generateEventFromAPI } from './events.js';
import { setupCameraControls, areStickmenVisible, resetCamera, isDragging } from './camera.js';
import { updateStatsTable } from './ui.js';
import { drawTimelineLines, drawMarkers, drawEventMarkers, drawReactions, drawBranchNumbers, updateStickmanPositions } from './rendering.js';
import { startPolling, mapFamilyStatus } from './apiClient.js';
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
// UI Elements
const pauseBtn = document.getElementById("pauseBtn");
const resumeBtn = document.getElementById("resumeBtn");
const splitAllBtn = document.getElementById("splitAllBtn");
const splitOneBtn = document.getElementById("splitOneBtn");
const generateEventBtn = document.getElementById("generateEventBtn");
const lifeAlteringEventBtn = document.getElementById("lifeAlteringEventBtn");
const resetBtn = document.getElementById("resetBtn");
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
    if (branches.length === 0)
        return;
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
    if (paused)
        return;
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
// Handle events from external API
function handleExternalEvent(event) {
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
    // Generate the event on the timeline with API data
    const eventGenerated = generateEventFromAPI(data.recent_event, data.year, data.month, 0, // Apply to branch 0
    timelineOffset, apiData // Pass data to be applied when event triggers
    );
    if (eventGenerated) {
        console.log(`✓ Event "${data.recent_event}" added to timeline at ${data.year}-${data.month}`);
    }
    else {
        console.warn(`Failed to generate event "${data.recent_event}" - may be in the past or invalid`);
    }
}
// Start polling for external events from API
startPolling(handleExternalEvent);
console.log('🔗 API integration enabled - listening for external events');
loop();
