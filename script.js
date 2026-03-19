const games = [
  {
    title: "Neon Racer",
    description: "Speed through glowing highways and dodge traffic in a synthwave arcade racer.",
    tag: "Racing",
    thumbLabel: "NEON RACER",
    thumbStyle: "linear-gradient(135deg, #ff4fd8, #7a5cff)"
  },
  {
    title: "Galaxy Blaster",
    description: "Protect the stars and blast enemy waves in a classic space shooter experience.",
    tag: "Shooter",
    thumbLabel: "GALAXY BLASTER",
    thumbStyle: "linear-gradient(135deg, #3cf2ff, #1a7cff)"
  },
  {
    title: "Dungeon Pixel",
    description: "Explore mazes, collect treasure, and survive monsters in a retro pixel dungeon.",
    tag: "Adventure",
    thumbLabel: "DUNGEON PIXEL",
    thumbStyle: "linear-gradient(135deg, #ff9966, #ff5e62)"
  },
  {
    title: "Block Drop",
    description: "Stack shapes fast and clear lines before the screen fills up.",
    tag: "Puzzle",
    thumbLabel: "BLOCK DROP",
    thumbStyle: "linear-gradient(135deg, #ffe66d, #ff9f1c)"
  },
  {
    title: "Sky Jumper",
    description: "Bounce upward through floating platforms and chase the high score.",
    tag: "Platformer",
    thumbLabel: "SKY JUMPER",
    thumbStyle: "linear-gradient(135deg, #00f5a0, #00d9f5)"
  },
  {
    title: "Street Pixel Fighter",
    description: "Face off in a retro-inspired 1v1 brawler with quick combos and arcade energy.",
    tag: "Fighting",
    thumbLabel: "PIXEL FIGHTER",
    thumbStyle: "linear-gradient(135deg, #ff512f, #dd2476)"
  }
];

const gameGrid = document.getElementById("gameGrid");

games.forEach((game) => {
  const card = document.createElement("article");
  card.className = "game-card";

  card.innerHTML = `
    <div class="game-thumb" style="background: ${game.thumbStyle}">
      ${game.thumbLabel}
    </div>
    <div class="game-card-body">
      <h3>${game.title}</h3>
      <p>${game.description}</p>
      <div class="card-actions">
        <span class="game-tag">${game.tag}</span>
        <a href="#" class="btn btn-secondary">Play Game</a>
      </div>
    </div>
  `;

  gameGrid.appendChild(card);
});