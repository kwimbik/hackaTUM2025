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
let autoPaused = false;

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
  cameraOffsetX = 0;
  cameraOffsetY = 0;
  branches.forEach(branch => {
    branch.stickmanGif.src = "stickman_run.gif";
  });
});

// Camera system
let cameraOffsetX = 0;
let cameraOffsetY = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragStartCameraX = 0;
let dragStartCameraY = 0;

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

canvas.style.cursor = "grab";

// Timeline
let timelineOffset = 0;
let lastMonthIndex = -1;
const scrollSpeed = 1.0;
const markerSpacing = 400;
const safeExtraMarkers = 4;

// Isometric settings
const isoAngle = Math.PI / 6;
const timelineBaseX = 100;
const timelineBaseY = 500;

// Branch management
interface Branch {
  id: number;
  slot: number;
  startYOffset: number;
  targetYOffset: number;
  stickmanGif: HTMLImageElement;
  createdAt: number;
  money: number;
  monthlyWage: number;
  maritalStatus: string;
  hasChildren: boolean;
}

let branches: Branch[] = [];
const branchSpacing = 80;
const branchTransitionDistance = 200;

// Event system
interface GameEvent {
  id: number;
  branchId: number;
  monthIndex: number;
  type: 'happy' | 'sad';
  triggered: boolean;
  causesSplit?: boolean;
}

interface Reaction {
  branchId: number;
  type: 'happy' | 'sad';
  startOffset: number;
  duration: number;
}

let gameEvents: GameEvent[] = [];
let reactions: Reaction[] = [];
let nextEventId = 0;
const reactionDuration = markerSpacing * 1.5;

// Generate random stats
function generateRandomStats() {
  const statuses = ['Single', 'Married', 'Divorced', 'Widowed'];
  return {
    money: Math.floor(Math.random() * 100000) + 20000,
    monthlyWage: Math.floor(Math.random() * 5000) + 2000,
    maritalStatus: statuses[Math.floor(Math.random() * statuses.length)],
    hasChildren: Math.random() > 0.5
  };
}

// Inherit stats from parent with variations
function inheritStats(parent: Branch) {
  return {
    money: parent.money + Math.floor((Math.random() - 0.5) * 10000),
    monthlyWage: parent.monthlyWage + Math.floor((Math.random() - 0.5) * 1000),
    maritalStatus: parent.maritalStatus,
    hasChildren: parent.hasChildren
  };
}

// Update stats table
function updateStatsTable() {
  const tbody = document.getElementById("statsTableBody")!;
  tbody.innerHTML = '';
  
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
    
    const wageCell = document.createElement("td");
    wageCell.style.padding = "8px";
    wageCell.textContent = `$${branch.monthlyWage.toLocaleString()}`;
    
    const statusCell = document.createElement("td");
    statusCell.style.padding = "8px";
    statusCell.textContent = branch.maritalStatus;
    
    const kidsCell = document.createElement("td");
    kidsCell.style.padding = "8px";
    kidsCell.textContent = branch.hasChildren ? "Yes" : "No";
    
    row.appendChild(branchCell);
    row.appendChild(moneyCell);
    row.appendChild(wageCell);
    row.appendChild(statusCell);
    row.appendChild(kidsCell);
    
    tbody.appendChild(row);
  }
}

// Find free position
function findFreePosition(targetY: number, occupiedPositions: number[], minSpacing: number): number {
  const isFree = occupiedPositions.every(pos => Math.abs(pos - targetY) >= minSpacing);
  if (isFree) return targetY;
  
  let offset = minSpacing;
  while (offset < 1000) {
    const above = targetY - offset;
    if (occupiedPositions.every(pos => Math.abs(pos - above) >= minSpacing)) {
      return above;
    }
    const below = targetY + offset;
    if (occupiedPositions.every(pos => Math.abs(pos - below) >= minSpacing)) {
      return below;
    }
    offset += minSpacing / 2;
  }
  return targetY;
}

// Initialize branches
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
    monthlyWage: stats.monthlyWage,
    maritalStatus: stats.maritalStatus,
    hasChildren: stats.hasChildren
  });
  updateStatsTable();
}

// Create stickman GIF
function createStickmanGif(): HTMLImageElement {
  const gif = document.createElement("img");
  gif.src = "stickman_run.gif";
  gif.style.position = "absolute";
  gif.style.pointerEvents = "none";
  gif.style.zIndex = "5";
  gif.style.width = "110px";
  gif.style.height = "70px";
  const container = document.querySelector(".canvas-container")!;
  container.appendChild(gif);
  return gif;
}

