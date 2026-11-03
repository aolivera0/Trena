# Trena — Plan de desarrollo

Complementa a [SPEC.md](SPEC.md). Aquí quedan las decisiones tomadas, el modelo de datos, la lógica de cálculo y las fases.

---

## 1. Decisiones tomadas

### Usuarios y roles
- Un usuario puede ser entrenador, atleta o ambos. Un entrenador tiene varios atletas; un atleta tiene **un solo** entrenador.
- Login solo con **Google** (Firebase Auth).
- El entrenador genera un **link de invitación**. El atleta lo abre (con cuenta o sin ella), inicia sesión con Google y queda vinculado.
- El entrenador ve y edita las sesiones de sus atletas **en tiempo real**.

### Programación
- Jerarquía: Programa → Semana → Día → Ejercicio → Grupos de series.
- Las semanas tienen estado `DRAFT` / `PUBLISHED`; se pueden publicar, despublicar y editar estando publicadas (el atleta ve el cambio al instante).
- Los días no tienen fecha: el atleta los hace cuando quiere.
- Se puede duplicar una semana o un programa (para el siguiente bloque o para otro atleta). Sin progresiones automáticas: todo se escribe a mano.
- Sin superseries ni circuitos.
- El atleta también puede crear sus propios programas o sesiones, o empezar una sesión vacía e ir armándola en el momento.

### Sesión en vivo
- Lo programado es una **plantilla**: al iniciar, se copia a una sesión y el atleta puede agregar, quitar o cambiar ejercicios y series (incluidos calentamientos). Esos cambios **no** tocan la plantilla; el entrenador ve lo prescrito frente a lo hecho.
- Columna "Anterior" = la última vez que se hizo ese ejercicio (en cualquier sesión).
- El descanso arranca al marcar ✓ la serie. Pitido en los últimos 3 s (con la app abierta).
- La sesión sigue abierta hasta que el atleta pulsa "Finalizar"; al volver a abrir la app se retoma donde quedó.
- Funciona sin internet y sincroniza al recuperar la conexión.
- Si atleta y entrenador editan el mismo campo a la vez, gana el último cambio (por campo, no por sesión completa).
- Los calentamientos **cuentan** para el tonelaje y para los PRs.

### Prescripción por serie
- **Carga** (una sola por serie): kg fijos · % 1RM · % del top set del día · RPE · RIR.
- **Repeticiones**: fijas · rango · AMRAP · EMOM (minutos + reps por minuto) · clúster (reps por bloque × bloques, pausa entre bloques en s).
- **Descanso** en segundos por serie.
- Unidades kg o lb, y redondeo de 2.5 o 1.25 kg (5 o 2.5 lb), a elección de cada usuario.

### Ejercicios
- Catálogo base: paquete npm `@bryllim/workout-guide` (302 ejercicios, 3 imágenes cada uno: trazos blancos sobre fondo transparente). Incluye squat, bench-press, deadlift, pull-up, chin-up, dip, weighted-pull-up y weighted-dip. **No incluye muscle-up**: se agrega como ejercicio del catálogo sin imagen.
- El catálogo **no** se copia a Firestore: `npm run catalog` genera `src/data/catalog.json` (~50 KB) y las imágenes se sirven desde jsDelivr, cacheadas por el service worker. Ids: `wg:<slug>` para el catálogo, `c:<docId>` para ejercicios propios. Los RMs iniciales de dominadas y fondos usan `weighted-pull-up` y `weighted-dip`.
- Las imágenes son CC BY-SA 4.0: hace falta una página de créditos con atribución y enlace a la licencia.
- Entrenadores y atletas pueden crear ejercicios propios, con o sin imagen.
- Una **variante** (pausa, tempo…) es un ejercicio distinto, con historial y RM propios.
- Ejercicios con lastre (muscle-up, dominadas, fondos): se marcan con `addsBodyweight = true` y su carga total es peso corporal + lastre.

### RMs y PRs
- RMs iniciales obligatorios: muscle-up, dominadas, fondos, sentadilla, press banca y peso muerto.
- El RM vigente se actualiza **automáticamente** al finalizar una sesión si hubo PR de e1RM (se toma el mejor e1RM de la sesión). Queda un historial de RMs.
- Peso corporal para ejercicios con lastre: el último registro, editable dentro de la sesión.
- Tonelaje con lastre: carga total (peso corporal + lastre).

---

## 2. Stack

