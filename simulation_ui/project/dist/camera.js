import { branches, calculateBranchYOffset } from './branches.js';
export let cameraOffsetX = 0;
export let cameraOffsetY = 0;
export let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragStartCameraX = 0;
let dragStartCameraY = 0;
// Isometric settings (flattened a bit for better stickman alignment)
export const isoAngle = (20 * Math.PI) / 180; // 20 degrees
export const timelineBaseX = 100;
export const timelineBaseY = 520;
// Iso transform with yOffset for branches - includes camera offset
export function isoTransform(worldX, yOffset = 0) {
    const isoX = timelineBaseX + worldX * Math.cos(isoAngle) + cameraOffsetX;
    const isoY = timelineBaseY - worldX * Math.sin(isoAngle) + yOffset + cameraOffsetY;
    return [isoX, isoY];
}
// Setup mouse event handlers for dragging
export function setupCameraControls(canvas) {
    canvas.style.cursor = "grab";
    canvas.addEventListener("mousedown", (e) => {
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        dragStartCameraX = cameraOffsetX;
        dragStartCameraY = cameraOffsetY;
        canvas.style.cursor = "grabbing";
    });
    canvas.addEventListener("mousemove", (e) => {
        if (!isDragging)
            return;
        const deltaX = e.clientX - dragStartX;
        const deltaY = e.clientY - dragStartY;
        cameraOffsetX = dragStartCameraX + deltaX;
        cameraOffsetY = dragStartCameraY + deltaY;
    });
    canvas.addEventListener("mouseup", () => {
        isDragging = false;
        canvas.style.cursor = "grab";
    });
    canvas.addEventListener("mouseleave", () => {
        isDragging = false;
        canvas.style.cursor = "default";
    });
    canvas.addEventListener("mouseenter", () => {
        if (!isDragging) {
            canvas.style.cursor = "grab";
        }
    });
}
// Check if any stickman is currently visible in the viewport
export function areStickmenVisible(canvas, timelineOffset) {
    const stickmanWorldX = 200;
    for (const branch of branches) {
        const yOffset = calculateBranchYOffset(branch, timelineOffset);
        const [x, y] = isoTransform(stickmanWorldX, yOffset);
        const stickmanScreenX = x - branch.stickmanGif.width / 2;
        const stickmanScreenY = y - branch.stickmanGif.height + 10;
        const margin = 50;
        if (stickmanScreenX > -margin &&
            stickmanScreenX < canvas.width + margin &&
            stickmanScreenY > -margin &&
            stickmanScreenY < canvas.height + margin) {
            return true;
        }
    }
    return false;
}
// Reset camera to center
export function resetCamera() {
    cameraOffsetX = 0;
    cameraOffsetY = 0;
}
