# AURA MONSTER

A Re: Zero typing test in which you climb the stairs of the Pleiades Watchtower in order to become the AURA MONSTER. we all know how that thing goes lol.
## Why?

I originally made this on 14 June 2026 when Z.ai announced their GLM-5.2, On their website they showcased some [Three.js](https://threejs.org/) projects and that caught my attention, around the same time Rezero community was hyping a Season 4 with Aura monster meme. so i thought of a concept to recreate Aura Monster with the help of GLM-5.2.

## How?
This project is fully vibecoded and made with Z.ai's agents from their main website [Z.ai](https://z.ai). it took me 10 prompts to fully finish making this project. All i fed the model was a picture of Natsuki Subaru and A reference image of Aura Monster along with the return by death sfx and an svg icon to use for favicon. 
I kept this project private because the code was extremely ugly with a lot of unwanted packages which helped the AI harness but not really a real person so i just uploaded the website online and called it a day.

## Final thoughts
Today i decided to feed it into Antigravity and make it remove all the unwanted stuff, then i manually updated the dependencies to allow TS and Bun support, It's kinda crazy how Z.ai was using Bun as well but it was also using Node on top of it which was weird i believe they used Bun for their agent and Node stuff was just to build the preview in their UI.
Anyways i really had a lot of fun working on it and i made sure to make it a bit different compared to other slop AI makes.
## Features

- **Real-Time 3D Environment**: Spiral staircase generation, animated character models, and procedural aura particle effects powered by Three.js.
- **Multiple Game Modes**:
  - **Normal Mode**: Mistakes cause the character to tumble down a limited number of steps.
  - **Return by Death Mode**: A hardcore mode where a single mistake resets progress back to the bottom step.
- **Dynamic Aura Scaling**: Combo streaks unlock higher aura levels with escalating visual effects, lighting intensity, and screen overlays.
- **Typing Customization**:
  - Toggle case sensitivity (ignore case).
  - Toggle punctuation requirements (auto-skip punctuation marks).
  - Select between 10 integrated Google fonts for optimal legibility.
- **Audio Feedback**: Mistake sound effects with volume and toggle controls.
- **Detailed Metrics**: Real-time tracking of words per minute (WPM), accuracy percentage, current combo streak, maximum combo, and current stair level.



## Technology Stack

- **Runtime and Package Manager**: [Bun](https://bun.sh/)
- **Framework**: [Next.js](https://nextjs.org/) (App Router, Turbopack)
- **3D Graphics**: [Three.js](https://threejs.org/)
- **UI and Animations**: [React](https://react.dev/), [Framer Motion](https://www.framer.com/motion/), [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)


## Getting Started

### Prerequisites

Ensure you have [Bun](https://bun.sh/) installed on your machine.

```bash
bun --version
```

### Installation

Clone the repository and install dependencies using Bun:

```bash
git clone https://github.com/GamerJagdish/Aura-Monster.git
cd Aura-Monster
bun install
```

### Development

Start the local development server:

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

### Production Build

Create an optimized production build:

```bash
bun run build
```

Run the production server:

```bash
bun start
```

### Linting

Check code quality with ESLint:

```bash
bun run lint
```

---

## Project Structure

```text
aura2/
├── public/                # Static assets (audio, logo, robots.txt)
├── src/
│   ├── app/
│   │   ├── globals.css    # Global stylesheet and Tailwind theme
│   │   ├── layout.tsx     # Root layout and font configurations
│   │   └── page.tsx       # Main page entry point
│   ├── components/
│   │   └── AuraTypingTest.tsx  # Typing interface and game state controller
│   └── lib/
│       ├── scene3d.ts     # Three.js 3D scene, character, and particle systems
│       └── utils.ts       # Class name helper utilities
├── eslint.config.mjs      # ESLint flat configuration
├── next.config.ts         # Next.js configuration
├── package.json           # Project metadata and dependencies
├── postcss.config.mjs     # PostCSS configuration for Tailwind CSS
├── tsconfig.json          # TypeScript compiler configuration
└── LICENSE                # MIT License
```

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for full details.
