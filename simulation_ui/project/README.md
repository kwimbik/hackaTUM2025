# Timeline Visualization Project - File Structure

This project has been refactored into multiple modules for better organization and maintainability.

## File Organization

### `types.ts`
- Contains all TypeScript interfaces and type definitions
- `Branch`: Branch data structure including stats
- `GameEvent`: Event markers on timeline
- `Reaction`: Emoji reactions when events trigger
- `BranchStats`: Stats for money, wage, marriage, kids

### `branches.ts`
- Branch management logic
- Functions: create, split, reset, position branches
- Stats generation and inheritance (parent stats passed to children)
- `addMonthlyWage()`: Adds monthly wage to all branches

### `events.ts`
- Event generation and handling
- `generateRandomEvent()`: Creates happy/sad events
- `generateLifeAlteringEvent()`: Creates events that ALWAYS split timeline
- `checkEventTriggers()`: Detects when stickman passes events

### `camera.ts`
- Camera/dragging system
- Isometric transformation functions
- Mouse drag event handlers
- Visibility checking for auto-pause

### `ui.ts`
- Stats table updates
- Displays: Branch #, Money, Monthly Wage, Status, Kids
- Sorted by branch ID in ascending order

### `rendering.ts`
- All drawing functions
- Timeline lines, markers, events, reactions, branch numbers
- Stickman GIF positioning

### `main.ts`
- Main coordination and animation loop
- Button event handlers
- Monthly wage tracking (updates when month changes)
- Initialization

## Key Features

### Monthly Wage System
- Each branch earns monthly wage
- Money automatically increases each month
- Displayed in stats table

### Life-Altering Events
- ALWAYS cause timeline splits (100% chance)
- Larger gold-bordered stars
- Child timelines inherit parent stats with small variations

### Stats Inheritance
- When splitting, children inherit parent's:
  - Money (±$5k variation)
  - Monthly Wage (±$500 variation)  
  - Marital Status (same)
  - Children status (same)

## Build Instructions

Compile TypeScript files to JavaScript:
```bash
tsc types.ts branches.ts events.ts camera.ts ui.ts rendering.ts main.ts --target ES6 --module ES6 --outDir dist
```

Or use your existing build system that compiles to `./dist/`

The HTML now uses ES6 modules: `<script type="module" src="./dist/main.js"></script>`
