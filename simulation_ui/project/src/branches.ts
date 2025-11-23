import { Branch, BranchStats } from './types.js';

export let branches: Branch[] = [];

// Constants
export const branchSpacing = 80;
export const branchTransitionDistance = 200;

// Store onboarding data for deterministic branch generation
export interface OnboardingData {
  loanType: string;
  loanYears: number;
  age: number;
  education: string;
  familyStatus: string;
  careerLength: number;
}

let onboardingData: OnboardingData | null = null;

export function setOnboardingData(data: OnboardingData) {
  onboardingData = data;
  console.log('✓ Onboarding data stored:', data);
}

// Calculate initial stats based on onboarding data (deterministic, no randomness)
function calculateInitialStats(): BranchStats {
  if (!onboardingData) {
    // Fallback if no onboarding data
    return {
      money: 50000,
      monthlyWage: 3500,
      currentLoan: 0,
      maritalStatus: 'Single',
      childCount: 0,
      healthStatus: 'Healthy',
      name: 'Person'
    };
  }
  
  // Base salary calculation from education and career length
  let baseSalary = 30000; // Starting point
  
  // Education multiplier
  const educationMultiplier: {[key: string]: number} = {
    'highschool': 1.0,
    'bachelor': 1.3,
    'master': 1.6,
    'doctorate': 2.0
  };
  baseSalary *= educationMultiplier[onboardingData.education] || 1.0;
  
  // Career length adds experience bonus (5% per year, capped at 50%)
  const experienceMultiplier = 1 + Math.min(onboardingData.careerLength * 0.05, 0.5);
  baseSalary *= experienceMultiplier;
  
  // Age adjustment (peak earnings 35-50)
  if (onboardingData.age >= 35 && onboardingData.age <= 50) {
    baseSalary *= 1.2;
  } else if (onboardingData.age < 25) {
    baseSalary *= 0.8;
  }
  
  const annualSalary = Math.floor(baseSalary);
  const monthlyWage = Math.floor(annualSalary / 12);
  
  // Initial savings based on age and career length
  // Assume saving 15% of income per year of career
  const yearlySavings = annualSalary * 0.15;
  const totalSavings = Math.floor(yearlySavings * onboardingData.careerLength);
  
  return {
    money: totalSavings,
    monthlyWage: monthlyWage,
    currentLoan: 0,
    maritalStatus: onboardingData.familyStatus === 'married' ? 'Married' : 'Single',
    childCount: 0,
    healthStatus: 'Healthy',
    name: 'Person'
  };
}

// Generate stats for initial branch (deterministic based on onboarding)
export function generateRandomStats(): BranchStats {
  return calculateInitialStats();
}

// Inherit stats from parent WITHOUT random variations (deterministic)
export function inheritStats(parent: Branch): BranchStats {
  return {
    money: parent.money,
    monthlyWage: parent.monthlyWage,
    currentLoan: parent.currentLoan,
    maritalStatus: parent.maritalStatus,
    childCount: parent.childCount,
    healthStatus: parent.healthStatus,
    name: parent.name
  };
}

