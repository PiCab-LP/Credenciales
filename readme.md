# 📓 OPERAPEDIA — Panel de Credenciales y Gestión de Compañías

Panel web premium para gestionar credenciales de compañías de juegos, con soporte completo para métodos de depósito/cashout, consideraciones, promociones, términos y condiciones, canales de atención y notas tipo timeline. Diseño moderno inspirado en Notion / Linear / Stripe con soporte para modo oscuro y claro.

---

## 📐 Arquitectura visual

```
┌──────────────────────────────────────────────────────────────────────────┐
│  📓 OPERAPEDIA       🔍 [Omnibar global + filtros]     🌙 📋 ✏️        │  ← Navbar (glassmorphism)
├──────────┬───────────────────────────────────────────────────────────────┤
│ 🔍 Buscar│  Inicio › CompañíaX                                         │
│ ➕ Nueva │  ┃ CompañíaX   🐲 Dragon   🗑️ Eliminar                     │
│          │  ──────────────────────────────────────────────────────────  │
│ COMPAÑÍAS│  🎮 Credenciales │ 💰 Depósito │ 💸 Cashout │ 📋 │ ...     │  ← 8 Tabs
│ ● Comp1  │  ┌──────────────────────────────────────────────────────┐   │
│ ● Comp2  │  │  Game Card (nombre, username, link, toggle on/off)   │   │  ← Content cards
│ ● Comp3  │  │  [Copiar]  [🔗 Abrir]   Última mod: 2026-03-04      │   │
│   ...    │  └──────────────────────────────────────────────────────┘   │
└──────────┴───────────────────────────────────────────────────────────────┘
```

---

## 📁 Estructura del proyecto

| Archivo | Descripción | Tamaño aprox. |
|---|---|---|
| `index.html` | Estructura HTML + inicialización Firebase | ~207 líneas |
| `styles.css` | Sistema de diseño completo (dark/light) | ~1600 líneas |
| `app.js` | Lógica principal de la aplicación | ~2950 líneas |
| `data.js` | Datos base/iniciales de compañías | ~62 KB |
| `seed-catalog.html` | Script de carga masiva del catálogo de juegos | ~200 líneas |
| `migration.html` | Herramienta de migración de datos a Firebase | ~140 líneas |
| `image.png` | Favicon / logo de la aplicación | — |

---

## 🧩 Funcionalidades detalladas

### 1. 🔝 Navbar superior

- **Logo OPERAPEDIA** con emoji 📓 y texto con gradiente.
- **Omnibar global** (`#globalSearch`):
  - Buscador que busca en todas las compañías y todas las categorías.
  - Al hacer focus aparece un panel de filtros con chips toggleables.
  - Filtros por **Partner** (Dragon, Tierlock, Taparcadia, Wysaro).
  - Filtros por **Categoría**: Credenciales, Depósito, Cashout, Consideraciones, Promociones, Términos, Canales, Notas.
  - Los filtros se persisten en `localStorage`.
- **Toggle de tema** 🌙/☀️: cambia entre modo oscuro y claro.
- **Botón Catálogo** 📋: abre el modal de gestión del catálogo maestro de juegos.
- **Botón Editar** ✏️: activa el modo edición (requiere contraseña admin).

---

### 2. 📋 Sidebar izquierdo

- **Buscador de compañías** (`#sidebarSearch`): filtra la lista en tiempo real por nombre.
- **Botón "➕ Nueva compañía"**: visible solo cuando el admin está logueado y en modo edición.
- **Lista de compañías** (`#companiesList`):
  - Cada item muestra: barra de color identificador, nombre, badge de partner, conteo de juegos activos.
  - Al hacer clic se selecciona la compañía y se cargan sus datos.
  - Si se intenta cambiar de compañía estando en modo edición, se presenta un modal de confirmación para guardar cambios.
- **Badge de conteo** (`#companyCountBadge`): muestra la cantidad de compañías visibles.
- Filtro por **partner**: los chips de partner en el omnibar también filtran la lista del sidebar.

---

### 3. 🏢 Contenido principal — Vista de compañía

Al seleccionar una compañía se muestra:

