import { GameEvent, Reaction } from './types.js';
import { branches, splitSpecificBranch } from './branches.js';
import { EVENT_DEFINITIONS } from './eventConfig.js';

export let gameEvents: GameEvent[] = [];
export let reactions: Reaction[] = [];
export let nextEventId = 0;

export const markerSpacing = 400;
export const reactionDuration = markerSpacing * 1.5;

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
  
  const newEvent: GameEvent = {
    id: nextEventId++,
    branchId: randomBranch.id,
    monthIndex: nextMonthIndex,
    eventName: randomEventDef.name,
    description: randomEventDef.description,
    triggered: false,
    causesSplit: randomEventDef.causesSplit || false,
    reactionType: randomEventDef.reactionType,
    reactionContent: randomEventDef.reactionContent
  };
  
  gameEvents.push(newEvent);
  console.log(`Generated event "${randomEventDef.name}" for branch #${randomBranch.id} at month ${nextMonthIndex}`);
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
  
  const newEvent: GameEvent = {
    id: nextEventId++,
    branchId: randomBranch.id,
    monthIndex: nextMonthIndex,
    eventName: randomEventDef.name,
    description: randomEventDef.description,
    triggered: false,
    causesSplit: true,
    reactionType: randomEventDef.reactionType,
    reactionContent: randomEventDef.reactionContent
  };
  
  gameEvents.push(newEvent);
  console.log(`Generated LIFE-ALTERING event "${randomEventDef.name}" for branch #${randomBranch.id} - WILL SPLIT!`);
}

// Check if stickman has passed events and trigger reactions
export function checkEventTriggers(timelineOffset: number) {
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
      
      console.log(`Event "${event.eventName}" triggered on branch #${event.branchId}!`);
      
      if (event.causesSplit) {
        console.log(`Life-altering event! Splitting branch #${event.branchId}`);
        splitSpecificBranch(event.branchId, timelineOffset);
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