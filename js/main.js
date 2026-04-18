import { initEngine } from "./core/engine.js";
import { DATABASE_HEROES } from "./data/characters/index.js";
import { DATABASE_ENEMIES } from "./data/enemies/index.js";
import { initVisuals } from "./render/renderer.js";

const IMAGE_EXTENSIONS = ["webp", "png", "jpg", "jpeg"];

function getEssentialPortraits() {
  return [
    ...DATABASE_HEROES.map((hero) => ({
      folder: "characters",
      id: hero.id,
    })),
    ...DATABASE_ENEMIES.map((enemy) => ({
      folder: "enemies",
      id: enemy.id,
    })),
  ];
}

function preloadPortrait({ folder, id }, onComplete) {
  return new Promise((resolve) => {
    const img = new Image();
    let currentExtIndex = 0;

    const finish = (asset) => {
      onComplete();
      resolve(asset);
    };

    const tryNextExtension = () => {
      if (currentExtIndex >= IMAGE_EXTENSIONS.length) {
        console.warn(`Failed to preload portrait for ${id}`);
        finish(null);
        return;
      }

      img.src = `assets/img/${folder}/${id}.${IMAGE_EXTENSIONS[currentExtIndex]}`;
      currentExtIndex++;
    };

    img.onload = () => finish(img);
    img.onerror = tryNextExtension;

    tryNextExtension();
  });
}

async function bootEngine() {
  const loadingScreen = document.getElementById("loadingScreen");
  const progressFill = document.getElementById("progressFill");
  const essentialPortraits = getEssentialPortraits();
  let loadedCount = 0;

  const updateProgress = () => {
    loadedCount++;
    progressFill.style.width = `${(loadedCount / essentialPortraits.length) * 100}%`;
  };

  const imagePromises = essentialPortraits.map((portrait) =>
    preloadPortrait(portrait, updateProgress),
  );

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