- **Breadcrumbs dinámicos**: `Inicio › NombreCompañía`.
- **Título de compañía** con barra de color a la izquierda.
- **Badge de partner** (ej: `🐲 Dragon`): en modo edición es clickeable para cambiar el partner.
- **Botón eliminar compañía** 🗑️ (visible solo en modo edición): requiere doble confirmación + contraseña de supervisor.
- **8 tabs de navegación**:

#### 🎮 Tab: Credenciales
- **Vista**: cards de juego con nombre, username (con botón "Copiar"), link (con botón 🔗 para abrir), toggle activo/inactivo, fecha de última modificación.
- **Edición**: inputs editables con indicador visual "dirty" (borde naranja cuando se modifica), botones Guardar y Eliminar por juego.
- **Nuevo juego**: card especial con select del catálogo maestro o opción "✏️ Otro" para nombre personalizado + campos de username y link.
- **Importar juegos** 📥: permite copiar los juegos de otra compañía del mismo partner (nombre, username y link).

#### 💰 Tab: Depósito
- Lista de métodos de depósito con: nombre del método, proveedor, monto mínimo y monto máximo.
- Modo edición permite agregar, editar y eliminar métodos.

#### 💸 Tab: Cashout
- Misma estructura que Depósito pero para métodos de retiro.

#### 📋 Tab: Consideraciones
- Texto libre para consideraciones de cashout.
- Vista en modo lectura o textarea editable.

#### 🎁 Tab: Promociones
- Lista de promociones con título y descripción.
- Modo edición: agregar, editar y eliminar promociones.

#### 📜 Tab: Términos
- Muestra URL (como botón clickeable) o texto plano de términos y condiciones.
- Modo edición: input para URL o texto directo.

#### 📞 Tab: Canales
- Lista de canales de atención (strings simples o nombre + contacto).
- Modo edición con botón agregar/eliminar.

#### 📝 Tab: Notas
- **Timeline** ordenado por fecha descendente con formato `📌 DD Mon YYYY HH:MM`.
- Modo edición: textareas editables por nota + formulario para agregar nueva nota.
- Eliminación individual con confirmación.

---

### 4. 📋 Catálogo maestro de juegos

Sistema centralizado para gestionar la lista maestra de juegos disponibles:

- **Acceso**: botón 📋 "Catálogo" en la navbar (requiere contraseña admin).
- **Modal de gestión**:
  - Lista editable de juegos con: número de orden, nombre y link.
  - **Agregar**: botón "+ Agregar juego al catálogo" agrega una fila vacía.
  - **Eliminar**: botón ✕ por juego con **modal de confirmación** que muestra el nombre del juego.
  - **Guardar**: persiste toda la lista en Firebase en `gameCatalog/`.
- **Uso**: al agregar un juego a una compañía (tab Credenciales en modo edición), aparece un dropdown con los juegos del catálogo. Al seleccionar uno, se auto-rellena el link. Si el juego no está en el catálogo, se puede usar la opción "✏️ Otro" para escribir nombre personalizado.
- **Seed masivo** (`seed-catalog.html`): página independiente para cargar la lista completa de 74 juegos en Firebase de una sola vez.

> **Nota**: El catálogo es independiente de los juegos asignados a cada compañía. Modificar el catálogo NO afecta los juegos existentes en las compañías.

---

### 5. 🤝 Sistema de Partners

Cada compañía puede tener un partner asociado:

| Partner | Icono | Color badge |
|---|---|---|
| Dragon | 🐲 | — |
| Tierlock | 🔒 | — |
| Taparcadia | 🎮 | — |
| Wysaro | ⭐ | — |

- **Filtrado por partner**: chips en el panel de filtros del omnibar. Se persisten en `localStorage`.
- **Badge en header**: al seleccionar una compañía, muestra el badge del partner al lado del título.
- **Edición de partner**: en modo edición, al hacer clic en el badge se despliega un `<select>` para cambiar el partner (se guarda inmediatamente en Firebase).
- **Importar juegos por partner**: al importar juegos, solo se muestran compañías del mismo partner.
- **Al crear compañía**: campo obligatorio para seleccionar partner, con opción de copiar juegos de una compañía existente del mismo partner.