// Find a free Y position near targetY that doesn't overlap with existing branches
export function findFreePosition(targetY: number, occupiedPositions: number[], minSpacing: number): number {
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

// Create a new stickman GIF element
export function createStickmanGif(): HTMLImageElement {
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

// Calculate current yOffset based on distance traveled since creation
export function calculateBranchYOffset(branch: Branch, timelineOffset: number): number {
  const distanceTraveled = branch.createdAt - timelineOffset;
  const progress = Math.min(distanceTraveled / branchTransitionDistance, 1);
  return branch.startYOffset + (branch.targetYOffset - branch.startYOffset) * progress;
}

// Initialize with the original GIF as first branch
export function initBranches(timelineOffset: number) {
  const originalGif = document.getElementById("stickmanGif") as HTMLImageElement;
  const statsPrimary = generateRandomStats();
  const statsSecondary = generateRandomStats();

  const secondGif = createStickmanGif();
  const offsetPrimary = -branchSpacing / 2;
  const offsetSecondary = branchSpacing / 2;

  branches = [
    {
      id: 0,
      name: statsPrimary.name || 'Branch 0',
      slot: 0,
      startYOffset: offsetPrimary,
      targetYOffset: offsetPrimary,
      stickmanGif: originalGif,
      createdAt: timelineOffset,
      money: statsPrimary.money,
      monthlyWage: statsPrimary.monthlyWage,
      currentLoan: statsPrimary.currentLoan,
      maritalStatus: statsPrimary.maritalStatus,
      childCount: statsPrimary.childCount,
      healthStatus: statsPrimary.healthStatus
    },
    {
      id: 1,
      name: statsSecondary.name || 'Branch 1',
      slot: 1,
      startYOffset: offsetSecondary,
      targetYOffset: offsetSecondary,
      stickmanGif: secondGif,
      createdAt: timelineOffset,
      money: statsSecondary.money,
      monthlyWage: statsSecondary.monthlyWage,
      currentLoan: statsSecondary.currentLoan,
      maritalStatus: statsSecondary.maritalStatus,
      childCount: statsSecondary.childCount,
      healthStatus: statsSecondary.healthStatus
    }
  ];
}

// Reset to single timeline
export function resetBranches(timelineOffset: number) {
  // Remove all extra avatars beyond the original DOM element
  for (let i = 1; i < branches.length; i++) {
    branches[i].stickmanGif.remove();
  }

  const statsPrimary = generateRandomStats();
  const statsSecondary = generateRandomStats();
  const offsetPrimary = -branchSpacing / 2;
  const offsetSecondary = branchSpacing / 2;

  if (branches.length === 0) {
    const originalGif = document.getElementById("stickmanGif") as HTMLImageElement;
    branches.push({
      id: 0,
      name: statsPrimary.name || 'Branch 0',
      slot: 0,
      startYOffset: offsetPrimary,
      targetYOffset: offsetPrimary,
      stickmanGif: originalGif,
      createdAt: timelineOffset,
      money: statsPrimary.money,
      monthlyWage: statsPrimary.monthlyWage,
      currentLoan: statsPrimary.currentLoan,
      maritalStatus: statsPrimary.maritalStatus,
      childCount: statsPrimary.childCount,
      healthStatus: statsPrimary.healthStatus
    });
  } else {
    branches[0].id = 0;
    branches[0].name = statsPrimary.name || 'Branch 0';
    branches[0].slot = 0;
    branches[0].startYOffset = offsetPrimary;
    branches[0].targetYOffset = offsetPrimary;
    branches[0].createdAt = timelineOffset;
    branches[0].money = statsPrimary.money;
    branches[0].monthlyWage = statsPrimary.monthlyWage;
    branches[0].currentLoan = statsPrimary.currentLoan;
    branches[0].maritalStatus = statsPrimary.maritalStatus;
    branches[0].childCount = statsPrimary.childCount;
    branches[0].healthStatus = statsPrimary.healthStatus;
    branches = [branches[0]];
  }

  const secondGif = createStickmanGif();
  branches.push({
    id: 1,
    name: statsSecondary.name || 'Branch 1',
    slot: 1,
    startYOffset: offsetSecondary,
    targetYOffset: offsetSecondary,
    stickmanGif: secondGif,
    createdAt: timelineOffset,
    money: statsSecondary.money,
    monthlyWage: statsSecondary.monthlyWage,
    currentLoan: statsSecondary.currentLoan,
    maritalStatus: statsSecondary.maritalStatus,
    childCount: statsSecondary.childCount,
    healthStatus: statsSecondary.healthStatus
  });
}

// Split all branches
export function splitAllBranches(timelineOffset: number) {
  const newBranches: Branch[] = [];
  const usedIds = new Set<number>();
  let slotCounter = 0;
  
  for (const branch of branches) {
    const currentYOffset = calculateBranchYOffset(branch, timelineOffset);
    
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
      ...branches.filter(b => b !== branch).map(b => calculateBranchYOffset(b, timelineOffset))
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
      name: stats1.name || `Branch ${topId}`,
      slot: slotCounter++,
      startYOffset: currentYOffset,
      targetYOffset: topTarget,
      stickmanGif: gif1,
      createdAt: timelineOffset,
      money: stats1.money,
      monthlyWage: stats1.monthlyWage,
      currentLoan: stats1.currentLoan,
      maritalStatus: stats1.maritalStatus,
      childCount: stats1.childCount,
      healthStatus: stats1.healthStatus
    });
    
    newBranches.push({
      id: bottomId,
      name: stats2.name || `Branch ${bottomId}`,
      slot: slotCounter++,
      startYOffset: currentYOffset,
      targetYOffset: bottomTarget,
      stickmanGif: gif2,
      createdAt: timelineOffset,
      money: stats2.money,
      monthlyWage: stats2.monthlyWage,
      currentLoan: stats2.currentLoan,
      maritalStatus: stats2.maritalStatus,
      childCount: stats2.childCount,
      healthStatus: stats2.healthStatus
    });
    
    branch.stickmanGif.remove();
  }
  
  branches = newBranches;
}

