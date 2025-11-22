const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

// UI
const pauseBtn = document.getElementById("pauseBtn") as HTMLButtonElement;
const resumeBtn = document.getElementById("resumeBtn") as HTMLButtonElement;
const splitAllBtn = document.getElementById("splitAllBtn") as HTMLButtonElement;
const splitOneBtn = document.getElementById("splitOneBtn") as HTMLButtonElement;
const generateEventBtn = document.getElementById("generateEventBtn") as HTMLButtonElement;
const lifeAlteringEventBtn = document.getElementById("lifeAlteringEventBtn") as HTMLButtonElement;
const resetBtn = document.getElementById("resetBtn") as HTMLButtonElement;

let paused = false;
let autoPaused = false; // Track if pause was automatic (due to off-screen)

pauseBtn.addEventListener("click", () => {
  paused = true;
  autoPaused = false; // Manual pause
  pauseBtn.disabled = true;
  resumeBtn.disabled = false;
  // Change to static image when paused
  branches.forEach(branch => {
    branch.stickmanGif.src = "uma_musume.webp";
  });
});

resumeBtn.addEventListener("click", () => {
  paused = false;
  autoPaused = false;
  pauseBtn.disabled = false;
  resumeBtn.disabled = true;
  // Re-center camera on resume
  cameraOffsetX = 0;
  cameraOffsetY = 0;
  // Change back to running GIF when resumed
  branches.forEach(branch => {
    branch.stickmanGif.src = "stickman_run.gif";
  });
});

// Camera system for dragging/panning
let cameraOffsetX = 0;
let cameraOffsetY = 0;

// Mouse drag state
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragStartCameraX = 0;
let dragStartCameraY = 0;

// Mouse event handlers for dragging
canvas.addEventListener("mousedown", (e) => {
  isDragging = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  dragStartCameraX = cameraOffsetX;
  dragStartCameraY = cameraOffsetY;
  canvas.style.cursor = "grabbing";
});

canvas.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  
  const deltaX = e.clientX - dragStartX;
  const deltaY = e.clientY - dragStartY;
  
  cameraOffsetX = dragStartCameraX + deltaX;
  cameraOffsetY = dragStartCameraY + deltaY;
});

canvas.addEventListener("mouseup", () => {
  isDragging = false;
  canvas.style.cursor = "grab";
});

canvas.addEventListener("mouseleave", () => {
  isDragging = false;
  canvas.style.cursor = "default";
});

canvas.addEventListener("mouseenter", () => {
  if (!isDragging) {
    canvas.style.cursor = "grab";
  }
});

// Set initial cursor
canvas.style.cursor = "grab";

// Timeline - scaled up for larger display
let timelineOffset = 0; // controls marker movement
const scrollSpeed = 1.0; // increased for larger canvas
const markerSpacing = 400; // doubled
const safeExtraMarkers = 4;

// Isometric settings - scaled up
const isoAngle = Math.PI / 6; // 30°
const timelineBaseX = 100;     // left anchor, scaled
const timelineBaseY = 500;     // bottom-left anchor, scaled

// Branch management with collision-free positioning and stats
interface Branch {
  id: number;
  slot: number; // position in vertical stack (for ordering)
  startYOffset: number; // where the branch started (parent's position at split)
  targetYOffset: number; // final diverged position
  stickmanGif: HTMLImageElement;
  createdAt: number; // timelineOffset when branch was created
  // Stats
  money: number;
  maritalStatus: string;
  hasChildren: boolean;
}

let branches: Branch[] = [];
const branchSpacing = 80; // minimum vertical spacing between branches
const branchTransitionDistance = 200; // distance over which branches diverge, reduced for faster splits

// Event system
interface GameEvent {
  id: number;
  branchId: number; // which branch this event is on
  monthIndex: number; // which month marker (i value in drawMarkers)
  type: 'happy' | 'sad';
  triggered: boolean; // has the stickman passed this event?
}

interface Reaction {
  branchId: number;
  type: 'happy' | 'sad';
  startOffset: number; // timelineOffset when reaction started
  duration: number; // how long to show (in timeline offset units)
}

let gameEvents: GameEvent[] = [];
let reactions: Reaction[] = [];
let nextEventId = 0;
const reactionDuration = markerSpacing * 1.5; // Show for ~1.5 months

