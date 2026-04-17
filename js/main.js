import { initVisuals } from "./render/renderer.js";
import { initCombatSandbox } from "./modes/combat_sandbox.js";

// 1. Define only essential local assets (removed the external placeholder)
const essentialImages = ["assets/img/characters/tb_destruction.webp"];

async function bootEngine() {
  const loadingScreen = document.getElementById("loadingScreen");
  const progressFill = document.getElementById("progressFill");
  let loadedCount = 0;

  const imagePromises = essentialImages.map((src) => {
    return new Promise((resolve) => {
      const img = new Image();

      // Keep this just in case you ever add a different external URL later
      if (src.startsWith("http")) {
        img.crossOrigin = "anonymous";
      }

      img.src = src;

      img.onload = () => {
        loadedCount++;
        progressFill.style.width = `${(loadedCount / essentialImages.length) * 100}%`;
        resolve(img);
      };
      img.onerror = () => {
        console.warn(`Failed to preload: ${src}`);
        resolve(null);
      };
    });
  });

  const fontPromise = document.fonts.ready;

  await Promise.all([...imagePromises, fontPromise]);

  loadingScreen.style.opacity = "0";
  setTimeout(() => {
    loadingScreen.remove();
    initCombatSandbox();
    initVisuals();
  }, 500);
}

bootEngine();