| Capa | Elección | Por qué |
|---|---|---|
| Front | React + Vite + TypeScript | La app vive en el cliente; SSR no aporta y complica el modo sin conexión |
| Estilos | Tailwind CSS, solo modo oscuro | Mobile-first rápido |
| Router | React Router | Simple |
| Datos | Cloud Firestore | Tiempo real y caché sin conexión incluidos |
| Auth | Firebase Auth (Google) | Requisito |
| PWA | `vite-plugin-pwa` (Workbox) | Instalable, funciona sin red |
| Gráficas | Recharts | Tendencia de e1RM, histograma, peso corporal |
| Tests | Vitest para la lógica de cálculo | Las fórmulas deben ser exactas |
| Hosting | Firebase Hosting (plan gratuito Spark) | Gratis, mismo proyecto |

**Restricción:** nada de Cloud Functions (exigen el plan Blaze con tarjeta). Toda la lógica corre en el cliente y la seguridad la imponen las reglas de Firestore. Si en el futuro se vende la app, se migra a Blaze y se mueven a funciones los cálculos sensibles (PRs, invitaciones).

**Sin conexión:**
- Firestore con `persistentLocalCache` + `persistentMultipleTabManager`.
- Service worker que cachea la app.
- Las escrituras de la sesión van directo a Firestore; la caché local las aplica al instante y las sube después, sin congelar la UI. Los inputs numéricos usan debounce de unos 400 ms.
- El cronómetro guarda `restEndsAt` (hora de fin) en la sesión, no un contador, así sobrevive a recargas, al bloqueo de pantalla y al cambio de dispositivo.

---

## 3. Modelo de datos (Firestore)

Todos los pesos se guardan en **kg**; las unidades solo afectan la visualización.

```
users/{uid}
  displayName, email, photoURL
  roles: { coach: bool, athlete: bool }
  coachId: uid | null
  coachName: string | null            // copiado de la invitación: el atleta no puede leer el perfil del entrenador
  inviteToken: string | null          // token usado para vincularse (lo validan las reglas)
  prefs: { unit: 'kg'|'lb', roundingKg: 2.5|1.25, e1rmFormula: 'epley'|'brzycki'|'lander' }
  createdAt

invites/{token}
  coachId, createdAt, expiresAt, usedBy: uid|null, usedAt

exercises/{exerciseId}
  name, variant: string|null
  catalogSlug: string|null            // slug de workout-guide para las imágenes
  addsBodyweight: bool                // lastre + peso corporal
  ownerId: uid|null                   // null = catálogo global
  createdAt

users/{uid}/rms/{exerciseId}
  e1rmKg                              // carga TOTAL (incluye peso corporal si addsBodyweight)
  source: 'initial'|'manual'|'pr', sessionId|null, updatedAt
users/{uid}/rmHistory/{autoId}
  exerciseId, e1rmKg, source, sessionId, date

users/{uid}/bodyweight/{YYYY-MM-DD}
  kg

users/{uid}/exerciseStats/{exerciseId}      // desnormalizado al finalizar una sesión
  lastSets: [{ weightKg, reps, rpe, kind }] // columna "Anterior"
  lastSessionId, lastDate
  bestWeightKg, bestSetVolumeKg, bestE1rmKg

users/{athleteId}/programs/{programId}
  name, ownerId (entrenador o el propio atleta), createdAt
users/{athleteId}/programs/{programId}/weeks/{weekId}
  index, name, status: 'DRAFT'|'PUBLISHED', publishedAt
  days: [                               // embebido: un solo doc por semana
    { id, name, order, notes,
      exercises: [
        { id, exerciseId, order, coachNotes,
          setGroups: [ { id, order, kind: 'warmup'|'working', count, load, reps, restSec } ]
        } ] } ]

users/{athleteId}/sessions/{sessionId}
  name, status: 'IN_PROGRESS'|'FINISHED'
  source: { programId, weekId, dayId } | null
  startedAt, finishedAt, bodyweightKg
  restTimer: { endsAt, entryId, setId } | null
  summary: { tonnageKg, durationSec, prs: [...] } | null
users/{athleteId}/sessions/{sessionId}/entries/{entryId}
  exerciseId, order, athleteId, finishedAt   // los dos últimos para la consulta de historial
  coachNotes, athleteNotes                   // observaciones compartidas
  sets: {                                     // MAPA (no array) → edición por campo sin conflictos
    [setId]: { order, kind, prescription: { load, reps, restSec } | null,
               suggestedKg, weightKg, reps, rpe, rir, done, completedAt } }
```

Tipos de prescripción:

