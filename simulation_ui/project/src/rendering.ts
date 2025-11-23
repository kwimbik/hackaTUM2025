import { branches, calculateBranchYOffset } from './branches.js';
import { gameEvents, reactions, markerSpacing } from './events.js';
import { isoTransform } from './camera.js';

const safeExtraMarkers = 4;

// Draw timeline lines for all branches
export function drawTimelineLines(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, timelineOffset: number) {
  const lineStartOffset = -800;
  const lineLength = canvas.width + 1000;
  
  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  
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
    
    const baseSize = 14;
    const isLifeAltering = event.causesSplit;
    const innerSize = isLifeAltering ? baseSize * 1.2 : baseSize;
    const outerSize = innerSize + 8;

    // Modern marker: inner dot with outlined ring
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = event.triggered ? "#cbd5e1" : (isLifeAltering ? "#f59e0b" : "#22c55e");
    ctx.arc(ex, ey, innerSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 3;
    ctx.strokeStyle = isLifeAltering ? "rgba(245,158,11,0.5)" : "rgba(34,197,94,0.4)";
    ctx.beginPath();
    ctx.arc(ex, ey, outerSize, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    
    // Draw event name above the star with background for visibility
    const textPadding = 4;
    ctx.font = "600 13px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    
    // Measure text width for background
    const textWidth = ctx.measureText(event.eventName).width;
    const textHeight = 14;
    const bgX = ex - textWidth / 2 - textPadding;
    const bgY = ey - outerSize - textHeight - textPadding - 6;
    
    // Draw white background rectangle
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.fillRect(bgX, bgY, textWidth + textPadding * 2, textHeight + textPadding);
    
    // Draw black border
    ctx.strokeStyle = "rgba(15, 23, 42, 0.18)";
    ctx.lineWidth = 1;
    ctx.strokeRect(bgX, bgY, textWidth + textPadding * 2, textHeight + textPadding);
    
    // Draw text
    ctx.fillStyle = "#0f172a";
    ctx.fillText(event.eventName, ex, ey - outerSize - 6);
    
    // Reset text alignment for other drawing
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }
}

// Draw markers for all branches
export function drawMarkers(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, timelineOffset: number) {
  ctx.strokeStyle = "#111827";
  ctx.fillStyle = "#111827";
  ctx.lineWidth = 2;
  ctx.font = "13px 'Segoe UI', Arial, sans-serif";

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
      ctx.moveTo(mx, my - 16);
      ctx.lineTo(mx, my + 16);
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
  const stickmanWorldX = 160; // align reactions with stickman anchor
  
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

// Draw branch labels on each timeline
export function drawBranchNumbers(ctx: CanvasRenderingContext2D, timelineOffset: number) {
  ctx.fillStyle = "#312e81";
  ctx.font = "700 16px 'Segoe UI', Arial, sans-serif";

  const stickmanWorldX = 160;
  
  for (const branch of branches) {
    const yOffset = calculateBranchYOffset(branch, timelineOffset);
    const [x, y] = isoTransform(stickmanWorldX, yOffset);
    
    const numberOffsetX = -100;
    const numberOffsetY = -10;
    
    const label = branch.name || `#${branch.id}`;
    ctx.fillText(label, x + numberOffsetX, y + numberOffsetY);
  }
}

// Update all stickman positions
export function updateStickmanPositions(timelineOffset: number) {
  const stickmanWorldX = 160;

  for (const branch of branches) {
    const yOffset = calculateBranchYOffset(branch, timelineOffset);
    const [x, y] = isoTransform(stickmanWorldX, yOffset);

    // Lift sprites so feet sit on the rail; slight negative lift moves them up
    const lift = -Math.round(branch.stickmanGif.height * 0.12);
    branch.stickmanGif.style.left = `${x - branch.stickmanGif.width / 2}px`;
    branch.stickmanGif.style.top = `${y - branch.stickmanGif.height + lift}px`;
  }
}
