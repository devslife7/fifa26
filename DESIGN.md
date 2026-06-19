# FIFA World Cup 2026 Predictor Design System

This design system is inspired by the 2026 tournament identity without relying on protected FIFA marks. It uses a dark stadium base, trophy gold as the primary action color, and host-nation accents for status and supporting UI.

## Color Roles

| Role | Token | Hex | Usage |
| --- | --- | --- | --- |
| Primary | `primary`, `cup-gold` | `#f5c542` | Main actions, active navigation, champion highlights |
| Primary dark | `primary-dark`, `cup-gold-dark` | `#b98212` | Gradients, pressed states, deep gold accents |
| Background dark | `background-dark`, `stadium-black` | `#05070d` | App shell and full-screen backgrounds |
| Surface | `surface` | `#0f1727` | Panels, tables, grouped sections, controls |
| Raised surface | `surface-raised` | `#151f32` | Elevated panels and sticky headers |
| Pitch green | `wc-green`, `pitch-green` | `#00a859` | Success states, completed predictions |
| Maple red | `wc-red`, `maple-red` | `#d71920` | Destructive actions and error states |
| Host blue | `wc-blue`, `host-blue` | `#0057b8` | Informational states and secondary accents |
| Fiesta cyan | `accent`, `fiesta-cyan` | `#1ccad8` | Small celebratory accents and data emphasis |
| Confetti pink | `accent-warm`, `confetti-pink` | `#f45b9a` | Rare highlights, badges, celebratory states |

## Usage Rules

- Use `primary` for the main user action on a screen.
- Use `wc-green`, `wc-red`, `wc-blue`, and `wc-amber` for status, not large backgrounds.
- Keep the base UI dark and restrained so flags, trophies, progress, and selected teams stand out.
- Use the local `FWC2026` display font for headings and compact UI labels.
- Use `Noto Sans` for longer body text, metadata, and small helper labels.
- Avoid using official FIFA logos, trophy imagery, slogans, or host-city marks unless the project has usage rights.

## Layout and Depth

- Avoid card-led layouts. Prefer integrated page sections, full-width bands, tables, lists, split panes, inline groups, and bracket-native structures over repeated floating cards.
- Do not use shadows for standard UI depth. Create hierarchy with spacing, low-opacity borders, subtle surface shifts, dividers, typography, and state color.
- If a component needs separation, keep it visually connected to the page rather than floating above it. Use `border-subtle`, `border-strong`, `surface`, and `surface-raised` before introducing any new container treatment.
- Reserve celebratory glow or spotlight effects for rare tournament moments, not routine layout elevation.

## Implementation

Tailwind v4 tokens live in `src/app/globals.css`. A matching TypeScript reference object lives in `src/lib/design-system.ts` for non-CSS consumers such as generated images, previews, and future data visualizations.