```ts
type Load =
  | { type: 'fixed'; kg: number }
  | { type: 'pct1rm'; pct: number }
  | { type: 'pctTopSet'; pct: number; refSetGroupId: string }
  | { type: 'rpe'; value: number }
  | { type: 'rir'; value: number };

type Reps =
  | { type: 'fixed'; n: number }
  | { type: 'range'; min: number; max: number }
  | { type: 'amrap' }
  | { type: 'emom'; minutes: number; repsPerMin: number }
  | { type: 'cluster'; repsPerBlock: number; blocks: number; intraRestSec: number };
```

**Por qué esta forma:**
- Los días van embebidos en la semana, así la regla "el atleta no ve el DRAFT" se aplica sobre un solo documento.
- Las series de la sesión son un mapa dentro de cada entrada, así que entrenador y atleta pueden escribir campos distintos (`sets.abc.weightKg`) a la vez sin pisarse.
- `count` en la plantilla ("4×4") se expande a 4 series individuales al iniciar la sesión.

---

## 4. Reglas de seguridad (resumen)

- `users/{uid}`: el dueño lee y escribe. Su entrenador (`coachId == auth.uid`) puede leerlo. El atleta solo puede poner `coachId` si `invites/{inviteToken}` existe, no está vencida ni usada y su `coachId` coincide. El entrenador puede quitar a un atleta.
- `users/{athleteId}/**`: acceso del atleta o de su entrenador, salvo:
  - `weeks`: el atleta solo **lee** si `status == 'PUBLISHED'` o si él es el `ownerId` del programa; solo el dueño del programa escribe.
- `exercises`: lectura para todos los autenticados; escritura solo del `ownerId`.
- `invites`: crea el entrenador; el atleta solo puede marcarla como usada por él mismo.

Las reglas se prueban con el emulador de Firebase (`@firebase/rules-unit-testing`), sobre todo el criterio "el atleta no ve la semana 2 sin publicar".

---

## 5. Lógica de cálculo

Va en `src/lib/strength/`, como funciones puras con tests.

### Tabla RPE → % 1RM
La tabla de `recursos/1RM-segun-el-RPE.webp` es en realidad **una sola secuencia**: cada medio punto de RPE equivale a una repetición más. Con `k = 2·(reps − 1) + 2·(10 − RPE)`:

```
k:  0     1     2     3     4     5     6     7     8     9    10    11 ...
%: 100  97.8  95.5  93.9  92.2  90.7  89.2  87.8  86.3  85.0  83.7  82.4 ...
```

Así se cubre todo el rango RPE 6–10 × 1–12 reps con un array. RIR = 10 − RPE (estándar de Tuchscherer). **Ojo:** la columna RIR de la imagen está duplicada (dice RPE 9 = 2 RIR), lo que no cuadra con sus propios porcentajes (RPE 9 @ 1 rep = RPE 10 @ 2 reps = 1 rep en reserva); se usa la relación estándar. Fuera de la tabla (RPE < 6 o más de 12 reps) se usa la fórmula del usuario y se avisa que la estimación es poco precisa.

### e1RM de una serie
- Carga total = `weightKg + (addsBodyweight ? bodyweightKg : 0)`.
- Con RPE o RIR registrado y dentro de la tabla: `total / tabla(reps, rpe)`.
- Sin RPE: la fórmula elegida
  - Epley: `w · (1 + r/30)`
  - Brzycki: `w · 36 / (37 − r)`
  - Lander: `100 · w / (101.3 − 2.67123 · r)`
- Con 1 rep sin RPE: e1RM = carga total.
- Para ejercicios con lastre se muestra también el lastre equivalente: `e1RM − peso corporal`.

### Peso sugerido
- `fixed` → kg.
- `pct1rm` → `pct · RM − pesoCorporal(si aplica)`.
- `rpe` / `rir` → `tabla(reps, rpe) · RM − pesoCorporal`. Con rango de reps se usa el mínimo; con AMRAP no se sugiere.
- `pctTopSet` → `pct · cargaTotal real del top set de hoy − pesoCorporal`. Se recalcula en vivo cuando el atleta registra el top set.
- Redondeo final al incremento del usuario. Si el lastre da negativo → 0 (y se avisa: necesita asistencia).

### Al finalizar
- **Tonelaje** = Σ (carga total × reps) de las series marcadas ✓.
- **Duración** = `finishedAt − startedAt`.
- **PRs** (contra `exerciseStats`): peso máximo, mejor volumen por serie (peso × reps) y mejor e1RM. Si hay PR de e1RM se actualizan `rms` y `rmHistory`.
- Se actualiza `exerciseStats` (últimas series y mejores marcas) y se ponen `finishedAt` en las entradas. Todo en un solo `writeBatch`, que también funciona sin conexión.