// Generate random stats for a branch
function generateRandomStats(): { money: number; maritalStatus: string; hasChildren: boolean } {
  const statuses = ['Single', 'Married', 'Divorced', 'Widowed'];
  return {
    money: Math.floor(Math.random() * 100000) + 20000,
    maritalStatus: statuses[Math.floor(Math.random() * statuses.length)],
    hasChildren: Math.random() > 0.5
  };
}

// Update the stats table display
function updateStatsTable() {
  const tbody = document.getElementById("statsTableBody")!;
  tbody.innerHTML = '';
  
  // Sort branches by ID in ascending order
  const sortedBranches = [...branches].sort((a, b) => a.id - b.id);
  
  for (const branch of sortedBranches) {
    const row = document.createElement("tr");
    row.style.borderBottom = "1px solid #ccc";
    
    const branchCell = document.createElement("td");
    branchCell.style.padding = "8px";
    branchCell.textContent = `#${branch.id}`;
    
    const moneyCell = document.createElement("td");
    moneyCell.style.padding = "8px";
    moneyCell.textContent = `$${branch.money.toLocaleString()}`;
    
    const statusCell = document.createElement("td");
    statusCell.style.padding = "8px";
    statusCell.textContent = branch.maritalStatus;
    
    const kidsCell = document.createElement("td");
    kidsCell.style.padding = "8px";
    kidsCell.textContent = branch.hasChildren ? "Yes" : "No";
    
    row.appendChild(branchCell);
    row.appendChild(moneyCell);
    row.appendChild(statusCell);
    row.appendChild(kidsCell);
    
    tbody.appendChild(row);
  }
}

// Find a free Y position near targetY that doesn't overlap with existing branches
function findFreePosition(targetY: number, occupiedPositions: number[], minSpacing: number): number {
  // Check if target position is free
  const isFree = occupiedPositions.every(pos => Math.abs(pos - targetY) >= minSpacing);
  if (isFree) return targetY;
  
  // Try positions progressively further away
  let offset = minSpacing;
  while (offset < 1000) { // safety limit
    // Try above
    const above = targetY - offset;
    if (occupiedPositions.every(pos => Math.abs(pos - above) >= minSpacing)) {
      return above;
    }
    
    // Try below
    const below = targetY + offset;
    if (occupiedPositions.every(pos => Math.abs(pos - below) >= minSpacing)) {
      return below;
    }
    
    offset += minSpacing / 2;
  }
  
  return targetY; // fallback
}

// Initialize with the original GIF as first branch
function initBranches() {
  const originalGif = document.getElementById("stickmanGif") as HTMLImageElement;
  const stats = generateRandomStats();
  branches.push({
    id: 0,
    slot: 0,
    startYOffset: 0,
    targetYOffset: 0,
    stickmanGif: originalGif,
    createdAt: timelineOffset,
    money: stats.money,
    maritalStatus: stats.maritalStatus,
    hasChildren: stats.hasChildren
  });
  updateStatsTable();
}

// Create a new stickman GIF element
function createStickmanGif(): HTMLImageElement {
  const gif = document.createElement("img");
  gif.src = "stickman_run.gif";
  gif.style.position = "absolute";
  gif.style.pointerEvents = "none";
  gif.style.zIndex = "5";
  gif.style.width = "110px"; // scaled
  gif.style.height = "70px"; // scaled
  const container = document.querySelector(".canvas-container")!;
  container.appendChild(gif);
  return gif;
}

// Reset to single timeline while keeping current time
function resetBranches() {
  // Remove all GIF elements except the first
  for (let i = 1; i < branches.length; i++) {
    branches[i].stickmanGif.remove();
  }
  
  // Keep only the first branch and reset its position
  if (branches.length > 0) {
    branches[0].id = 0; // reset to ID 0
    branches[0].slot = 0;
    branches[0].startYOffset = 0;
    branches[0].targetYOffset = 0;
    branches[0].createdAt = timelineOffset; // reset to current time
    branches = [branches[0]];
  } else {
    // Fallback: reinitialize if no branches exist
    initBranches();
  }
  
  // Clear events and reactions
  gameEvents = [];
  reactions = [];
  
  updateStatsTable();
}

