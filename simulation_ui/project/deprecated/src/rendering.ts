import { branches, calculateBranchYOffset } from './branches.js';
import { gameEvents, reactions, markerSpacing } from './events.js';
import { isoTransform } from './camera.js';

const safeExtraMarkers = 4;

// Draw timeline lines for all branches
export function drawTimelineLines(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, timelineOffset: number) {
  const lineStartOffset = -800;
  const lineLength = canvas.width + 1000;
  
  ctx.strokeStyle = "black";
  ctx.lineWidth = 6;
  
  for (const branch of branches) {
    const yOffset = calculateBranchYOffset(branch, timelineOffset);
    const [startX, startY] = isoTransform(lineStartOffset, yOffset);
    const [endX, endY] = isoTransform(lineLength, yOffset);
    
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  }
}

// Draw event markers on timeline
export function drawEventMarkers(ctx: CanvasRenderingContext2D, timelineOffset: number) {
  for (const event of gameEvents) {
    const branch = branches.find(b => b.id === event.branchId);
    if (!branch) continue;
    
    const eventWorldX = event.monthIndex * markerSpacing + timelineOffset;
    const yOffset = calculateBranchYOffset(branch, timelineOffset);
    const [ex, ey] = isoTransform(eventWorldX, yOffset);
    
    const size = 20;
    const isLifeAltering = event.causesSplit;
    const actualSize = isLifeAltering ? size * 1.5 : size;
    
    // Color based on whether triggered
    ctx.fillStyle = event.triggered ? "#B0B0B0" : "#4CAF50";
    
    // Draw star shape
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
    
    // Draw event name above the star with background for visibility
    const textPadding = 4;
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    
    // Measure text width for background
    const textWidth = ctx.measureText(event.eventName).width;
    const textHeight = 14;
    const bgX = ex - textWidth / 2 - textPadding;
    const bgY = ey - actualSize - textHeight - textPadding - 5;
    
    // Draw white background rectangle
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.fillRect(bgX, bgY, textWidth + textPadding * 2, textHeight + textPadding);
    
    // Draw black border
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    ctx.strokeRect(bgX, bgY, textWidth + textPadding * 2, textHeight + textPadding);
    
    // Draw text
    ctx.fillStyle = "black";
    ctx.fillText(event.eventName, ex, ey - actualSize - 5);
    
    // Reset text alignment for other drawing
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }
}

// Draw markers for all branches
export function drawMarkers(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, timelineOffset: number) {
  ctx.strokeStyle = "black";
  ctx.fillStyle = "black";
  ctx.lineWidth = 3;
  ctx.font = "16px Arial";

  const minIndex = Math.floor((-timelineOffset) / markerSpacing);
  const maxIndex = Math.ceil((-timelineOffset + canvas.width) / markerSpacing);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const startYear = 2025;

  for (const branch of branches) {
    const yOffset = calculateBranchYOffset(branch, timelineOffset);
    
    for (let i = minIndex - safeExtraMarkers; i <= maxIndex + safeExtraMarkers; i++) {
      const worldX = i * markerSpacing + timelineOffset;
      const [mx, my] = isoTransform(worldX, yOffset);

      // Marker line
      ctx.beginPath();
      ctx.moveTo(mx, my - 15);
      ctx.lineTo(mx, my + 15);
      ctx.stroke();

      // Label
      const monthIndex = ((i % 12) + 12) % 12;
      const year = startYear + Math.floor(i / 12);
      const label = `${months[monthIndex]} ${year}`;
      const textWidth = ctx.measureText(label).width;
      ctx.fillText(label, mx - textWidth / 2, my - 20);
    }
  }
}

// Draw reaction emojis/images next to stickmen
export function drawReactions(ctx: CanvasRenderingContext2D, timelineOffset: number) {
  const stickmanWorldX = 200;
  
  for (const reaction of reactions) {
    const branch = branches.find(b => b.id === reaction.branchId);
    if (!branch) continue;
    
    const yOffset = calculateBranchYOffset(branch, timelineOffset);
    const [x, y] = isoTransform(stickmanWorldX, yOffset);
    
    const emojiOffsetX = -20;
    const emojiOffsetY = -50;
    
    if (reaction.reactionType === 'emoji') {
      // Draw emoji
      const emojiSize = 30;
      ctx.font = `${emojiSize}px Arial`;
      ctx.fillText(
        reaction.reactionContent,
        x + emojiOffsetX,
        y + emojiOffsetY
      );
    } else if (reaction.reactionType === 'image') {
      // Draw image (PNG)
      const img = new Image();
      img.src = reaction.reactionContent;
      // Only draw if image is loaded
      if (img.complete) {
        const imgSize = 40;
        ctx.drawImage(
          img,
          x + emojiOffsetX - imgSize/2,
          y + emojiOffsetY - imgSize/2,
          imgSize,
          imgSize
        );
      }
    }
  }
}

// Draw branch numbers on each timeline
export function drawBranchNumbers(ctx: CanvasRenderingContext2D, timelineOffset: number) {
  ctx.fillStyle = "blue";
  ctx.font = "bold 20px Arial";
  
  const stickmanWorldX = 200;
  
  for (const branch of branches) {
    const yOffset = calculateBranchYOffset(branch, timelineOffset);
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

// Update all stickman positions
export function updateStickmanPositions(timelineOffset: number) {
  const stickmanWorldX = 200;
  const stickmanOffsetY = 10;

  for (const branch of branches) {
    const yOffset = calculateBranchYOffset(branch, timelineOffset);
    const [x, y] = isoTransform(stickmanWorldX, yOffset);
    
    branch.stickmanGif.style.left = `${x - branch.stickmanGif.width / 2 - 40}px`;
    branch.stickmanGif.style.top = `${y - branch.stickmanGif.height + stickmanOffsetY}px`;
  }
}