# Trena

PWA para programar y registrar entrenamientos de fuerza. El plan completo está en [`docs/PLAN.md`](docs/PLAN.md).

Stack: React + Vite + TypeScript + Tailwind, Firebase (Auth con Google + Firestore con caché sin conexión), `vite-plugin-pwa`.

## Desarrollo local

Requisitos: Node 20+ y Java 21+ (para los emuladores de Firebase).

```bash
npm install
cp .env.example .env.local   # con VITE_USE_EMULATORS=true no hace falta proyecto real
npm run emulators            # Auth :9099, Firestore :8080, UI :4000
npm run dev                  # en otra terminal
```

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Typecheck + build de producción con service worker |
| `npm test` | Tests de la lógica de cálculo (Vitest) |
| `npm run lint` | oxlint |
| `npm run emulators` | Emuladores de Firebase con el proyecto `demo-trena` |
| `npm run deploy` | Build y despliegue a Firebase Hosting + reglas |

## Conectar el proyecto real de Firebase

1. Crea el proyecto en la consola de Firebase, activa **Authentication → Google** y **Firestore**.
2. Registra una app web y copia su configuración a `.env.local`; pon `VITE_USE_EMULATORS=false`.
3. Cambia `demo-trena` por el ID real en `.firebaserc` y ejecuta `firebase login`.