### Peso corporal
Media móvil por día = promedio de los registros que existan en `[d − 7, d]` (8 días). Los días sin registro no rompen la línea: se dibuja la media en cada día que tenga al menos un registro en la ventana.

---

## 6. Pantallas

| Ruta | Quién | Contenido |
|---|---|---|
| `/login` | todos | Botón de Google |
| `/onboarding` | nuevo | Rol(es), unidades, redondeo, fórmula, 6 RMs iniciales, peso corporal |
| `/invite/:token` | atleta | Aceptar entrenador |
| `/` | atleta | Sesión en curso (si hay), días publicados pendientes, "Entrenamiento vacío" |
| `/session/:id` | atleta / entrenador | Sesión en vivo (como la captura) |
| `/session/:id/summary` | atleta | Tonelaje, duración, PRs |
| `/history` | atleta | Sesiones pasadas |
| `/exercise/:id` | atleta | Imágenes, historial con e1RM, tendencia, histograma |
| `/bodyweight` | atleta | Registro diario y gráfica |
| `/calculator` | todos | RPE ↔ %1RM ↔ peso, con modo lastre |
| `/coach` | entrenador | Atletas, link de invitación, sesiones en vivo ahora |
| `/coach/athlete/:id` | entrenador | Programas, RMs, historial del atleta |
| `/program/:athleteId/:programId` | entrenador / atleta dueño | Editor de semanas y días, publicar, duplicar |
| `/settings` | todos | Preferencias y créditos de imágenes |

Sesión en vivo, fila de serie: `SET (W/1/2…) · ANTERIOR · KG (sugerido como placeholder) · REPS · RPE · ✓`, con barra de descanso entre series y la prescripción visible (p. ej. "4×4 @ RPE 6").

---

## 7. Fases

### Fase 0 — Base
- Proyecto Vite + TS + Tailwind + React Router + PWA. Estructura de carpetas, oxlint y Vitest.
- Proyecto de Firebase (Auth Google, Firestore con caché persistente, Hosting) y emulador local.
- Layout mobile-first oscuro y despliegue inicial.

### Fase 1 — Usuarios, ejercicios y programación
- Login, onboarding, preferencias y RMs iniciales.
- Invitaciones entrenador → atleta.
- Catálogo de ejercicios (JSON generado desde `@bryllim/workout-guide`), ejercicios propios y variantes.
- Librería `strength/` con tests: tabla RPE, fórmulas, sugerido, redondeo, unidades.
- Editor de programas: semanas, días, ejercicios y grupos de series con todos los tipos de carga y reps; publicar, despublicar y duplicar.
- Reglas de Firestore con tests.
- ✅ Criterios: top set + back-offs en el mismo ejercicio; el atleta no ve la semana 2 sin publicar.

### Fase 2 — Sesión en vivo
- Iniciar desde un día programado o vacía; modificar libremente.
- Registro de series con debounce, sugeridos en vivo (incluido % del top set) y columna "Anterior".
- Descanso con `endsAt` y pitido de 3 s; notas compartidas.
- Retomar sesión; vista del entrenador en tiempo real.
- Finalizar: tonelaje, duración, PRs y actualización de RMs.
- Prueba sin conexión de punta a punta (modo avión).
- ✅ Criterio: el guardado se sincroniza sin congelar la UI.

### Fase 3 — Análisis
- Historial y detalle por ejercicio: e1RM, tendencia e histograma.
- Peso corporal con media de 8 días.
- Calculadora RPE ↔ % ↔ peso con modo lastre.
- Panel del entrenador: prescrito vs hecho.
- ✅ Criterio: media de 8 días correcta con días sin registro.

### Más adelante (fuera del alcance actual)
Progresiones automáticas, superseries, notificaciones con la pantalla bloqueada (app nativa o push), migración a Blaze y Cloud Functions para multi-entrenador comercial.

---

## 8. Riesgos y notas
- **iOS Safari:** el login con popup falla dentro de una PWA instalada → usar `signInWithRedirect`. El audio necesita un toque previo del usuario para desbloquearse (se "arma" al marcar ✓).
- **Lógica en el cliente:** un usuario técnico podría escribir PRs falsos en su propio perfil. Es aceptable para uso personal; se resuelve con Functions al escalar.
- **Cuota gratuita:** 20 mil escrituras al día. El debounce y el guardado por campo la mantienen muy lejos del límite.
- **Licencia de imágenes** CC BY-SA: atribución obligatoria en `/settings`.
