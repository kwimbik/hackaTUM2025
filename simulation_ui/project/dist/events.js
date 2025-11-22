import { branches, splitSpecificBranch } from './branches.js';
import { EVENT_DEFINITIONS } from './eventConfig.js';
export let gameEvents = [];
export let reactions = [];
export let nextEventId = 0;
export const markerSpacing = 400;
export const reactionDuration = markerSpacing * 1.5;
// Store event definitions with generated events for later modification
const eventDefinitionMap = new Map();
// Generate a random event from the event definitions
export function generateRandomEvent(timelineOffset) {
    if (branches.length === 0)
        return;
    // Pick a random branch
    const randomBranch = branches[Math.floor(Math.random() * branches.length)];
    // Calculate next month position
    const stickmanWorldX = 200;
    const currentMonthIndex = Math.floor((stickmanWorldX - timelineOffset) / markerSpacing);
    const nextMonthIndex = currentMonthIndex + 1;
    // Pick a random event from EVENT_DEFINITIONS
    const randomEventDef = EVENT_DEFINITIONS[Math.floor(Math.random() * EVENT_DEFINITIONS.length)];
    const eventId = nextEventId++;
    const newEvent = {
        id: eventId,
        branchId: randomBranch.id,
        monthIndex: nextMonthIndex,
        eventName: randomEventDef.name,
        description: randomEventDef.description,
        triggered: false,
        causesSplit: randomEventDef.causesSplit || false,
        reactionType: randomEventDef.reactionType,
        reactionContent: randomEventDef.reactionContent
    };
    // Store the event definition for later branch modification
    eventDefinitionMap.set(eventId, randomEventDef);
    gameEvents.push(newEvent);
    console.log(`✓ Generated event "${randomEventDef.name}" for branch #${randomBranch.id} at month ${nextMonthIndex}`);
    console.log(`  - Description: ${randomEventDef.description}`);
    console.log(`  - Has modifyBranch: ${!!randomEventDef.modifyBranch}`);
    console.log(`  - Will split: ${!!randomEventDef.causesSplit}`);
}
// Generate a life-altering event (picks from events that have causesSplit=true)
export function generateLifeAlteringEvent(timelineOffset) {
    if (branches.length === 0)
        return;
    // Pick a random branch
    const randomBranch = branches[Math.floor(Math.random() * branches.length)];
    // Calculate next month position
    const stickmanWorldX = 200;
    const currentMonthIndex = Math.floor((stickmanWorldX - timelineOffset) / markerSpacing);
    const nextMonthIndex = currentMonthIndex + 1;
    // Filter to only life-altering events (those with causesSplit=true)
    const lifeAlteringEvents = EVENT_DEFINITIONS.filter(e => e.causesSplit);
    if (lifeAlteringEvents.length === 0) {
        console.warn("No life-altering events defined in eventConfig!");
        return;
    }
    // Pick a random life-altering event
    const randomEventDef = lifeAlteringEvents[Math.floor(Math.random() * lifeAlteringEvents.length)];
    const eventId = nextEventId++;
    const newEvent = {
        id: eventId,
        branchId: randomBranch.id,
        monthIndex: nextMonthIndex,
        eventName: randomEventDef.name,
        description: randomEventDef.description,
        triggered: false,
        causesSplit: true,
        reactionType: randomEventDef.reactionType,
        reactionContent: randomEventDef.reactionContent
    };
    // Store the event definition for later branch modification
    eventDefinitionMap.set(eventId, randomEventDef);
    gameEvents.push(newEvent);
    console.log(`Generated LIFE-ALTERING event "${randomEventDef.name}" for branch #${randomBranch.id} - WILL SPLIT!`);
}
export function getEventDefinition(eventId) {
    return eventDefinitionMap.get(eventId);
}
// Generate an event from external API data
export function generateEventFromAPI(eventName, year, month, branchId, timelineOffset, apiData) {
    // Find the event definition
    const eventDef = EVENT_DEFINITIONS.find(e => e.name === eventName);
    if (!eventDef) {
        console.warn(`Event "${eventName}" not found in EVENT_DEFINITIONS`);
        return null;
    }
    // Calculate the month index based on year and month
    // Starting from Jan 2025 (month 0)
    const startYear = 2025;
    const monthIndex = (year - startYear) * 12 + (month - 1);
    // Check if event is in the past (stickman already passed it)
    const stickmanWorldX = 200;
    const currentMonthIndex = Math.floor((stickmanWorldX - timelineOffset) / markerSpacing);
    if (monthIndex <= currentMonthIndex) {
        console.warn(`Event "${eventName}" is in the past (month ${monthIndex} vs current ${currentMonthIndex}) - ignoring`);
        return null;
    }
    const eventId = nextEventId++;
    const newEvent = {
        id: eventId,
        branchId: branchId,
        monthIndex: monthIndex,
        eventName: eventDef.name,
        description: eventDef.description,
        triggered: false,
        causesSplit: eventDef.causesSplit || false,
        reactionType: eventDef.reactionType,
        reactionContent: eventDef.reactionContent,
        apiData: apiData // Store API data to apply when event triggers
    };
    // Store the event definition for later branch modification
    eventDefinitionMap.set(eventId, eventDef);
    gameEvents.push(newEvent);
    const monthStr = month < 10 ? `0${month}` : `${month}`;
    console.log(`✓ Generated API event "${eventDef.name}" for branch #${branchId} at ${year}-${monthStr}`);
    if (apiData) {
        console.log(`  - Will apply API data when event triggers`);
    }
    return newEvent;
}
// Check if stickman has passed events and trigger reactions
export function checkEventTriggers(timelineOffset, onBranchModified) {
    const stickmanWorldX = 200;
    for (const event of gameEvents) {
        if (event.triggered)
            continue;
        const eventWorldX = event.monthIndex * markerSpacing + timelineOffset;
        if (stickmanWorldX >= eventWorldX) {
            event.triggered = true;
            reactions.push({
                branchId: event.branchId,
                startOffset: timelineOffset,
                duration: reactionDuration,
                reactionType: event.reactionType,
                reactionContent: event.reactionContent
            });
            console.log(`🎯 Event "${event.eventName}" triggered on branch #${event.branchId}!`);
            // For life-altering events: split FIRST, then modify only the original branch
            // This way the split creates an alternate timeline with the OLD stats
            if (event.causesSplit) {
                console.log(`Life-altering event! Splitting branch #${event.branchId}`);
                const originalBranchId = event.branchId; // Remember original ID
                splitSpecificBranch(event.branchId, timelineOffset);
                // Now modify ONLY the branch that kept the original ID (not the alternate)
                const originalBranch = branches.find(b => b.id === originalBranchId);
                if (originalBranch) {
                    console.log(`  Modifying ONLY original branch #${originalBranchId} (alternate branch keeps old stats)`);
                    console.log(`  Before: Money=${originalBranch.money}, Wage=${originalBranch.monthlyWage}, Status=${originalBranch.maritalStatus}, Kids=${originalBranch.childCount}`);
                    // Apply API data if present (before modifyBranch so event can override if needed)
                    if (event.apiData) {
                        if (event.apiData.monthlyWage !== undefined) {
                            originalBranch.monthlyWage = event.apiData.monthlyWage;
                            console.log(`  - Applied API wage: ${event.apiData.monthlyWage}`);
                        }
                        if (event.apiData.maritalStatus !== undefined) {
                            originalBranch.maritalStatus = event.apiData.maritalStatus;
                            console.log(`  - Applied API status: ${event.apiData.maritalStatus}`);
                        }
                        if (event.apiData.childCount !== undefined) {
                            originalBranch.childCount = event.apiData.childCount;
                            console.log(`  - Applied API children: ${event.apiData.childCount}`);
                        }
                    }
                    // Apply event's modifyBranch function if present
                    const eventDef = eventDefinitionMap.get(event.id);
                    if (eventDef === null || eventDef === void 0 ? void 0 : eventDef.modifyBranch) {
                        eventDef.modifyBranch(originalBranch);
                    }
                    console.log(`  After:  Money=${originalBranch.money}, Wage=${originalBranch.monthlyWage}, Status=${originalBranch.maritalStatus}, Kids=${originalBranch.childCount}`);
                    console.log(`✓ Modified branch #${originalBranchId} stats due to "${event.eventName}"`);
                }
                if (onBranchModified)
                    onBranchModified();
            }
            else {
                // Non-splitting events: just modify the branch normally
                const branch = branches.find(b => b.id === event.branchId);
                if (branch) {
                    console.log(`  Before: Money=${branch.money}, Wage=${branch.monthlyWage}, Status=${branch.maritalStatus}, Kids=${branch.childCount}`);
                    // Apply API data if present (before modifyBranch so event can override if needed)
                    if (event.apiData) {
                        if (event.apiData.monthlyWage !== undefined) {
                            branch.monthlyWage = event.apiData.monthlyWage;
                            console.log(`  - Applied API wage: ${event.apiData.monthlyWage}`);
                        }
                        if (event.apiData.maritalStatus !== undefined) {
                            branch.maritalStatus = event.apiData.maritalStatus;
                            console.log(`  - Applied API status: ${event.apiData.maritalStatus}`);
                        }
                        if (event.apiData.childCount !== undefined) {
                            branch.childCount = event.apiData.childCount;
                            console.log(`  - Applied API children: ${event.apiData.childCount}`);
                        }
                    }
                    // Apply event's modifyBranch function if present
                    const eventDef = eventDefinitionMap.get(event.id);
                    if (eventDef === null || eventDef === void 0 ? void 0 : eventDef.modifyBranch) {
                        eventDef.modifyBranch(branch);
                    }
                    console.log(`  After:  Money=${branch.money}, Wage=${branch.monthlyWage}, Status=${branch.maritalStatus}, Kids=${branch.childCount}`);
                    console.log(`✓ Modified branch #${event.branchId} stats due to "${event.eventName}"`);
                    if (onBranchModified)
                        onBranchModified();
                }
                else {
                    console.log(`  (No branch found for non-splitting event)`);
                }
            }
        }
    }
    reactions = reactions.filter(reaction => {
        const elapsed = reaction.startOffset - timelineOffset;
        return elapsed < reaction.duration;
    });
}
// Clear all events and reactions
export function clearEvents() {
    gameEvents = [];
    reactions = [];
}