// Reset branches
function resetBranches() {
  for (let i = 1; i < branches.length; i++) {
    branches[i].stickmanGif.remove();
  }
  
  if (branches.length > 0) {
    branches[0].id = 0;
    branches[0].slot = 0;
    branches[0].startYOffset = 0;
    branches[0].targetYOffset = 0;
    branches[0].createdAt = timelineOffset;
    branches = [branches[0]];
  } else {
    initBranches();
  }
  
  gameEvents = [];
  reactions = [];
  lastMonthIndex = -1;
  updateStatsTable();
}

// Generate random event
function generateRandomEvent() {
  if (branches.length === 0) return;
  
  const randomBranch = branches[Math.floor(Math.random() * branches.length)];
  const stickmanWorldX = 200;
  const currentMonthIndex = Math.floor((stickmanWorldX - timelineOffset) / markerSpacing);
  const nextMonthIndex = currentMonthIndex + 1;
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

// Generate life-altering event (ALWAYS splits)
function generateLifeAlteringEvent() {
  if (branches.length === 0) return;
  
  const randomBranch = branches[Math.floor(Math.random() * branches.length)];
  const stickmanWorldX = 200;
  const currentMonthIndex = Math.floor((stickmanWorldX - timelineOffset) / markerSpacing);
  const nextMonthIndex = currentMonthIndex + 1;
  const eventType = Math.random() < 0.5 ? 'happy' : 'sad';
  
  const newEvent: GameEvent = {
    id: nextEventId++,
    branchId: randomBranch.id,
    monthIndex: nextMonthIndex,
    type: eventType,
    triggered: false,
    causesSplit: true // Always splits!
  };
  
  gameEvents.push(newEvent);
  console.log(`Generated LIFE-ALTERING ${eventType} event for branch #${randomBranch.id} - WILL SPLIT!`);
}

// Split all branches
function splitAllBranches() {
  const newBranches: Branch[] = [];
  const usedIds = new Set<number>();
  let slotCounter = 0;
  
  for (const branch of branches) {
    const currentYOffset = calculateBranchYOffset(branch);
    
    const gif1 = createStickmanGif();
    const gif2 = createStickmanGif();
    
    const topId = branch.id;
    usedIds.add(topId);
    
    let bottomId = branch.id + 1;
    while (usedIds.has(bottomId) || branches.some(b => b.id === bottomId)) {
      bottomId++;
    }
    usedIds.add(bottomId);
    
    const occupiedPositions = [
      ...newBranches.map(b => b.targetYOffset),
      ...branches.filter(b => b !== branch).map(b => calculateBranchYOffset(b))
    ];
    
    const idealTop = currentYOffset - branchSpacing / 2;
    const idealBottom = currentYOffset + branchSpacing / 2;
    
    const topTarget = findFreePosition(idealTop, occupiedPositions, branchSpacing);
    occupiedPositions.push(topTarget);
    const bottomTarget = findFreePosition(idealBottom, occupiedPositions, branchSpacing);
    
    const stats1 = inheritStats(branch);
    const stats2 = inheritStats(branch);
    
    newBranches.push({
      id: topId,
      slot: slotCounter++,
      startYOffset: currentYOffset,
      targetYOffset: topTarget,
      stickmanGif: gif1,
      createdAt: timelineOffset,
      ...stats1
    });
    
    newBranches.push({
      id: bottomId,
      slot: slotCounter++,
      startYOffset: currentYOffset,
      targetYOffset: bottomTarget,
      stickmanGif: gif2,
      createdAt: timelineOffset,
      ...stats2
    });
    
    branch.stickmanGif.remove();
  }
  
  branches = newBranches;
  updateStatsTable();
}

// Split specific branch
function splitSpecificBranch(branchId: number) {
  const branchIndex = branches.findIndex(b => b.id === branchId);
  if (branchIndex === -1) return;
  
  const branchToSplit = branches[branchIndex];
  const currentYOffset = calculateBranchYOffset(branchToSplit);
  
  const gif1 = createStickmanGif();
  const gif2 = createStickmanGif();
  
  const topId = branchToSplit.id;
  const usedIds = new Set(branches.map(b => b.id));
  let bottomId = branchToSplit.id + 1;
  while (usedIds.has(bottomId)) {
    bottomId++;
  }
  
  const occupiedPositions = branches
    .filter((_, i) => i !== branchIndex)
    .map(b => calculateBranchYOffset(b));
  
  const idealTop = currentYOffset - branchSpacing / 2;
  const idealBottom = currentYOffset + branchSpacing / 2;
  
  const topTarget = findFreePosition(idealTop, occupiedPositions, branchSpacing);
  occupiedPositions.push(topTarget);
  const bottomTarget = findFreePosition(idealBottom, occupiedPositions, branchSpacing);
  
  const newBranches: Branch[] = [];
  let slotCounter = 0;
  
  const stats1 = inheritStats(branchToSplit);
  const stats2 = inheritStats(branchToSplit);
  
  for (let i = 0; i < branches.length; i++) {
    if (i === branchIndex) {
      newBranches.push({
        id: topId,
        slot: slotCounter++,
        startYOffset: currentYOffset,
        targetYOffset: topTarget,
        stickmanGif: gif1,
        createdAt: timelineOffset,
        ...stats1
      });
      
      newBranches.push({
        id: bottomId,
        slot: slotCounter++,
        startYOffset: currentYOffset,
        targetYOffset: bottomTarget,
        stickmanGif: gif2,
        createdAt: timelineOffset,
        ...stats2
      });
      
      branches[i].stickmanGif.remove();
    } else {
      const existingBranch = branches[i];
      const existingYOffset = calculateBranchYOffset(existingBranch);
      
      existingBranch.slot = slotCounter++;
      existingBranch.startYOffset = existingYOffset;
      existingBranch.targetYOffset = existingYOffset;
      
      newBranches.push(existingBranch);
    }
  }
  
  branches = newBranches;
  updateStatsTable();
}

splitAllBtn.addEventListener("click", () => splitAllBranches());
splitOneBtn.addEventListener("click", () => {
  if (branches.length === 0) return;
  const randomBranch = branches[Math.floor(Math.random() * branches.length)];
  splitSpecificBranch(randomBranch.id);
});
generateEventBtn.addEventListener("click", () => generateRandomEvent());
lifeAlteringEventBtn.addEventListener("click", () => generateLifeAlteringEvent());
resetBtn.addEventListener("click", () => resetBranches());

// Calculate branch Y offset
function calculateBranchYOffset(branch: Branch): number {
  const distanceTraveled = branch.createdAt - timelineOffset;
  const progress = Math.min(distanceTraveled / branchTransitionDistance, 1);
  return branch.startYOffset + (branch.targetYOffset - branch.startYOffset) * progress;
}

// Iso transform
function isoTransform(worldX: number, yOffset: number = 0): [number, number] {
  const isoX = timelineBaseX + worldX * Math.cos(isoAngle) + cameraOffsetX;
  const isoY = timelineBaseY - worldX * Math.sin(isoAngle) + yOffset + cameraOffsetY;
  return [isoX, isoY];
}

// Check visibility
function areStickmenVisible(): boolean {
  const stickmanWorldX = 200;
  
  for (const branch of branches) {
    const yOffset = calculateBranchYOffset(branch);
    const [x, y] = isoTransform(stickmanWorldX, yOffset);
    
    const stickmanScreenX = x - branch.stickmanGif.width / 2;
    const stickmanScreenY = y - branch.stickmanGif.height + 10;
    
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

// Auto-pause
function checkAutoPause() {
  if (paused) return;
  
  if (!areStickmenVisible()) {
    paused = true;
    autoPaused = true;
    pauseBtn.disabled = true;
    resumeBtn.disabled = false;
    branches.forEach(branch => {
      branch.stickmanGif.src = "uma_musume.webp";
    });
  }
}

// Check event triggers
function checkEventTriggers() {
  const stickmanWorldX = 200;
  
  for (const event of gameEvents) {
    if (event.triggered) continue;
    
    const eventWorldX = event.monthIndex * markerSpacing + timelineOffset;
    
    if (stickmanWorldX >= eventWorldX) {
      event.triggered = true;
      
      reactions.push({
        branchId: event.branchId,
        type: event.type,
        startOffset: timelineOffset,
        duration: reactionDuration
      });
      
      console.log(`Event triggered on branch #${event.branchId}: ${event.type} reaction!`);
      
      if (event.causesSplit) {
        console.log(`Life-altering event triggered! Splitting branch #${event.branchId}`);
        splitSpecificBranch(event.branchId);
      }
    }
  }
  
  reactions = reactions.filter(reaction => {
    const elapsed = reaction.startOffset - timelineOffset;
    return elapsed < reaction.duration;
  });
}

// Check monthly wage
function checkMonthlyWage() {
  const stickmanWorldX = 200;
  const currentMonthIndex = Math.floor((stickmanWorldX - timelineOffset) / markerSpacing);
  
  if (currentMonthIndex !== lastMonthIndex && lastMonthIndex !== -1) {
    for (const branch of branches) {
      branch.money += branch.monthlyWage;
    }
    updateStatsTable();
    console.log(`Month ${currentMonthIndex}: Added monthly wages!`);
  }
  
  lastMonthIndex = currentMonthIndex;
}

// Drawing functions
function drawTimelineLines() {
  const lineStartOffset = -800;
  const lineLength = canvas.width + 1000;
  
  ctx.strokeStyle = "black";
  ctx.lineWidth = 6;
  
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

function drawEventMarkers() {
  for (const event of gameEvents) {
    const branch = branches.find(b => b.id === event.branchId);
    if (!branch) continue;
    
    const eventWorldX = event.monthIndex * markerSpacing + timelineOffset;
    const yOffset = calculateBranchYOffset(branch);
    const [ex, ey] = isoTransform(eventWorldX, yOffset);
    
    const size = 20;
    const isLifeAltering = event.causesSplit;
    const actualSize = isLifeAltering ? size * 1.5 : size;
    
    if (event.type === 'happy') {
      ctx.fillStyle = event.triggered ? "#90EE90" : "#00FF00";
    } else {
      ctx.fillStyle = event.triggered ? "#FFB6C1" : "#FF0000";
    }
    
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
    
    ctx.strokeStyle = isLifeAltering ? "gold" : "black";
    ctx.lineWidth = isLifeAltering ? 4 : 2;
    ctx.stroke();
  }
}

function drawMarkers() {
  ctx.strokeStyle = "black";
  ctx.fillStyle = "black";
  ctx.lineWidth = 3;
  ctx.font = "16px Arial";

  const minIndex = Math.floor((-timelineOffset) / markerSpacing);
  const maxIndex = Math.ceil((-timelineOffset + canvas.width) / markerSpacing);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const startYear = 2025;

  for (const branch of branches) {
    const yOffset = calculateBranchYOffset(branch);
    
    for (let i = minIndex - safeExtraMarkers; i <= maxIndex + safeExtraMarkers; i++) {
      const worldX = i * markerSpacing + timelineOffset;
      const [mx, my] = isoTransform(worldX, yOffset);

      ctx.beginPath();
      ctx.moveTo(mx, my - 15);
      ctx.lineTo(mx, my + 15);
      ctx.stroke();

      const monthIndex = ((i % 12) + 12) % 12;
      const year = startYear + Math.floor(i / 12);
      const label = `${months[monthIndex]} ${year}`;
      const textWidth = ctx.measureText(label).width;
      ctx.fillText(label, mx - textWidth / 2, my - 20);
    }
  }
}

function drawReactions() {
  const stickmanWorldX = 200;
  
  for (const reaction of reactions) {
    const branch = branches.find(b => b.id === reaction.branchId);
    if (!branch) continue;
    
    const yOffset = calculateBranchYOffset(branch);
    const [x, y] = isoTransform(stickmanWorldX, yOffset);
    
    const emojiSize = 20;
    const emojiOffsetX = -20;
    const emojiOffsetY = -50;
    
    ctx.font = `${emojiSize}px Arial`;
    ctx.fillText(
      reaction.type === 'happy' ? '😊' : '😢',
      x + emojiOffsetX,
      y + emojiOffsetY
    );
  }
}

function drawBranchNumbers() {
  ctx.fillStyle = "blue";
  ctx.font = "bold 20px Arial";
  
  const stickmanWorldX = 200;
  
  for (const branch of branches) {
    const yOffset = calculateBranchYOffset(branch);
    const [x, y] = isoTransform(stickmanWorldX, yOffset);
    
    const numberOffsetX = -100;
    const numberOffsetY = -10;
    
    ctx.fillText(
      `#${branch.id}`,
      x + numberOffsetX,
      y + numberOffsetY
    );
  }
}

function updateStickmanPositions() {
  const stickmanWorldX = 200;
  const stickmanOffsetY = 10;

  for (const branch of branches) {
    const yOffset = calculateBranchYOffset(branch);
    const [x, y] = isoTransform(stickmanWorldX, yOffset);
    
    branch.stickmanGif.style.left = `${x - branch.stickmanGif.width / 2 - 40}px`;
    branch.stickmanGif.style.top = `${y - branch.stickmanGif.height + stickmanOffsetY}px`;
  }
}

// Animation loop
function loop() {
  requestAnimationFrame(loop);

  if (!paused) {
    timelineOffset -= scrollSpeed;
    checkEventTriggers();
    checkMonthlyWage();
  }
  
  if (!isDragging) {
    checkAutoPause();
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawTimelineLines();
  drawMarkers();
  drawEventMarkers();
  drawReactions();
  drawBranchNumbers();
  updateStickmanPositions();
}

// Initialize and start
initBranches();
loop();