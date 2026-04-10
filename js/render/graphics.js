import { GAME_WIDTH, GAME_HEIGHT } from "../core/state.js";

export let canvas, ctx;

export const NIER_BG = "#b5b19b";
export const NIER_DARK = "#47443b";
export const NIER_LIGHT = "#d7cfb8";

export function initGraphics() {
  canvas = document.getElementById("gameCanvas");
  ctx = canvas.getContext("2d");
  canvas.width = GAME_WIDTH;
  canvas.height = GAME_HEIGHT;
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();
}

export function resizeCanvas() {
  const windowRatio = window.innerWidth / window.innerHeight;
  const gameRatio = GAME_WIDTH / GAME_HEIGHT;
  let newWidth, newHeight;

  if (windowRatio > gameRatio) {
    newHeight = window.innerHeight;
    newWidth = newHeight * gameRatio;
  } else {
    newWidth = window.innerWidth;
    newHeight = newWidth / gameRatio;
  }
  canvas.style.width = `${newWidth}px`;
  canvas.style.height = `${newHeight}px`;
}

export function drawTextWithCA(
  text,
  x,
  y,
  mainColor,
  strokeColor = null,
  strokeWidth = 0,
) {
  ctx.save();
  const sColor = ctx.shadowColor;
  const sBlur = ctx.shadowBlur;
  const sOffsetX = ctx.shadowOffsetX;
  const sOffsetY = ctx.shadowOffsetY;
  ctx.shadowColor = "transparent";

  if (strokeColor && strokeWidth > 0) {
    ctx.lineWidth = strokeWidth;
    // PURGED: Replaced Red/Cyan with Nier Dark/Light
    ctx.strokeStyle = "rgba(71, 68, 59, 0.4)";
    ctx.strokeText(text, x - 1.5, y);
    ctx.strokeStyle = "rgba(215, 207, 184, 0.4)";
    ctx.strokeText(text, x + 1.5, y);
  }

  // PURGED: Replaced Red/Cyan with Nier Dark/Light
  ctx.fillStyle = "rgba(71, 68, 59, 0.5)";
  ctx.fillText(text, x - 1.5, y);
  ctx.fillStyle = "rgba(215, 207, 184, 0.5)";
  ctx.fillText(text, x + 1.5, y);

  ctx.shadowColor = sColor;
  ctx.shadowBlur = sBlur;
  ctx.shadowOffsetX = sOffsetX;
  ctx.shadowOffsetY = sOffsetY;

  if (strokeColor && strokeWidth > 0) {
    ctx.strokeStyle = strokeColor;
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = mainColor;
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function strokeWithCA(mainColor, lineWidth) {
  ctx.save();
  ctx.shadowColor = "transparent";
  ctx.lineWidth = lineWidth;

  // PURGED: Replaced Red/Cyan with Nier Dark/Light
  ctx.translate(-1.5, 0);
  ctx.strokeStyle = "rgba(71, 68, 59, 0.3)";
  ctx.stroke();
  ctx.translate(3, 0);
  ctx.strokeStyle = "rgba(215, 207, 184, 0.3)";
  ctx.stroke();

  ctx.restore();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = mainColor;
  ctx.stroke();
}

export function applyHardShadow() {
  ctx.shadowColor = "rgba(71, 68, 59, 0.25)";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 12;
  ctx.shadowOffsetY = 12;
}
export function clearShadow() {
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

export function getWrappedText(
  ctxRef,
  text,
  maxW,
  initialFontSize,
  fontWeight,
) {
  let fontSize = initialFontSize;
  let lines = [];
  while (fontSize > 10) {
    ctx.font = `${fontWeight} ${fontSize}px 'NewRodin', sans-serif`;
    const words = text.split(" ");
    lines = [];
    let currentLine = words[0] || "";
    for (let i = 1; i < words.length; i++) {
      if (ctx.measureText(currentLine + " " + words[i]).width <= maxW)
        currentLine += " " + words[i];
      else {
        lines.push(currentLine);
        currentLine = words[i];
      }
    }
    lines.push(currentLine);
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    if (lines.length <= 2 && widest <= maxW) break;
    fontSize -= 1;
  }
  return { lines, fontSize };
}

export function drawChamferedRect(x, y, w, h, cutSize) {
  ctx.beginPath();
  ctx.moveTo(x + cutSize, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h - cutSize);
  ctx.lineTo(x + w - cutSize, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + cutSize);
  ctx.closePath();
}