---

### 6. 🔐 Sistema de administración

- **Contraseña admin**: requerida para activar modo edición, acceder al catálogo y eliminar compañías.
- **Sesión persistida**: una vez autenticado, se guarda `credentialsAdminLoggedIn` en `localStorage` para no pedir la contraseña de nuevo.
- **Acciones protegidas**:
  - Activar modo edición.
  - Acceder al catálogo de juegos.
  - Crear nueva compañía.
  - Eliminar compañía (requiere contraseña adicional de supervisor).

---

### 7. 🔍 Sistema de búsqueda

#### Búsqueda local (`#gameSearch`)
- Filtra los juegos de la compañía seleccionada por nombre o username.

#### Búsqueda global (`#globalSearch`)
- Busca en las **8 secciones** de **todas las compañías**.
- Respeta filtros activos:
  - **Filtro de partner**: solo busca en compañías del partner seleccionado.
  - **Filtro de categoría**: solo busca en las secciones seleccionadas.
  - Si no hay filtros seleccionados → busca en todo.
- Resultados agrupados por compañía con secciones separadas y contadores.
- Previews de textos largos (120–200 caracteres).
- Las cards de credenciales en resultados mantienen botones de Copiar y 🔗 funcionales.

---

### 8. ⚠️ Modales de confirmación

Todos los modales solo se cierran con sus botones explícitos (✕, Cancelar, Aceptar). **No se cierran al hacer clic fuera.**

| Acción | Modal | Botones |
|---|---|---|
| Guardar cambios al salir de modo edición | `showConfirmModal` | Guardar / Cancelar |
| Guardar cambios al cambiar de compañía | `showConfirmModal` | Guardar y cambiar / Cancelar |
| Cambiar de tab en modo edición | `showConfirmModal` | Salir / Cancelar |
| Eliminar compañía | `showConfirmModal` + `showPasswordModal` | Eliminar / Cancelar |
| Crear juego nuevo | `showConfirmModal` | Crear / Cancelar |
| Eliminar juego del catálogo | `showConfirmModal` | Eliminar / Cancelar |
| Importar juegos | Modal personalizado | Importar / Cancelar |
| Acceso admin | `showPasswordModal` | Confirmar / Cancelar |
| Gestión de catálogo | Modal con lista editable | Guardar catálogo / Cerrar |
| Crear compañía | Modal con formulario | Crear compañía / Cancelar |

---

### 9. 🎨 Sistema de temas (Dark / Light)

- **Dark mode** (por defecto): paleta oscura con acentos azules.
- **Light mode**: paleta clara con los mismos acentos.
- Variables CSS semánticas:
  - `--bg-app`, `--bg-card`, `--bg-input`, `--bg-sidebar`
  - `--text-primary`, `--text-secondary`, `--text-tertiary`
  - `--border`, `--accent`, `--shadow-*`
- **Transiciones suaves** al cambiar tema (`transition: 0.35s`).
- **Persistencia** en `localStorage` (`operapediaTheme`).
- **Glassmorphism**: navbar y ciertos elementos usan `backdrop-filter: blur`.

---

### 10. 🏗️ Crear compañía

Modal completo con:

1. **Nombre** de la compañía (obligatorio, validación de duplicados).
2. **Color identificador**: input hex + paleta de 12 colores sugeridos con preview en tiempo real.
3. **Partner / Licencia**: select obligatorio (Dragon, Tierlock, Taparcadia, Wysaro).
4. **Juegos iniciales** (aparece al seleccionar partner):
   - Dropdown para copiar juegos de otra compañía del mismo partner.
   - Lista editable con nombre, username y link por juego.
   - Botón "+ Agregar juego" para filas manuales.
5. Al crear, se genera estructura completa en Firebase con nota automática de creación.

---

### 11. 🗑️ Eliminar compañía

Proceso con triple seguridad:

1. **Solo visible** en modo edición con compañía seleccionada.
2. **Modal de confirmación** con el nombre de la compañía.
3. **Modal de contraseña** de supervisor.
4. Se elimina el nodo completo en Firebase y se resetea la UI.

---

