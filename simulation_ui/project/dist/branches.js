export let branches = [];
// Constants
export const branchSpacing = 80;
export const branchTransitionDistance = 200;
// Generate random stats for a branch
export function generateRandomStats() {
    return {
        money: Math.floor(Math.random() * 100000) + 20000,
        monthlyWage: Math.floor(Math.random() * 5000) + 2000,
        maritalStatus: 'Single',
        childCount: 0
    };
}
// Inherit stats from parent with small variations
export function inheritStats(parent) {
    return {
        money: parent.money + Math.floor((Math.random() - 0.5) * 10000), // ±5k variation
        monthlyWage: parent.monthlyWage + Math.floor((Math.random() - 0.5) * 1000), // ±500 variation
        maritalStatus: parent.maritalStatus,
        childCount: parent.childCount
    };
}
// Find a free Y position near targetY that doesn't overlap with existing branches
export function findFreePosition(targetY, occupiedPositions, minSpacing) {
    const isFree = occupiedPositions.every(pos => Math.abs(pos - targetY) >= minSpacing);
    if (isFree)
        return targetY;
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
export function createStickmanGif() {
    const gif = document.createElement("img");
    gif.src = "stickman_run.gif";
    gif.style.position = "absolute";
    gif.style.pointerEvents = "none";
    gif.style.zIndex = "5";
    gif.style.width = "110px";
    gif.style.height = "70px";
    const container = document.querySelector(".canvas-container");
    container.appendChild(gif);
    return gif;
}
// Calculate current yOffset based on distance traveled since creation
export function calculateBranchYOffset(branch, timelineOffset) {
    const distanceTraveled = branch.createdAt - timelineOffset;
    const progress = Math.min(distanceTraveled / branchTransitionDistance, 1);
    return branch.startYOffset + (branch.targetYOffset - branch.startYOffset) * progress;
}
// Initialize with the original GIF as first branch
export function initBranches(timelineOffset) {
    const originalGif = document.getElementById("stickmanGif");
    const stats = generateRandomStats();
    branches = [{
            id: 0,
            slot: 0,
            startYOffset: 0,
            targetYOffset: 0,
            stickmanGif: originalGif,
            createdAt: timelineOffset,
            money: stats.money,
            monthlyWage: stats.monthlyWage,
            maritalStatus: stats.maritalStatus,
            childCount: stats.childCount
        }];
}
// Reset to single timeline
export function resetBranches(timelineOffset) {
    for (let i = 1; i < branches.length; i++) {
        branches[i].stickmanGif.remove();
    }
    if (branches.length > 0) {
        const stats = generateRandomStats();
        branches[0].id = 0;
        branches[0].slot = 0;
        branches[0].startYOffset = 0;
        branches[0].targetYOffset = 0;
        branches[0].createdAt = timelineOffset;
        branches[0].money = stats.money;
        branches[0].monthlyWage = stats.monthlyWage;
        branches[0].maritalStatus = stats.maritalStatus;
        branches[0].childCount = stats.childCount;
        branches = [branches[0]];
    }
}
// Split all branches
export function splitAllBranches(timelineOffset) {
    const newBranches = [];
    const usedIds = new Set();
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
            slot: slotCounter++,
            startYOffset: currentYOffset,
            targetYOffset: topTarget,
            stickmanGif: gif1,
            createdAt: timelineOffset,
            money: stats1.money,
            monthlyWage: stats1.monthlyWage,
            maritalStatus: stats1.maritalStatus,
            childCount: stats1.childCount
        });
        newBranches.push({
            id: bottomId,
            slot: slotCounter++,
            startYOffset: currentYOffset,
            targetYOffset: bottomTarget,
            stickmanGif: gif2,
            createdAt: timelineOffset,
            money: stats2.money,
            monthlyWage: stats2.monthlyWage,
            maritalStatus: stats2.maritalStatus,
            childCount: stats2.childCount
        });
        branch.stickmanGif.remove();
    }
    branches = newBranches;
}
// Split a specific branch by ID
// Returns the ID of the branch that should receive event modifications (keeps original ID)
export function splitSpecificBranch(branchId, timelineOffset) {
    const branchIndex = branches.findIndex(b => b.id === branchId);
    if (branchIndex === -1)
        return branchId;
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
    const newBranches = [];
    let slotCounter = 0;
    // Instead of inheriting (which includes variations), make exact copies of parent state
    // This way both branches start identical, and we'll apply the event to only one
    const stats1 = {
        money: branchToSplit.money,
        monthlyWage: branchToSplit.monthlyWage,
        maritalStatus: branchToSplit.maritalStatus,
        childCount: branchToSplit.childCount
    };
    const stats2 = {
        money: branchToSplit.money,
        monthlyWage: branchToSplit.monthlyWage,
        maritalStatus: branchToSplit.maritalStatus,
        childCount: branchToSplit.childCount
    };
    for (let i = 0; i < branches.length; i++) {
        if (i === branchIndex) {
            newBranches.push({
                id: topId,
                slot: slotCounter++,
                startYOffset: currentYOffset,
                targetYOffset: topTarget,
                stickmanGif: gif1,
                createdAt: timelineOffset,
                money: stats1.money,
                monthlyWage: stats1.monthlyWage,
                maritalStatus: stats1.maritalStatus,
                childCount: stats1.childCount
            });
            newBranches.push({
                id: bottomId,
                slot: slotCounter++,
                startYOffset: currentYOffset,
                targetYOffset: bottomTarget,
                stickmanGif: gif2,
                createdAt: timelineOffset,
                money: stats2.money,
                monthlyWage: stats2.monthlyWage,
                maritalStatus: stats2.maritalStatus,
                childCount: stats2.childCount
            });
            branches[i].stickmanGif.remove();
        }
        else {
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
