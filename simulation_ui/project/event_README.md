# Event System Configuration

## How to Customize Event Reactions

All events are configured in **`src/eventConfig.ts`**

### Adding/Editing Events

Each event has this structure:

```typescript
{
  name: "event_name",
  description: "What happens",
  probability: 0.1,  // Not used yet, but for future weighted selection
  causesSplit: true,  // Optional: true = life-altering event that splits timeline
  reactionType: 'emoji',  // 'emoji' or 'image'
  reactionContent: '😊'  // Emoji character OR path to PNG file
}
```

### Using Emojis

For emoji reactions, set:
- `reactionType: 'emoji'`
- `reactionContent: '😊'` (paste the emoji directly)

Examples:
```typescript
{
  name: "promotion",
  description: "Got promoted!",
  probability: 0.12,
  reactionType: 'emoji',
  reactionContent: '🎉'
}
```

### Using PNG Images

For custom PNG reactions:

1. Put your PNG file in the project root (same folder as `index.html`)
2. Set:
   - `reactionType: 'image'`
   - `reactionContent: 'your_image.png'` (filename)

Example:
```typescript
{
  name: "house_fire",
  description: "House caught fire",
  probability: 0.001,
  causesSplit: true,
  reactionType: 'image',
  reactionContent: 'fire_icon.png'  // Must be in project root
}
```

### Life-Altering Events

Events with `causesSplit: true` will:
- Always split the timeline when triggered
- Show up with gold borders
- Be selected when clicking "Generate Life-Altering Event"

### Current Event List

Check `src/eventConfig.ts` to see all configured events including:
- Job events (promotion, layoff, new job)
- Life events (marriage, children, divorce)
- Financial events (inheritance, bonus)
- House events (damage, renovation)
- And more!

### Compiling After Changes

After editing `eventConfig.ts`, run:
```bash
npm run build
```

Then refresh your browser to see the changes.