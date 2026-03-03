# Operapedia / Panel de Credenciales

Panel web premium para gestionar credenciales de compañías (juegos), con soporte para métodos de depósito/cashout, consideraciones, promociones, términos, canales de atención y notas tipo timeline. Diseño moderno inspirado en Notion / Linear / Stripe con soporte completo para modo oscuro y claro.

---

## Arquitectura visual

```
┌──────────────────────────────────────────────────────────────┐
│  📓 OPERAPEDIA       🔍 [Omnibar global + filtros]   🌙 ✏️  │  ← Navbar (glassmorphism)
├──────────┬───────────────────────────────────────────────────┤
│ 🔍 Buscar│  Inicio › CompañíaX                              │
│          │  ┃ CompañíaX                                      │
│ COMPAÑÍAS│  ──────────────────────────────────────────────── │
│ ● Comp1  │  🎮 Credenciales | 💰 Depósito | 💸 Cashout ... │  ← Tabs
│ ● Comp2  │  ┌──────────────────────────────────────────┐    │
│ ● Comp3  │  │  Game Card (username, link, toggle)      │    │  ← Content cards
│   ...    │  └──────────────────────────────────────────┘    │
└──────────┴───────────────────────────────────────────────────┘
```

---

## Estructura del proyecto

### `index.html`
- **Navbar superior** con glassmorphism (`backdrop-filter: blur`):
  - Logo con gradiente (OPERAPEDIA).
  - **Omnibar** (`#globalSearch`): buscador global con panel de filtros por categoría.
  - Toggle de tema oscuro/claro (`#themeToggle`).
  - Botón de edición (`#editModeBtn`).
- **Sidebar izquierdo**:
  - Buscador local de compañías (`#sidebarSearch`): filtra la lista en tiempo real.
  - Botón "Nueva compañía" (`#addCompanyBtn`, visible solo en modo admin + edición).
  - Lista de compañías (`#companiesList`) con badge de conteo (`#companyCountBadge`).
  - Elemento oculto `#localFilterList` para compatibilidad con filtro local legacy.
- **Contenido principal**:
  - Breadcrumbs dinámicos (`#breadcrumb`): "Inicio › NombreCompañía".
  - Título de compañía (`#companyTitle`) con barra de color identificador.
  - 8 tabs de navegación (`#tabsContainer`): Credenciales, Depósito, Cashout, Consideraciones, Promociones, Términos, Canales, Notas.
  - Paneles de contenido por tab (`data-pane="..."`) con contenedores específicos.
- **Panel de filtros de búsqueda** (`#searchFilters`):
  - Aparece al hacer focus en el omnibar.
  - 8 chips de categoría toggleables: permite filtrar en qué secciones buscar.
  - Estado persistido en `localStorage` (`operapediaCategoryFilters`).
  - Primera visita: ningún filtro seleccionado = busca en todo.
- **Modal** para crear nuevas compañías (inyectado dinámicamente).
- **Toast** de notificaciones (`#toast`).

### `styles.css` (~1600 líneas)
- **Sistema de variables CSS** con tokens semánticos para Dark y Light mode:
  - `--bg-app`, `--bg-card`, `--text-primary`, `--border`, `--shadow-*`, etc.
  - Transiciones suaves al cambiar tema (`transition: 0.35s`).
- **Componentes estilizados**:
  - Navbar con glassmorphism.
  - Sidebar con indicadores de selección (barra lateral accent).
  - Cards con `border-radius: 14px`, sombras progresivas y hover con `translateY(-1px)`.
  - Tabs con underline indicator.
  - Filter chips con estados active/inactive.
  - Toggle switches (tema + estado de juego).
  - Modal con animación de entrada.
  - Toast con slide-up animation.
- **Tipografía**: Inter (Google Fonts), pesos 400–800.

### `app.js` (~2200 líneas)
- **Estado global:**
  - `companies`: array de compañías desde Firebase.
  - `currentCompany`, `currentTab`, `isEditMode`, `adminLoggedIn`.
  - `sidebarSearchTerm`: término de búsqueda del sidebar.
  - `activeCategoryFilters`: filtros de categoría activos (persistidos en localStorage).
  - `activeSearchCompanyIds`: filtros de compañía para búsqueda global.
  - `localCompanyFilter`: filtro legacy de compañías.

- **Tema (dark/light):**
  - Lee/escribe `operapediaTheme` en `localStorage`.
  - Aplica `data-theme` al `<html>` y sincroniza el checkbox toggle.

- **Sidebar Search:**
  - `#sidebarSearch` filtra `renderCompanies()` en tiempo real por nombre.

- **Panel de filtros de búsqueda:**
  - Se muestra al hacer focus en el omnibar, se oculta al hacer clic fuera.
  - Category chips toggle: activan/desactivan categorías de búsqueda.
  - Estado persistido en `localStorage` (`operapediaCategoryFilters`).
  - Primera visita (sin datos guardados): array vacío = busca en todo.