// Generate a random event at the next month marker (guaranteed to be in the future)
function generateRandomEvent() {
  if (branches.length === 0) return;
  
  // Pick a random branch
  const randomBranch = branches[Math.floor(Math.random() * branches.length)];
  
  // Find which month marker the stickman is currently at
  const stickmanWorldX = 200;
  const currentMonthIndex = Math.floor((stickmanWorldX - timelineOffset) / markerSpacing);
  
  // Generate event at least 1 month in the future
  const nextMonthIndex = currentMonthIndex + 1;
  
  // Random event type
  const eventType = Math.random() < 0.5 ? 'happy' : 'sad';
  
  const newEvent: GameEvent = {
    id: nextEventId++,
    branchId: randomBranch.id,
    monthIndex: nextMonthIndex,
    type: eventType,
    triggered: false
  };
  
  gameEvents.push(newEvent);
  console.log(`Generated ${eventType} event for branch #${randomBranch.id} at month ${nextMonthIndex}`);
}

// Generate a life-altering event that may split the timeline
function generateLifeAlteringEvent() {
  if (branches.length === 0) return;
  
  // Pick a random branch
  const randomBranch = branches[Math.floor(Math.random() * branches.length)];
  
  // Find which month marker the stickman is currently at
  const stickmanWorldX = 200;
  const currentMonthIndex = Math.floor((stickmanWorldX - timelineOffset) / markerSpacing);
  
  // Generate event at least 1 month in the future
  const nextMonthIndex = currentMonthIndex + 1;
  
  // Random event type
  const eventType = Math.random() < 0.5 ? 'happy' : 'sad';
  
  const newEvent: GameEvent = {
    id: nextEventId++,
    branchId: randomBranch.id,
    monthIndex: nextMonthIndex,
    type: eventType,
    triggered: false
  };
  
  gameEvents.push(newEvent);
  
  console.log(`Generated LIFE-ALTERING ${eventType} event for branch #${randomBranch.id} - WILL SPLIT!`);
  // Store info that this event should cause a split
  (newEvent as any).causesSplit = true;

}

// Split all existing branches into two each
function splitAllBranches() {
  const newBranches: Branch[] = [];
  const currentOffset = timelineOffset;
  const usedIds = new Set<number>(); // Track IDs being assigned in this operation
  
  let slotCounter = 0;
  
  for (const branch of branches) {
    const currentYOffset = calculateBranchYOffset(branch);
    
    const gif1 = createStickmanGif();
    const gif2 = createStickmanGif();
    
    const slot1 = slotCounter++;
    const slot2 = slotCounter++;
    
    // Top branch keeps original ID
    const topId = branch.id;
    usedIds.add(topId);
    
    // Bottom branch gets next available ID starting from original+1
    let bottomId = branch.id + 1;
    while (usedIds.has(bottomId) || branches.some(b => b.id === bottomId)) {
      bottomId++;
    }
    usedIds.add(bottomId);
    
    // Get all current occupied positions (from branches already processed + existing branches)
    const occupiedPositions = [
      ...newBranches.map(b => b.targetYOffset),
      ...branches.filter(b => b !== branch).map(b => calculateBranchYOffset(b))
    ];
    
    // Find collision-free positions for the split
    const idealTop = currentYOffset - branchSpacing / 2;
    const idealBottom = currentYOffset + branchSpacing / 2;
    
    const topTarget = findFreePosition(idealTop, occupiedPositions, branchSpacing);
    occupiedPositions.push(topTarget); // Mark as occupied for next check
    const bottomTarget = findFreePosition(idealBottom, occupiedPositions, branchSpacing);
    
    // Copy parent stats with slight variations
    const stats1 = generateRandomStats();
    const stats2 = generateRandomStats();
    
    // Top branch (keeps original ID)
    newBranches.push({
      id: topId,
      slot: slot1,
      startYOffset: currentYOffset,
      targetYOffset: topTarget,
      stickmanGif: gif1,
      createdAt: currentOffset,
      money: stats1.money,
      maritalStatus: stats1.maritalStatus,
      hasChildren: stats1.hasChildren
    });
    
    // Bottom branch (new ID)
    newBranches.push({
      id: bottomId,
      slot: slot2,
      startYOffset: currentYOffset,
      targetYOffset: bottomTarget,
      stickmanGif: gif2,
      createdAt: currentOffset,
      money: stats2.money,
      maritalStatus: stats2.maritalStatus,
      hasChildren: stats2.hasChildren
    });
    
    branch.stickmanGif.remove();
  }
  
  branches = newBranches;
  updateStatsTable();
}

