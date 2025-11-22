import { GameEvent, Reaction } from './types.js';
import { branches, splitSpecificBranch } from './branches.js';
import { EVENT_DEFINITIONS, EventDefinition } from './eventConfig.js';

export let gameEvents: GameEvent[] = [];
export let reactions: Reaction[] = [];
export let nextEventId = 0;

export const markerSpacing = 400;
export const reactionDuration = markerSpacing * 1.5;

// Store event definitions with generated events for later modification
const eventDefinitionMap = new Map<number, EventDefinition>();

// Generate a random event from the event definitions
export function generateRandomEvent(timelineOffset: number) {
  if (branches.length === 0) return;
  
  // Pick a random branch
  const randomBranch = branches[Math.floor(Math.random() * branches.length)];
  
  // Calculate next month position
  const stickmanWorldX = 200;
  const currentMonthIndex = Math.floor((stickmanWorldX - timelineOffset) / markerSpacing);
  const nextMonthIndex = currentMonthIndex + 1;
  
  // Pick a random event from EVENT_DEFINITIONS
  const randomEventDef = EVENT_DEFINITIONS[Math.floor(Math.random() * EVENT_DEFINITIONS.length)];
  
  const eventId = nextEventId++;
  const newEvent: GameEvent = {
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
export function generateLifeAlteringEvent(timelineOffset: number) {
  if (branches.length === 0) return;
  
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
  const newEvent: GameEvent = {
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

export function getEventDefinition(eventId: number): EventDefinition | undefined {
  return eventDefinitionMap.get(eventId);
}

// Check if stickman has passed events and trigger reactions
export function checkEventTriggers(timelineOffset: number, onBranchModified?: () => void) {
  const stickmanWorldX = 200;
  
  for (const event of gameEvents) {
    if (event.triggered) continue;
    
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
        const eventDef = eventDefinitionMap.get(event.id);
        if (eventDef?.modifyBranch) {
          const originalBranch = branches.find(b => b.id === originalBranchId);
          if (originalBranch) {
            console.log(`  Modifying ONLY original branch #${originalBranchId} (alternate branch keeps old stats)`);
            console.log(`  Before: Money=${originalBranch.money}, Wage=${originalBranch.monthlyWage}, Status=${originalBranch.maritalStatus}, Kids=${originalBranch.childCount}`);
            eventDef.modifyBranch(originalBranch);
            console.log(`  After:  Money=${originalBranch.money}, Wage=${originalBranch.monthlyWage}, Status=${originalBranch.maritalStatus}, Kids=${originalBranch.childCount}`);
            console.log(`✓ Modified branch #${originalBranchId} stats due to "${event.eventName}"`);
          }
        }
        
        if (onBranchModified) onBranchModified();
      } else {
        // Non-splitting events: just modify the branch normally
        const eventDef = eventDefinitionMap.get(event.id);
        if (eventDef?.modifyBranch) {
          const branch = branches.find(b => b.id === event.branchId);
          if (branch) {
            console.log(`  Before: Money=${branch.money}, Wage=${branch.monthlyWage}, Status=${branch.maritalStatus}, Kids=${branch.childCount}`);
            eventDef.modifyBranch(branch);
            console.log(`  After:  Money=${branch.money}, Wage=${branch.monthlyWage}, Status=${branch.maritalStatus}, Kids=${branch.childCount}`);
            console.log(`✓ Modified branch #${event.branchId} stats due to "${event.eventName}"`);
            if (onBranchModified) onBranchModified();
          }
        } else {
          console.log(`  (No modifyBranch function for this event)`);
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