// Split a specific branch by ID
// Returns the ID of the branch that should receive event modifications (keeps original ID)
export function splitSpecificBranch(branchId: number, timelineOffset: number): number {
  const branchIndex = branches.findIndex(b => b.id === branchId);
  if (branchIndex === -1) return branchId;
  
  const branchToSplit = branches[branchIndex];
  const currentYOffset = calculateBranchYOffset(branchToSplit, timelineOffset);
  
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
    .map(b => calculateBranchYOffset(b, timelineOffset));
  
  const idealTop = currentYOffset - branchSpacing / 2;
  const idealBottom = currentYOffset + branchSpacing / 2;
  
  const topTarget = findFreePosition(idealTop, occupiedPositions, branchSpacing);
  occupiedPositions.push(topTarget);
  const bottomTarget = findFreePosition(idealBottom, occupiedPositions, branchSpacing);
  
  const newBranches: Branch[] = [];
  let slotCounter = 0;
  
  // Instead of inheriting (which includes variations), make exact copies of parent state
  // This way both branches start identical, and we'll apply the event to only one
  const stats1 = {
    money: branchToSplit.money,
    monthlyWage: branchToSplit.monthlyWage,
    currentLoan: branchToSplit.currentLoan,
    maritalStatus: branchToSplit.maritalStatus,
    childCount: branchToSplit.childCount,
    healthStatus: branchToSplit.healthStatus
  };
  const stats2 = {
    money: branchToSplit.money,
    monthlyWage: branchToSplit.monthlyWage,
    currentLoan: branchToSplit.currentLoan,
    maritalStatus: branchToSplit.maritalStatus,
    childCount: branchToSplit.childCount,
    healthStatus: branchToSplit.healthStatus
  };
  
  for (let i = 0; i < branches.length; i++) {
    if (i === branchIndex) {
      newBranches.push({
        id: topId,
        name: branchToSplit.name || `Branch ${topId}`,
        slot: slotCounter++,
        startYOffset: currentYOffset,
        targetYOffset: topTarget,
        stickmanGif: gif1,
        createdAt: timelineOffset,
        money: stats1.money,
        monthlyWage: stats1.monthlyWage,
        currentLoan: stats1.currentLoan,
        maritalStatus: stats1.maritalStatus,
        childCount: stats1.childCount,
        healthStatus: stats1.healthStatus
      });
      
      newBranches.push({
        id: bottomId,
        name: branchToSplit.name || `Branch ${bottomId}`,
        slot: slotCounter++,
        startYOffset: currentYOffset,
        targetYOffset: bottomTarget,
        stickmanGif: gif2,
        createdAt: timelineOffset,
        money: stats2.money,
        monthlyWage: stats2.monthlyWage,
        currentLoan: stats2.currentLoan,
        maritalStatus: stats2.maritalStatus,
        childCount: stats2.childCount,
        healthStatus: stats2.healthStatus
      });
      
      branches[i].stickmanGif.remove();
    } else {
      const existingBranch = branches[i];
      const existingYOffset = calculateBranchYOffset(existingBranch, timelineOffset);
      
      existingBranch.slot = slotCounter++;
      existingBranch.startYOffset = existingYOffset;
      existingBranch.targetYOffset = existingYOffset;
      
      newBranches.push(existingBranch);
    }
  }
  
  branches = newBranches;
  
  // Return the ID of the branch that should receive the event modification
  // (the one that keeps the original ID)
  return topId;
}

// Add monthly wage to all branches
export function addMonthlyWage() {
  for (const branch of branches) {
    branch.money += branch.monthlyWage;
  }
}