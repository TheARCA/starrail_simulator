import { initVisuals } from "./render/renderer.js";
import { initEngine } from "./core/engine.js";

// Ensure CARD_SIZE is defined here or imported from your config/constants file
const CARD_SIZE = 64; // Adjust to your actual constant

// 1. Define all essential local and external assets
const essentialImages = [
  "assets/img/characters/tb_destruction.webp",
  `https://placehold.co/${CARD_SIZE}x${CARD_SIZE}/47443b/d7cfb8/png?text=DATA`
];

async function bootEngine() {
  const loadingScreen = document.getElementById("loadingScreen");
  const progressFill = document.getElementById("progressFill");
  let loadedCount = 0;

  // 2. Create promises for all essential images (handles both local relative paths and absolute HTTP URLs)
  const imagePromises = essentialImages.map((src) => {
    return new Promise((resolve) => {
      const img = new Image();
      
      // Critical for external URLs drawn to Canvas to avoid tainting the context
      if (src.startsWith('http')) {
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
    initEngine();
    initVisuals();
  }, 500); 
}

bootEngine();