// Split one specific branch into two
function splitSpecificBranch(branchId: number) {
  const branchIndex = branches.findIndex(b => b.id === branchId);
  if (branchIndex === -1) return;
  
  const currentOffset = timelineOffset;
  const branchToSplit = branches[branchIndex];
  const currentYOffset = calculateBranchYOffset(branchToSplit);
  
  const gif1 = createStickmanGif();
  const gif2 = createStickmanGif();
  
  // Top branch keeps original ID
  const topId = branchToSplit.id;
  
  // Bottom branch gets next available ID starting from original+1
  const usedIds = new Set(branches.map(b => b.id));
  let bottomId = branchToSplit.id + 1;
  while (usedIds.has(bottomId)) {
    bottomId++;
  }
  
  // Get all occupied positions from non-splitting branches
  const occupiedPositions = branches
    .filter((_, i) => i !== branchIndex)
    .map(b => calculateBranchYOffset(b));
  
  // Find collision-free positions for the split
  const idealTop = currentYOffset - branchSpacing / 2;
  const idealBottom = currentYOffset + branchSpacing / 2;
  
  const topTarget = findFreePosition(idealTop, occupiedPositions, branchSpacing);
  occupiedPositions.push(topTarget);
  const bottomTarget = findFreePosition(idealBottom, occupiedPositions, branchSpacing);
  
  const newBranches: Branch[] = [];
  let slotCounter = 0;
  
  // Generate stats for new branches
  const stats1 = generateRandomStats();
  const stats2 = generateRandomStats();
  
  for (let i = 0; i < branches.length; i++) {
    if (i === branchIndex) {
      // Replace this branch with two new ones
      // Top branch (keeps original ID)
      newBranches.push({
        id: topId,
        slot: slotCounter,
        startYOffset: currentYOffset,
        targetYOffset: topTarget,
        stickmanGif: gif1,
        createdAt: currentOffset,
        money: stats1.money,
        maritalStatus: stats1.maritalStatus,
        hasChildren: stats1.hasChildren
      });
      slotCounter++;
      
      // Bottom branch (new ID)
      newBranches.push({
        id: bottomId,
        slot: slotCounter,
        startYOffset: currentYOffset,
        targetYOffset: bottomTarget,
        stickmanGif: gif2,
        createdAt: currentOffset,
        money: stats2.money,
        maritalStatus: stats2.maritalStatus,
        hasChildren: stats2.hasChildren
      });
      slotCounter++;
      
      branches[i].stickmanGif.remove();
    } else {
      // Keep existing branch at its current position (no repositioning)
      const existingBranch = branches[i];
      const existingYOffset = calculateBranchYOffset(existingBranch);
      
      existingBranch.slot = slotCounter;
      // Keep branch at current position - don't trigger new transition
      existingBranch.startYOffset = existingYOffset;
      existingBranch.targetYOffset = existingYOffset;
      
      newBranches.push(existingBranch);
      slotCounter++;
    }
  }
  
  branches = newBranches;
  updateStatsTable();
}

// Split one random branch into two
function splitOneBranch() {
  if (branches.length === 0) return;
  
  // Pick a random branch
  const randomBranch = branches[Math.floor(Math.random() * branches.length)];
  splitSpecificBranch(randomBranch.id);
}

splitAllBtn.addEventListener("click", () => {
  splitAllBranches();
});

splitOneBtn.addEventListener("click", () => {
  splitOneBranch();
});

generateEventBtn.addEventListener("click", () => {
  generateRandomEvent();
});

lifeAlteringEventBtn.addEventListener("click", () => {
  generateLifeAlteringEvent();
});

resetBtn.addEventListener("click", () => {
  resetBranches();
});

// Calculate current yOffset based on distance traveled since creation
function calculateBranchYOffset(branch: Branch): number {
  // Distance traveled since branch was created
  const distanceTraveled = branch.createdAt - timelineOffset;
  
  // Calculate progress (0 to 1) over the transition distance
  const progress = Math.min(distanceTraveled / branchTransitionDistance, 1);
  
  // Interpolate between start and target
  return branch.startYOffset + (branch.targetYOffset - branch.startYOffset) * progress;
}

// Iso transform with yOffset for branches - now includes camera offset
function isoTransform(worldX: number, yOffset: number = 0): [number, number] {
  const isoX = timelineBaseX + worldX * Math.cos(isoAngle) + cameraOffsetX;
  const isoY = timelineBaseY - worldX * Math.sin(isoAngle) + yOffset + cameraOffsetY;
  return [isoX, isoY];
}

