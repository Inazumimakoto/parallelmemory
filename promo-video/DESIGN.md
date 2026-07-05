# Parallel Memory Promo Design

## Style Prompt

Create a sharp, light-canvas promo for a Japanese web card game. The visual language should feel like a focused desktop game dashboard: crisp cards, grid paper, teal interaction states, black ink, and quick tactical motion. It should look close to the app while adding enough cinematic scale for a 1920x1080 video.

## Colors

- Canvas: `#f6f7f4`
- Panel: `#ffffff`
- Ink: `#151922`
- Muted copy: `#69717c`
- Border: `#d8ddd6`
- Accent teal: `#15a39b`
- Accent deep teal: `#0d756f`
- Suit red: `#d53b47`
- Card back: `#18202a`
- Reward yellow: `#f2c94c`

## Typography

- Display: `Promo Display`, mapped to a local condensed sans family for concise Japanese/English headlines.
- Data and small labels: `Promo Mono`, mapped to a local monospace family for timers, ranks, board counts, and moves.
- Body fallback: system sans-serif for UI-like clarity.

## Motion

- Entrance rhythm: offset first movement by 0.18-0.25s, stagger important UI elements under 500ms.
- Primary transition: horizontal push with `power3.inOut`.
- Secondary transition: blur crossfade for the final brand close.
- Ambient motion: subtle grid drift, card flips, screenshot scale pushes, and progress-bar fills.
- No jump cuts. Every scene has entrance animation and transition coverage.

## What Not To Do

- Do not turn the app into a dark neon tech reel.
- Do not hide the actual UI behind heavy blur or dramatic shadows.
- Do not use generic gradient text, purple-blue glows, or stock-like hero imagery.
- Do not overcrowd the frame with explanatory copy; keep text short and readable.
- Do not animate layout containers from hardcoded top/left guesses; build final frames first.