## 💾 Almacenamiento local (`localStorage`)

| Key | Tipo | Descripción |
|---|---|---|
| `operapediaTheme` | `string` | `"dark"` o `"light"` |
| `companyLocalFilter` | `JSON` | `{ companyIds: [...] }` filtro legacy |
| `credentialsAdminLoggedIn` | `string` | `"true"` si admin autenticado |
| `operapediaCategoryFilters` | `JSON` | Array de categorías activas (ej: `["credenciales","notas"]`) |
| `operapediaPartnerFilters` | `JSON` | Array de partners activos (ej: `["Dragon","Tierlock"]`) |

---

## 🔥 Estructura de datos en Firebase Realtime Database

```
companies/
  {companyId}/
    id: number|string
    name: string
    color: string (#hex)
    partner: string ("Dragon"|"Tierlock"|"Taparcadia"|"Wysaro"|"")
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

gameCatalog/
  {index}/
    id: number
    name: string
    link: string
```

---

## 🔄 Flujo típico de uso

### Consulta de información (operador)
1. Se cargan compañías desde Firebase automáticamente.
2. Se sincroniza estado de toggles locales y remotos.
3. El operador busca una compañía en el sidebar o usa la búsqueda global.
4. Selecciona la compañía y navega por los 8 tabs.
5. Puede copiar usernames con un clic y abrir links directamente.

### Edición de datos (admin)
1. Pulsa "Editar" → ingresa contraseña admin (una vez por sesión).
2. Modifica datos en el tab actual (credenciales, métodos de pago, notas, etc.).
3. **Guardar** persiste los cambios del tab actual en Firebase.
4. Puede agregar/eliminar juegos, importar desde otra compañía o crear compañías nuevas.

### Gestión del catálogo (admin)
1. Pulsa "📋 Catálogo" → ingresa contraseña admin.
2. Agrega, edita o elimina juegos de la lista maestra.
3. Pulsa "Guardar catálogo" para persistir.

---

## ⚙️ Stack tecnológico

| Capa | Tecnología |
|---|---|
| **Frontend** | HTML5, CSS3 (vanilla), JavaScript ES6+ |
| **Tipografía** | Inter (Google Fonts) — pesos 400, 500, 600, 700, 800 |
| **Base de datos** | Firebase Realtime Database (SDK modular v12.6.0) |
| **Diseño** | Dark/Light themes, glassmorphism, micro-animaciones, CSS custom properties |
| **Hosting** | Estático (cualquier servidor web) |

---

## 🚀 Despliegue

1. Subir todos los archivos a un servidor web estático.
2. Asegurarse de que las reglas de Firebase Realtime Database permitan lectura/escritura.
3. Para cargar el catálogo inicial: abrir `seed-catalog.html` en el navegador y hacer clic en "Subir catálogo".

---

## 📝 Changelog reciente

### v2.1 — Marzo 2026
- ✅ **Modales mejorados**: ya no se cierran al hacer clic fuera. Solo se cierran con botones explícitos (✕, Cancelar, Aceptar).
- ✅ **Confirmación al eliminar del catálogo**: nuevo modal de confirmación al borrar un juego del catálogo mostrando el nombre del juego.
- ✅ **Carga masiva de catálogo**: nuevo archivo `seed-catalog.html` para subir 74 juegos con sus links a Firebase de una sola vez.

### v2.0 — Febrero 2026
- ✅ **Catálogo maestro de juegos**: gestión centralizada de la lista de juegos disponibles.
- ✅ **Sistema de partners**: Dragon, Tierlock, Taparcadia, Wysaro con filtrado y badges.
- ✅ **Importar juegos**: copiar juegos de otra compañía del mismo partner.
- ✅ **Crear compañía mejorado**: con selector de partner y clonación de juegos.
- ✅ **Eliminar compañía**: con doble confirmación y contraseña de supervisor.
- ✅ **Rediseño completo del frontend**: dark theme, glassmorphism, micro-animaciones.
- ✅ **Búsqueda global mejorada**: filtros por partner y categoría, persistidos en localStorage.
- ✅ **Notas tipo timeline**: sistema de notas ordenadas cronológicamente con edición inline.