// Check if any stickman is currently visible in the viewport
function areStickmenVisible(): boolean {
  const stickmanWorldX = 200; // Same as in updateStickmanPositions
  
  for (const branch of branches) {
    const yOffset = calculateBranchYOffset(branch);
    const [x, y] = isoTransform(stickmanWorldX, yOffset);
    
    // Calculate stickman screen position
    const stickmanScreenX = x - branch.stickmanGif.width / 2;
    const stickmanScreenY = y - branch.stickmanGif.height + 10;
    
    // Check if stickman is within canvas bounds (with some margin)
    const margin = 50;
    if (
      stickmanScreenX > -margin &&
      stickmanScreenX < canvas.width + margin &&
      stickmanScreenY > -margin &&
      stickmanScreenY < canvas.height + margin
    ) {
      return true;
    }
  }
  
  return false;
}

// Auto-pause when all stickmen are off-screen
function checkAutoPause() {
  if (paused) return; // Already paused
  
  if (!areStickmenVisible()) {
    // All stickmen are off-screen, auto-pause
    paused = true;
    autoPaused = true;
    pauseBtn.disabled = true;
    resumeBtn.disabled = false;
    // Change to static image when auto-paused
    branches.forEach(branch => {
      branch.stickmanGif.src = "uma_musume.webp";
    });
  }
}

// Check if stickman has passed events and trigger reactions
function checkEventTriggers() {
  const stickmanWorldX = 200; // Current stickman position
  
  for (const event of gameEvents) {
    if (event.triggered) continue; // Already triggered
    
    // Calculate event's current worldX position (moves with timeline)
    const eventWorldX = event.monthIndex * markerSpacing + timelineOffset;
    
    // Check if the stickman on this branch has passed the event
    // Event is triggered when stickman moves past it (event worldX is behind stickman)
    if (stickmanWorldX >= eventWorldX) {
      event.triggered = true;
      
      // Create a reaction
      reactions.push({
        branchId: event.branchId,
        type: event.type,
        startOffset: timelineOffset,
        duration: reactionDuration
      });
      
      console.log(`Event triggered on branch #${event.branchId}: ${event.type} reaction!`);
      
      // Check if this event causes a split
      if ((event as any).causesSplit) {
        console.log(`Life-altering event triggered! Splitting branch #${event.branchId}`);
        splitSpecificBranch(event.branchId);
      }
    }
  }
  
  // Remove expired reactions
  reactions = reactions.filter(reaction => {
    const elapsed = reaction.startOffset - timelineOffset;
    return elapsed < reaction.duration;
  });
}

// Draw timeline lines for all branches
function drawTimelineLines() {
  const lineStartOffset = -800; // extended for larger canvas
  const lineLength = canvas.width + 1000; // extended
  
  ctx.strokeStyle = "black";
  ctx.lineWidth = 6; // thicker for larger canvas
  
  for (const branch of branches) {
    const yOffset = calculateBranchYOffset(branch);
    const [startX, startY] = isoTransform(lineStartOffset, yOffset);
    const [endX, endY] = isoTransform(lineLength, yOffset);
    
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  }
}

// Draw event markers on timeline
function drawEventMarkers() {
  for (const event of gameEvents) {
    // Find the branch this event belongs to
    const branch = branches.find(b => b.id === event.branchId);
    if (!branch) continue;
    
    // Calculate event's current worldX position (moves with timeline)
    const eventWorldX = event.monthIndex * markerSpacing + timelineOffset;
    
    const yOffset = calculateBranchYOffset(branch);
    const [ex, ey] = isoTransform(eventWorldX, yOffset);
    
    // Draw event marker based on type
    const size = 20;
    
    // Life-altering events are bigger
    const isLifeAltering = (event as any).causesSplit;
    const actualSize = isLifeAltering ? size * 1.5 : size;
    
    if (event.type === 'happy') {
      ctx.fillStyle = event.triggered ? "#90EE90" : "#00FF00"; // Light green if triggered, bright green if not
    } else {
      ctx.fillStyle = event.triggered ? "#FFB6C1" : "#FF0000"; // Light red if triggered, bright red if not
    }
    
    // Draw star shape for event
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const radius = i % 2 === 0 ? actualSize : actualSize / 2;
      const x = ex + Math.cos(angle) * radius;
      const y = ey + Math.sin(angle) * radius;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fill();
    
    // Add stroke - thicker for life-altering events
    ctx.strokeStyle = isLifeAltering ? "gold" : "black";
    ctx.lineWidth = isLifeAltering ? 4 : 2;
    ctx.stroke();
  }
}

