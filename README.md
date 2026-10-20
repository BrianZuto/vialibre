# VíaLibre

Aplicación web de navegación y tráfico para conductores, construida a partir del prototipo del curso Fundamentos de HCI (Grupo 1, Universidad del Quindío). Solo frontend: no necesita servidor propio ni base de datos.

## Qué hace

| Pantalla | Ruta | Funcionalidad |
|---|---|---|
| UI-001 Inicio de sesión | `/login` | Ingreso y registro con validación (cuenta guardada en el navegador) |
| UI-002 Inicio | `/` | Mapa real centrado en tu GPS, incidentes de la comunidad, capas (satélite, mapa oscuro), accesos a Casa y Trabajo |
| UI-003 Búsqueda | `/buscar` | Búsqueda real de lugares en Colombia, dictado por voz, recientes |
| UI-004 Detalle del lugar | `/lugar` | Distancia, guardar en favoritos, compartir, parqueaderos cercanos |
| UI-005 Planificar ruta | `/ruta` | Rutas reales con alternativas en carro, moto, bicicleta y a pie; incidentes en la ruta; salir más tarde |
| UI-006 Navegación guiada | `/navegacion` | Indicaciones paso a paso con voz, seguimiento GPS o simulación del recorrido, alertas por delante |
| UI-007 Reportar incidente | `/reportar` | Reporte de 6 tipos de incidente en tu ubicación |
| UI-008 Llegada | `/llegada` | Resumen del viaje y calificación |
| UI-009 Explorar | `/explorar` | Casa, Trabajo, favoritos y gasolineras, parqueaderos, peajes y talleres cercanos |
| UI-010 Tráfico y alertas | `/trafico` | Lista de incidentes por distancia, confirmar o descartar |
| UI-011 Mi cuenta | `/cuenta` | Perfil editable, nivel de colaboración, ajustes de voz y mapa |
| UI-012 Historial | `/historial` | Viajes realizados con filtros, repetir ruta o eliminar |

## Servicios usados (gratuitos, sin clave)

- Mapas: OpenStreetMap (y Esri World Imagery para la vista satélite).
- Búsqueda de lugares: Nominatim (OpenStreetMap).
- Rutas: OSRM en routing.openstreetmap.de.

Limitaciones:
- El nivel de tráfico es una estimación según la hora del día; no existe un servicio gratuito de tráfico en tiempo real.
- Los reportes, favoritos, historial y la cuenta se guardan solo en el navegador de cada persona (localStorage); no se comparten entre usuarios.
- Los servicios públicos tienen límites de uso razonable; sirven para el proyecto académico y demostraciones, no para tráfico masivo.

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # genera dist/
```

La ubicación y la voz requieren HTTPS (Vercel lo da por defecto) o `localhost`.

## Despliegue en Vercel

Opción A, desde GitHub: sube esta carpeta a un repositorio, entra a vercel.com → Add New → Project → importa el repositorio. Vercel detecta Vite solo (build `npm run build`, salida `dist`).

Opción B, desde la terminal:

```bash
npm i -g vercel
vercel          # primera vez: vincula el proyecto
vercel --prod   # publica en producción
```

`vercel.json` ya redirige todas las rutas a `index.html`, para que funcionen los enlaces directos como `/explorar`.
