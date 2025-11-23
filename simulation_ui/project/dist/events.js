import { branches, splitSpecificBranch } from './branches.js';
import { EVENT_DEFINITIONS } from './eventConfig.js';
import { showEventPopup } from './eventPopups.js';
export let gameEvents = [];
export let reactions = [];
export let nextEventId = 0;
// Track currently playing TTS
let currentTTSEndTime = null;
export const markerSpacing = 400;
export const reactionDuration = markerSpacing * 1.5;
// Store event definitions with generated events for later modification
const eventDefinitionMap = new Map();
let eventQueue = [];
let lastQueueLog = 0;
// Check if TTS is currently playing
export function isTTSPlaying() {
    if (currentTTSEndTime === null)
        return false;
    const now = Date.now();
    if (now >= currentTTSEndTime) {
        currentTTSEndTime = null;
        return false;
    }
    return true;
}
// Get remaining TTS duration in seconds
export function getRemainingTTSDuration() {
    if (currentTTSEndTime === null)
        return 0;
    const now = Date.now();
    const remaining = (currentTTSEndTime - now) / 1000;
    return Math.max(0, remaining);
}
// Get upcoming events with TTS in a given range
export function getUpcomingTTSEvents(timelineOffset, lookAheadDistance) {
    var _a, _b, _c;
    const currentPosition = -timelineOffset;
    const eventsWithTTS = [];
    const now = Date.now();
    const shouldLog = now - lastQueueLog > 2000; // Log every 2 seconds
    if (shouldLog) {
        console.log(`[Queue Debug] Total queued events: ${eventQueue.length}, currentPos: ${currentPosition.toFixed(0)}`);
        lastQueueLog = now;
    }
    for (const queued of eventQueue) {
        const startYear = 2025;
        const monthIndex = (queued.year - startYear) * 12 + (queued.month - 1);
        const eventPosition = monthIndex * markerSpacing;
        if (shouldLog) {
            console.log(`  - ${queued.eventName} @ ${eventPosition}, TTS: ${(_b = (_a = queued.apiData) === null || _a === void 0 ? void 0 : _a.ttsDuration) === null || _b === void 0 ? void 0 : _b.toFixed(1)}s`);
        }
        // Check if event is ahead of us within look-ahead range
        if (eventPosition > currentPosition && eventPosition < currentPosition + lookAheadDistance) {
            if (((_c = queued.apiData) === null || _c === void 0 ? void 0 : _c.ttsDuration) && queued.apiData.ttsDuration > 0) {
                eventsWithTTS.push({
                    timelinePosition: eventPosition,
                    ttsDuration: queued.apiData.ttsDuration,
                    branchId: queued.branchId,
                    eventName: queued.eventName
                });
            }
        }
    }
    // Sort by position (closest first)
    eventsWithTTS.sort((a, b) => a.timelinePosition - b.timelinePosition);
    if (shouldLog) {
        console.log(`[Queue Debug] Found ${eventsWithTTS.length} upcoming TTS events`);
    }
    return eventsWithTTS;
}
let lastProcessLog = 0;
// Process queued events that are now on-camera and whose branches exist
export function processQueuedEvents(timelineOffset, canvasWidth) {
    if (eventQueue.length === 0)
        return;
    const now = Date.now();
    const shouldLog = now - lastProcessLog > 3000;
    // Calculate visible range (add buffer for off-screen markers)
    const visibleStart = -timelineOffset - 800;
    const visibleEnd = -timelineOffset + canvasWidth + 1000;
    if (shouldLog) {
        console.log(`[Process Debug] Visible range: ${visibleStart.toFixed(0)} to ${visibleEnd.toFixed(0)}`);
        lastProcessLog = now;
    }
    const eventsToProcess = [];
    for (const queued of eventQueue) {
        // Calculate world position of this event
        const startYear = 2025;
        const monthIndex = (queued.year - startYear) * 12 + (queued.month - 1);
        const eventWorldX = monthIndex * markerSpacing;
        // Check if event is in visible range
        if (eventWorldX >= visibleStart && eventWorldX <= visibleEnd) {
            // Check if branch exists now
            const branchExists = branches.find(b => b.id === queued.branchId);
            if (branchExists) {
                eventsToProcess.push(queued);
            }
            else if (shouldLog) {
                console.log(`  ✗ Event "${queued.eventName}" @ ${eventWorldX} - branch #${queued.branchId} doesn't exist yet`);
            }
        }
    }
    // Create actual GameEvents for the queued events that are ready
    for (const queued of eventsToProcess) {
        console.log(`🎬 Materializing queued event "${queued.eventName}" for branch #${queued.branchId} (now on-camera)`);
        // Create the actual event
        const eventDef = EVENT_DEFINITIONS.find(e => e.name === queued.eventName);
        if (!eventDef)
            continue;
        const startYear = 2025;
        const monthIndex = (queued.year - startYear) * 12 + (queued.month - 1);
        // Check if event is in the past
        const stickmanWorldX = 200;
        const currentMonthIndex = Math.floor((stickmanWorldX - timelineOffset) / markerSpacing);
        if (monthIndex > currentMonthIndex) {
            const eventId = nextEventId++;
            const newEvent = {
                id: eventId,
                branchId: queued.branchId,
                monthIndex: monthIndex,
                eventName: eventDef.name,
                description: eventDef.description,
                triggered: false,
                causesSplit: eventDef.causesSplit || false,
                reactionType: eventDef.reactionType,
                reactionContent: eventDef.reactionContent,
                apiData: queued.apiData
            };
            eventDefinitionMap.set(eventId, eventDef);
            gameEvents.push(newEvent);
            const monthStr = queued.month < 10 ? `0${queued.month}` : `${queued.month}`;
            console.log(`  ✓ Created GameEvent for branch #${queued.branchId} at ${queued.year}-${monthStr}`);
        }
        else {
            console.log(`  ✗ Event "${queued.eventName}" is in the past - skipping`);
        }
        // Remove from queue
        eventQueue = eventQueue.filter(e => e !== queued);
    }
    if (eventsToProcess.length > 0) {
        console.log(`✓ Processed ${eventsToProcess.length} queued event(s), ${eventQueue.length} remaining in queue`);
    }
}
// Remove old function - no longer needed
// applyQueuedEvents is replaced by processQueuedEvents
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
// All events are queued and only materialized when on-camera
export function generateEventFromAPI(eventName, year, month, branchId, timelineOffset, apiData) {
    // Find the event definition
    const eventDef = EVENT_DEFINITIONS.find(e => e.name === eventName);
    if (!eventDef) {
        console.warn(`Event "${eventName}" not found in EVENT_DEFINITIONS`);
        return false;
    }
    // Always queue the event (regardless of branch existence)
    console.log(`📥 Queueing event "${eventName}" for branch #${branchId} at ${year}-${month}`);
    eventQueue.push({
        branchId,
        eventName,
        year,
        month,
        apiData,
        queuedAt: timelineOffset
    });
    console.log(`  - Queue size: ${eventQueue.length}`);
    console.log(`  - Event will be materialized when on-camera and branch exists`);
    return true;
}
// Check if stickman has passed events and trigger reactions
export function checkEventTriggers(timelineOffset, onBranchModified) {
    var _a, _b;
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
            // Tell audio mixer to mix in TTS
            if ((_a = event.apiData) === null || _a === void 0 ? void 0 : _a.ttsAudioId) {
                fetch('http://localhost:5000/play_event_audio', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ audioId: event.apiData.ttsAudioId })
                }).catch(err => {
                    console.warn('Failed to trigger audio playback:', err);
                });
                // Track when this TTS will finish
                if (event.apiData.ttsDuration) {
                    currentTTSEndTime = Date.now() + (event.apiData.ttsDuration * 1000);
                    console.log(`🎵 TTS started: ${event.apiData.ttsAudioId} (${(_b = event.apiData.ttsDuration) === null || _b === void 0 ? void 0 : _b.toFixed(2)}s) - will finish at ${new Date(currentTTSEndTime).toISOString().substr(11, 8)}`);
                }
            }
            const targetBranch = branches.find(b => b.id === event.branchId);
            showEventPopup(event.eventName, {
                description: event.description,
                branchId: event.branchId,
                branchName: targetBranch === null || targetBranch === void 0 ? void 0 : targetBranch.name,
                monthIndex: event.monthIndex,
                reactionContent: event.reactionContent,
                apiData: event.apiData
            });
            console.log(`Event "${event.eventName}" triggered on branch #${event.branchId}!`);
            // For life-altering events: split FIRST, then modify only the original branch
            // This way the split creates an alternate timeline with the OLD stats
            if (event.causesSplit) {
                console.log(`Life-altering event! Splitting branch #${event.branchId}`);
                const originalBranchId = event.branchId; // Remember original ID
                // Perform the split
                splitSpecificBranch(event.branchId, timelineOffset);
                // Queued events will be processed automatically in the render loop
                // when they come on-camera and their branches exist
                // Now modify ONLY the branch that kept the original ID (not the alternate)
                const originalBranch = branches.find(b => b.id === originalBranchId);
                if (originalBranch) {
                    console.log(`  Modifying ONLY original branch #${originalBranchId} (alternate branch keeps old stats)`);
                    console.log(`  Before: Money=${originalBranch.money}, Wage=${originalBranch.monthlyWage}, Status=${originalBranch.maritalStatus}, Kids=${originalBranch.childCount}`);
                    // Apply API data if present (before modifyBranch so event can override if needed)
                    if (event.apiData) {
                        if (event.apiData.name !== undefined) {
                            originalBranch.name = event.apiData.name;
                            console.log(`  - Applied API name: ${event.apiData.name}`);
                        }
                        if (event.apiData.monthlyWage !== undefined) {
                            originalBranch.monthlyWage = event.apiData.monthlyWage;
                            console.log(`  - Applied API wage: ${event.apiData.monthlyWage}`);
                        }
                        if (event.apiData.currentLoan !== undefined) {
                            originalBranch.currentLoan = event.apiData.currentLoan;
                            console.log(`  - Applied API loan: ${event.apiData.currentLoan}`);
                        }
                        if (event.apiData.maritalStatus !== undefined) {
                            originalBranch.maritalStatus = event.apiData.maritalStatus;
                            console.log(`  - Applied API status: ${event.apiData.maritalStatus}`);
                        }
                        if (event.apiData.childCount !== undefined) {
                            originalBranch.childCount = event.apiData.childCount;
                            console.log(`  - Applied API children: ${event.apiData.childCount}`);
                        }
                        if (event.apiData.healthStatus !== undefined) {
                            originalBranch.healthStatus = event.apiData.healthStatus;
                            console.log(`  - Applied API health: ${event.apiData.healthStatus}`);
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
                        if (event.apiData.name !== undefined) {
                            branch.name = event.apiData.name;
                            console.log(`  - Applied API name: ${event.apiData.name}`);
                        }
                        if (event.apiData.monthlyWage !== undefined) {
                            branch.monthlyWage = event.apiData.monthlyWage;
                            console.log(`  - Applied API wage: ${event.apiData.monthlyWage}`);
                        }
                        if (event.apiData.currentLoan !== undefined) {
                            branch.currentLoan = event.apiData.currentLoan;
                            console.log(`  - Applied API loan: ${event.apiData.currentLoan}`);
                        }
                        if (event.apiData.maritalStatus !== undefined) {
                            branch.maritalStatus = event.apiData.maritalStatus;
                            console.log(`  - Applied API status: ${event.apiData.maritalStatus}`);
                        }
                        if (event.apiData.childCount !== undefined) {
                            branch.childCount = event.apiData.childCount;
                            console.log(`  - Applied API children: ${event.apiData.childCount}`);
                        }
                        if (event.apiData.healthStatus !== undefined) {
                            branch.healthStatus = event.apiData.healthStatus;
                            console.log(`  - Applied API health: ${event.apiData.healthStatus}`);
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
