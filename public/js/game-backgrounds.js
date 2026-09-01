const backgroundImages = [
  "https://ylssaocxasryuyrjfpbb.supabase.co/storage/v1/object/public/game-backgrounds/IMG_1186.webp",
  "https://ylssaocxasryuyrjfpbb.supabase.co/storage/v1/object/public/game-backgrounds/IMG_1187.webp",
  "https://ylssaocxasryuyrjfpbb.supabase.co/storage/v1/object/public/game-backgrounds/IMG_1188.webp",
  "https://ylssaocxasryuyrjfpbb.supabase.co/storage/v1/object/public/game-backgrounds/IMG_1189.webp",
];

let currentLayer = "a";
let usedIndices = [];

function getRandomImage() {
  if (usedIndices.length === backgroundImages.length) usedIndices = [];
  let index;
  do {
    index = Math.floor(Math.random() * backgroundImages.length);
  } while (usedIndices.includes(index));
  usedIndices.push(index);
  return backgroundImages[index];
}

function cycleBackground() {
  const nextImage = getRandomImage();
  const showLayer = document.getElementById(`bg-layer-${currentLayer}`);
  const hideLayer = document.getElementById(`bg-layer-${currentLayer === "a" ? "b" : "a"}`);

  showLayer.style.backgroundImage = `url('${nextImage}')`;
  showLayer.classList.add("visible");
  hideLayer.classList.remove("visible");

  currentLayer = currentLayer === "a" ? "b" : "a";
}

cycleBackground();
setInterval(cycleBackground, 6000); // change image every 6 seconds
