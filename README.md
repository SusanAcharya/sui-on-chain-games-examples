# Sui On-Chain Game Examples

Workable examples of **fully on-chain games** built on [Sui](https://sui.io) using the [Sui Game Engine](https://github.com/Prajeet-Shrestha/sui-game-engine).


## Games

| Game | Description |
|------|-------------|
| [Card Crawler](./examples/card_crawler/) | A roguelike deck-building dungeon crawler with combat, shops, rest stops, and boss fights — all on-chain |
| [Sokoban](./examples/sokoban/) | The classic box-pushing puzzle game with pixel art and on-chain solution verification |
| [Tactics Ogre](./examples/tactics_ogre/) | A tactical RPG with squad management, turn-based combat on isometric grids, and full on-chain battles |

## Getting Started

### 1. Clone & Setup Skills

```bash
git clone https://github.com/Prajeet-Shrestha/sui-on-chain-games-examples.git
cd sui-on-chain-games-examples
chmod +x setup_agent.sh
./setup_agent.sh
```

### 2. Run a Game Frontend

```bash
cd card_crawler/frontend
npm install
npm run dev
```

## Agent Skills

These games are built with the help of AI agent skills that provide structured knowledge for game development on Sui:

| Skill | Source | Purpose |
|-------|--------|---------|
| [sui-on-chain-game-builder-skills](https://github.com/Prajeet-Shrestha/sui-on-chain-game-builder-skills) | `git clone https://github.com/Prajeet-Shrestha/sui-on-chain-game-builder-skills.git` | Move contract patterns, ECS engine architecture, game design workflows |
| [sui-move-skills](https://github.com/Prajeet-Shrestha/sui-move-skills) | `git clone https://github.com/Prajeet-Shrestha/sui-move-skills.git` | Sui Move language fundamentals, testing, deployment |
| [sui-on-chain-game-frontend-builder](https://github.com/Prajeet-Shrestha/sui-on-chain-game-frontend-builder) | `git clone https://github.com/Prajeet-Shrestha/sui-on-chain-game-frontend-builder.git` | Vite + React + TypeScript frontend — wallet, transactions, game state, real-time updates |
| [phaser-gamedev](https://github.com/chongdashu/phaserjs-tinyswords) | `npx skills add https://github.com/chongdashu/phaserjs-tinyswords --skill phaser-gamedev` | Phaser 3 game framework — sprites, physics, tilemaps, animations |
| [game-design-theory](https://github.com/pluginagentmarketplace/custom-plugin-game-developer) | `npx skills add https://github.com/pluginagentmarketplace/custom-plugin-game-developer --skill game-design-theory` | MDA framework, player psychology, balance, progression systems |

## Tech Stack

- **On-Chain**: [Sui Move](https://docs.sui.io/concepts/sui-move-concepts) + [Sui Game Engine (ECS)](https://github.com/Prajeet-Shrestha/sui-game-engine)
- **Frontend**: Vite + React + TypeScript
- **Sui SDK**: `@mysten/dapp-kit-react`, `@mysten/sui`
- **State Management**: `@tanstack/react-query`, `zustand`

## License

MIT
