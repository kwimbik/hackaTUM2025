const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

// UI
const pauseBtn = document.getElementById("pauseBtn") as HTMLButtonElement;
const resumeBtn = document.getElementById("resumeBtn") as HTMLButtonElement;
const splitAllBtn = document.getElementById("splitAllBtn") as HTMLButtonElement;
const splitOneBtn = document.getElementById("splitOneBtn") as HTMLButtonElement;
const resetBtn = document.getElementById("resetBtn") as HTMLButtonElement;

let paused = false;
pauseBtn.addEventListener("click", () => {
  paused = true;
  pauseBtn.disabled = true;
  resumeBtn.disabled = false;
});
resumeBtn.addEventListener("click", () => {
  paused = false;
  pauseBtn.disabled = false;
  resumeBtn.disabled = true;
});

// Timeline - scaled up for larger display
let timelineOffset = 0; // controls marker movement
const scrollSpeed = 1.0; // increased for larger canvas
const markerSpacing = 400; // doubled
const safeExtraMarkers = 4;

// Isometric settings - scaled up
const isoAngle = Math.PI / 6; // 30°
const timelineBaseX = 100;     // left anchor, scaled
const timelineBaseY = 500;     // bottom-left anchor, scaled

// Branch management with collision-free positioning
interface Branch {
  id: number;
  slot: number; // position in vertical stack (for ordering)
  startYOffset: number; // where the branch started (parent's position at split)
  targetYOffset: number; // final diverged position
  stickmanGif: HTMLImageElement;
  createdAt: number; // timelineOffset when branch was created
}

let branches: Branch[] = [];
const branchSpacing = 80; // minimum vertical spacing between branches
const branchTransitionDistance = 200; // distance over which branches diverge, reduced for faster splits

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
  branches.push({
    id: 0,
    slot: 0,
    startYOffset: 0,
    targetYOffset: 0,
    stickmanGif: originalGif,
    createdAt: timelineOffset
  });
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
    
    // Top branch (keeps original ID)
    newBranches.push({
      id: topId,
      slot: slot1,
      startYOffset: currentYOffset,
      targetYOffset: topTarget,
      stickmanGif: gif1,
      createdAt: currentOffset
    });
    
    // Bottom branch (new ID)
    newBranches.push({
      id: bottomId,
      slot: slot2,
      startYOffset: currentYOffset,
      targetYOffset: bottomTarget,
      stickmanGif: gif2,
      createdAt: currentOffset
    });
    
    branch.stickmanGif.remove();
  }
  
  branches = newBranches;
}

// Split one random branch into two
function splitOneBranch() {
  if (branches.length === 0) return;
  
  const currentOffset = timelineOffset;
  
  // Pick a random branch to split
  const randomIndex = Math.floor(Math.random() * branches.length);
  const branchToSplit = branches[randomIndex];
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
    .filter((_, i) => i !== randomIndex)
    .map(b => calculateBranchYOffset(b));
  
  // Find collision-free positions for the split
  const idealTop = currentYOffset - branchSpacing / 2;
  const idealBottom = currentYOffset + branchSpacing / 2;
  
  const topTarget = findFreePosition(idealTop, occupiedPositions, branchSpacing);
  occupiedPositions.push(topTarget);
  const bottomTarget = findFreePosition(idealBottom, occupiedPositions, branchSpacing);
  
  const newBranches: Branch[] = [];
  let slotCounter = 0;
  
  for (let i = 0; i < branches.length; i++) {
    if (i === randomIndex) {
      // Replace this branch with two new ones
      // Top branch (keeps original ID)
      newBranches.push({
        id: topId,
        slot: slotCounter,
        startYOffset: currentYOffset,
        targetYOffset: topTarget,
        stickmanGif: gif1,
        createdAt: currentOffset
      });
      slotCounter++;
      
      // Bottom branch (new ID)
      newBranches.push({
        id: bottomId,
        slot: slotCounter,
        startYOffset: currentYOffset,
        targetYOffset: bottomTarget,
        stickmanGif: gif2,
        createdAt: currentOffset
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
}

splitAllBtn.addEventListener("click", () => {
  splitAllBranches();
});

splitOneBtn.addEventListener("click", () => {
  splitOneBranch();
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

// Iso transform with yOffset for branches
function isoTransform(worldX: number, yOffset: number = 0): [number, number] {
  const isoX = timelineBaseX + worldX * Math.cos(isoAngle);
  const isoY = timelineBaseY - worldX * Math.sin(isoAngle) + yOffset;
  return [isoX, isoY];
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

// Draw branch numbers on each timeline - now drawn last for visibility
function drawBranchNumbers() {
  ctx.fillStyle = "blue";
  ctx.font = "bold 20px Arial";
  
  const screenX = 400; // same as stickman position
  const baseWorldX = screenX - timelineBaseX;
  
  for (const branch of branches) {
    const yOffset = calculateBranchYOffset(branch);
    const [x, y] = isoTransform(baseWorldX, yOffset);
    
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
  const screenX = 400; // scaled
  const baseWorldX = screenX - timelineBaseX;
  
  const stickmanOffsetY = 10; // scaled
  const stickmanXOffset = 90; // scaled

  for (const branch of branches) {
    const yOffset = calculateBranchYOffset(branch);
    const [x, y] = isoTransform(baseWorldX, yOffset);
    branch.stickmanGif.style.left = `${screenX - branch.stickmanGif.width / 2 - stickmanXOffset}px`;
    branch.stickmanGif.style.top = `${y - branch.stickmanGif.height + stickmanOffsetY}px`;
  }
}

// Animation loop
function loop() {
  requestAnimationFrame(loop);

  if (!paused) {
    timelineOffset -= scrollSpeed;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawTimelineLines();
  drawMarkers();
  drawBranchNumbers(); // Draw numbers last so they appear on top
  updateStickmanPositions();
}

// Initialize and start
initBranches();
loop();