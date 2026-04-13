import { initVisuals } from "./render/renderer.js";
import { initEngine } from "./core/engine.js";

// 1. Define only the absolute necessary assets to load first
const essentialImages = [
  "assets/img/characters/tb_destruction.webp",
  // Add other critical day-1 images like UI sprites or enemy sprites here
];

async function bootEngine() {
  const loadingScreen = document.getElementById("loadingScreen");
  const progressFill = document.getElementById("progressFill");
  let loadedCount = 0;

  // 2. Create promises for all essential images
  const imagePromises = essentialImages.map((src) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = src;

      // Resolve on both load and error so a missing file doesn't infinitely hang the sim
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

  // 3. Wait for the NewRodin font to be ready (critical for Canvas text rendering)
  const fontPromise = document.fonts.ready;

  // 4. Await all assets
  await Promise.all([...imagePromises, fontPromise]);

  // 5. Fade out and initialize
  loadingScreen.style.opacity = "0";
  setTimeout(() => {
    loadingScreen.remove(); // Remove from DOM entirely

    // Kick off the game loop coordinate now that assets are hot
    initEngine();
    initVisuals();
  }, 500); // matches the 0.5s CSS transition
}

bootEngine();
