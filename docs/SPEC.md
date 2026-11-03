# [SPEC-001] Plataforma Web de Programación de Fuerza y Fitness (Modo Entrenador/Atleta) Nombre de la App: Trena

## 1. Visión del Producto
Una aplicación web moderna, ultra rápida, responsiva y en modo oscuro por defecto, diseñada para entrenadores de Powerlifting, Hipertrofia y Streetlifting. Permite la prescripción precisa de cargas, el registro de entrenamientos en tiempo real y el análisis avanzado de progresión de marcas (RMs) y peso corporal.

---

## 2. Modelado de Datos Clave (Entidades Principales)

### Atletas y Perfil de Fuerza
- **RM Iniciales:** Almacenamiento obligatorio de los RMs iniciales para: Muscle-Up, Dominadas, Fondos, Sentadilla, Press Banca y Peso Muerto.
- **Registro de Peso Corporal:** Registro diario con cálculo automático del promedio móvil de los últimos 8 días.

### Estructura de la Programación (Jerarquía)
1. **Programa:** Contenedor de varias semanas creado por el Entrenador.
2. **Semana:** Bloque de entrenamiento (Ej: Semana 1). Posee un estado de visibilidad (`DRAFT` / `PUBLISHED`). El atleta solo ve las semanas marcadas como `PUBLISHED`.
3. **Día:** Sesión de entrenamiento específica dentro de la semana.
4. **Ejercicio:** Instancia dentro de un día. Contiene:
   - Nombre Oficial (Vinculado a imágenes del repositorio: `https://github.com/bryllim/workout-guide`).
   - Variante/Nombre Secundario (Ej: "Con pausa de 2 segundos", "Tempo 3-1-0").
   - Espacio de observaciones mutuo (editable por Entrenador y Atleta).
5. **Series (Sets):** Un ejercicio puede tener múltiples tipos de series independientes dentro de la misma sesión (Ej: 1 serie de aproximación/Top Set + 4 series de Back-off).
   - **Campos de Prescripción (Entrenador):** % 1RM, RPE (Rating of Perceived Exertion) o RIR (Reps in Reserve).
   - **Campos de Ejecución (Atleta):** Peso real levantado, Repeticiones reales logradas, RPE/RIR real experimentado.
6. **Descanso:** Tiempo de descanso pactado para cada serie.

---

## 3. Reglas de Negocio y Requisitos Funcionales

### R-1: Lógica de Prescripción y Automatización de Cargas
- La app debe proveer una calculadora integrada en la interfaz para que el entrenador o el atleta conviertan dinámicamente valores basados en las tablas estándar de RPE/RIR frente a porcentajes de 1RM.
- Al prescribir un % de RM, el sistema debe precargar visualmente el peso sugerido basado en el RM vigente del atleta.

### R-2: Privacidad y Publicación de Bloques
- El entrenador puede planificar múltiples semanas por adelantado.
- El atleta **no** puede visualizar ninguna semana o día cuyo estado sea `DRAFT`. Solo verá el contenido cuando el entrenador ejecute la acción "Publicar Semana".

### R-3: Finalización del Entrenamiento y Resumen de Sesión
Al hacer clic en "Finalizar Entrenamiento", el sistema debe calcular instantáneamente:
- **Tonelaje Total:** Sumatoria de (Series × Repeticiones × Peso).
- **Tiempo Gastado:** Temporizador desde el inicio de la sesión hasta la finalización.
- **Detección de PRs (Personal Records):** Comparación de los sets de la sesión contra el historial del usuario para alertar si se superó la carga máxima, el volumen por serie o el 1RM estimado (e1RM).

### R-4: Historial y Analíticas por Ejercicio
Al entrar al detalle de un ejercicio, el atleta debe ver:
- **Historial Numérico:** Listado cronológico de ejecuciones con el cálculo del e1RM usando la fórmula de Brzycki o Epley.
- **Gráfica de Tendencia:** Evolución del e1RM a lo largo del tiempo.
- **Histograma de Cargas:** Visualización de la distribución de las cargas de trabajo utilizadas en ese ejercicio.

---

## 4. Requisitos Técnicos y de Interfaz

- **Stack Tecnológico:** Tecnologías web modernas con soporte para actualizaciones en tiempo real (Ej: Next.js/React con Supabase/Firebase o WebSockets) para garantizar latencia ultra baja al guardar datos.
- **UI/UX:** Interfaz moderna, exclusivamente **Dark Mode**, 100% responsiva (Mobile-First, optimizada para su uso en la sala de entrenamiento desde el teléfono celular).
- **Media Asset Integration:** Los endpoints o componentes que rendericen las guías visuales de los ejercicios deben consultar y mapear los recursos de imágenes alojados en `https://github.com/bryllim/workout-guide`.

---

## 5. Criterios de Aceptación (Definición de Terminado)
- [ ] El entrenador puede estructurar un ejercicio con un Top Set (Ej: 1x1 81% RM) y Back-offs (Ej: 4x4 RPE 6) bajo la misma sección del día.
- [ ] Un atleta no puede ver la semana 2 si el entrenador no ha pulsado el botón "Publicar".
- [ ] La gráfica del peso corporal calcula correctamente la media matemática de los últimos 8 días, ignorando días sin registro sin romper la línea temporal.
- [ ] El guardado de las repeticiones y el peso de cada set se sincroniza de manera automática o mediante "debounce" veloz en la base de datos sin congelar la interfaz.