// Draw markers for all branches
function drawMarkers() {
  ctx.strokeStyle = "black";
  ctx.fillStyle = "black";
  ctx.lineWidth = 3; // scaled
  ctx.font = "16px Arial"; // scaled

  const minIndex = Math.floor((-timelineOffset) / markerSpacing);
  const maxIndex = Math.ceil((-timelineOffset + canvas.width) / markerSpacing);

  // Pre-calculate month labels to avoid redundant calculations
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const startYear = 2025;

  for (const branch of branches) {
    const yOffset = calculateBranchYOffset(branch);
    
    for (let i = minIndex - safeExtraMarkers; i <= maxIndex + safeExtraMarkers; i++) {
      const worldX = i * markerSpacing + timelineOffset;
      const [mx, my] = isoTransform(worldX, yOffset);

      // Marker line - scaled
      ctx.beginPath();
      ctx.moveTo(mx, my - 15);
      ctx.lineTo(mx, my + 15);
      ctx.stroke();

      // Label
      const monthIndex = ((i % 12) + 12) % 12;
      const year = startYear + Math.floor(i / 12);
      const label = `${months[monthIndex]} ${year}`;
      const textWidth = ctx.measureText(label).width;
      ctx.fillText(label, mx - textWidth / 2, my - 20); // adjusted offset
    }
  }
}

// Draw reaction emojis next to stickmen
function drawReactions() {
  const stickmanWorldX = 200;
  
  for (const reaction of reactions) {
    // Find the branch this reaction belongs to
    const branch = branches.find(b => b.id === reaction.branchId);
    if (!branch) continue;
    
    const yOffset = calculateBranchYOffset(branch);
    const [x, y] = isoTransform(stickmanWorldX, yOffset);
    
    // Draw emoji next to stickman
    const emojiSize = 20;
    const emojiOffsetX = -20; // to the right of stickman
    const emojiOffsetY = -50; // above stickman
    
    ctx.font = `${emojiSize}px Arial`;
    ctx.fillText(
      reaction.type === 'happy' ? '😊' : '😢',
      x + emojiOffsetX,
      y + emojiOffsetY
    );
  }
}

// Draw branch numbers on each timeline - now drawn last for visibility
function drawBranchNumbers() {
  ctx.fillStyle = "blue";
  ctx.font = "bold 20px Arial";
  
  const stickmanWorldX = 200; // Same as stickman position
  
  for (const branch of branches) {
    const yOffset = calculateBranchYOffset(branch);
    const [x, y] = isoTransform(stickmanWorldX, yOffset);
    
    // Draw number close to stickman, slightly to the left
    const numberOffsetX = -100; // close to stickman
    const numberOffsetY = -10; // slightly above timeline
    
    ctx.fillText(
      `#${branch.id}`,
      x + numberOffsetX,
      y + numberOffsetY
    );
  }
}

// Update all stickman positions
function updateStickmanPositions() {
  const stickmanWorldX = 200; // Moved back from 300 to position better on timeline
  const stickmanOffsetY = 10; // vertical offset from timeline

  for (const branch of branches) {
    const yOffset = calculateBranchYOffset(branch);
    // Get screen position from world coordinates (includes camera offset)
    const [x, y] = isoTransform(stickmanWorldX, yOffset);
    
    // Position GIF at transformed coordinates
    branch.stickmanGif.style.left = `${x - branch.stickmanGif.width / 2 - 40}px`; // subtract more (try 20, 30, 40, etc.)
    branch.stickmanGif.style.top = `${y - branch.stickmanGif.height + stickmanOffsetY}px`;
  }
}

// Animation loop
function loop() {
  requestAnimationFrame(loop);

  if (!paused) {
    timelineOffset -= scrollSpeed;
    checkEventTriggers(); // Check if events should trigger reactions
  }
  
  // Check for auto-pause when not dragging
  if (!isDragging) {
    checkAutoPause();
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawTimelineLines();
  drawMarkers();
  drawEventMarkers(); // Draw event markers
  drawReactions(); // Draw reaction emojis
  drawBranchNumbers(); // Draw numbers last so they appear on top
  updateStickmanPositions();
}

// Initialize and start
initBranches();
loop();