- **Integración Firebase:**
  - Lectura de `companies` desde RTDB con `onValue`.
  - Cada compañía se normaliza a `{ id, ...companyValue, games: [ ... ] }`.
  - Lectura/escucha de `gamesConfig` para toggles remotos.
  - Escritura de credenciales, métodos deposito/cashout, consideraciones, promociones, términos, canales, notas.

- **Estado local de juegos (toggles y lastModified):**
  - `credentialsState` en `localStorage`.
  - `loadState()` mergea sobre datos iniciales. `saveState()` guarda la foto actual.

- **Selección de compañía y tabs:**
  - `renderCompanies()`: pinta la lista filtrada (por localFilter + sidebarSearch) con conteo de juegos activos y actualiza el badge.
  - `selectCompany(company)`: actualiza breadcrumbs, título con barra de color, habilita tabs.
  - `switchTab(tabName)`: cambia clases de tabs/panes y renderiza el contenido correspondiente.

- **Credenciales (tab credenciales):**
  - **Vista**: cards con nombre, username (copiar), link (abrir), toggle activo/inactivo, última modificación.
  - **Edición**: inputs editables con indicador "dirty" (borde naranja), botones guardar/eliminar, card para nuevo juego.

- **Tabs adicionales:**
  - `renderDeposito` / `renderCashout`: lista/edición de métodos de pago con proveedor y montos.
  - `renderConsideraciones`: texto libre (textarea).
  - `renderPromociones`: lista de promos con título + descripción.
  - `renderTerminos`: link o texto plano, con botón de abrir si es URL.
  - `renderCanales`: lista de canales (string o nombre/contacto).
  - `renderNotas`: timeline ordenada por fecha desc, con edición y nueva nota.

- **Búsquedas:**
  - **Local (`#gameSearch`)**: filtra juegos de la compañía actual.
  - **Global (`#globalSearch`)**:
    - Busca en las 8 secciones de todas las compañías.
    - **Respeta filtros activos**: solo busca en las categorías seleccionadas en los chips.
    - Si no hay filtros seleccionados, busca en todo.
    - Resultados organizados por compañía con secciones separadas y contadores.
    - Previews de textos largos (120-200 caracteres).

- **Modo edición global:**
  - Solicita contraseña admin (cacheada en `localStorage`).
  - `saveCurrentTab()` persiste datos del tab actual en Firebase.
  - Cambiar de tab en modo edición pregunta si se quiere salir.

- **Crear compañía:**
  - Modal con nombre + color (paleta sugerida de 12 colores).
  - Valida duplicados, crea estructura completa en Firebase.

---

## Flujo típico de uso

1. Se cargan compañías desde Firebase.
2. Se sincroniza estado de toggles locales y remotos.
3. El usuario:
   - Busca compañías en el sidebar con el buscador local.
   - Selecciona compañía en el sidebar.
   - Usa tabs para navegar por información.
   - Puede buscar globalmente con filtros de categoría:
     - Selecciona qué categorías buscar (o deja vacío para buscar en todo).
     - Los filtros se mantienen entre sesiones.
4. Para editar:
   - Pulsa "Editar" → ingresa contraseña admin (una vez).
   - Modifica datos en el tab actual.
   - Pulsa "Guardar" para persistir.
5. En **Notas**: agrega/edita/elimina notas con persistencia en Firebase.

---

## Almacenamiento local (localStorage)

| Key | Contenido |
|---|---|
| `operapediaTheme` | `"dark"` o `"light"` |
| `credentialsState` | JSON con estados de toggles y lastModified de juegos |
| `companyLocalFilter` | JSON con `{ companyIds: [...] }` |
| `credentialsAdminLoggedIn` | `"true"` si admin autenticado |
| `operapediaCategoryFilters` | JSON array de categorías activas (ej: `["credenciales","notas"]`) |

---

## Estructura de datos en Firebase

```
companies/
  {companyId}/
    id: number|string
    name: string
    color: string (hex)
    games/
      {gameId}/
        id: number|string
        name: string
        username: string
        link: string
        active: boolean
        lastModified: string (YYYY-MM-DD)
    metodosDeposito: Array<{metodo, proveedor, montoMinimo, montoMaximo}>
    metodosCashout: Array<{metodo, proveedor, montoMinimo, montoMaximo}>
    consideracionesCashout: string
    promociones: Array<{titulo, descripcion}>
    terminosLink: string
    canales: Array<string> | Array<{nombre, contacto}>
    notas: Array<{texto: string, fecha: ISOString}>

gamesConfig/
  {companyId}_{gameId}/
    companyId: number|string
    gameId: number|string
    active: boolean
    lastModified: string
```

---

## Stack tecnológico

- **Frontend**: HTML5, CSS3 (vanilla), JavaScript (ES6+)
- **Tipografía**: Inter (Google Fonts)
- **Backend/DB**: Firebase Realtime Database (modular SDK v12)
- **Diseño**: Dark/Light theme, glassmorphism, micro-animaciones, CSS custom properties