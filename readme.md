# Operapedia / Panel de Credenciales

Panel web para gestionar credenciales de compañías (juegos), con soporte para modos de depósito/cashout, consideraciones, promociones, términos, canales de atención y notas tipo timeline.

---

## Estructura general del proyecto

- `index.html`
  - Layout principal con dos columnas:
    - **Sidebar**: lista de compañías.
      - `<div id="companiesList"></div>`: listado clickeable de compañías.
      - Filtro local por compañía: `<div id="localFilterList"></div>`.
      - Toggle de tema: `<input type="checkbox" id="themeToggle">`.
    - **Contenido principal**:
      - Título de compañía: `<h1 id="companyTitle">`.
      - Buscadores:
        - Local (por juego): `<input id="gameSearch">`.
        - **Global (todas las secciones de todas las compañías)**: `<input id="globalSearch">`.
      - Tabs:
        ```html
        <div class="tabs-container" id="tabsContainer">
          <button class="tab" data-tab="credenciales">Credenciales</button>
          <button class="tab" data-tab="deposito">Métodos de depósito</button>
          <button class="tab" data-tab="cashout">Métodos de cashout</button>
          <button class="tab" data-tab="consideraciones">Consideraciones</button>
          <button class="tab" data-tab="promociones">Promociones</button>
          <button class="tab" data-tab="terminos">Términos</button>
          <button class="tab" data-tab="canales">Canales</button>
          <button class="tab" data-tab="notas">Notas</button>
        </div>
        ```
      - Contenedores por tab (pane):
        ```html
        <!-- Credenciales -->
        <div class="tab-pane tab-pane-active" data-pane="credenciales">
          <div id="gamesGrid"></div>
        </div>

        <!-- Depósito -->
        <div class="tab-pane" data-pane="deposito">
          <div id="depositoContent"></div>
        </div>

        <!-- Cashout -->
        <div class="tab-pane" data-pane="cashout">
          <div id="cashoutContent"></div>
        </div>

        <!-- Consideraciones -->
        <div class="tab-pane" data-pane="consideraciones">
          <div id="consideracionesContent"></div>
        </div>

        <!-- Promociones -->
        <div class="tab-pane" data-pane="promociones">
          <div id="promocionesContent"></div>
        </div>

        <!-- Términos -->
        <div class="tab-pane" data-pane="terminos">
          <div id="terminosContent"></div>
        </div>

        <!-- Canales -->
        <div class="tab-pane" data-pane="canales">
          <div id="canalesContent"></div>
        </div>

        <!-- Notas -->
        <div class="tab-pane" data-pane="notas">
          <div id="notasContent"></div>
        </div>
        ```
      - Botón de edición global:
        - `<button id="editModeBtn">Editar</button>`
      - Toast:
        - `<div id="toast"></div>`

- `styles.css`
  - Variables de tema y colores (`data-theme="dark|light"`).
  - Estilos de:
    - Sidebar, `company-item`, barra de color, contador de juegos activos.
    - Grid de juegos (`.game-card`, `.inactive`, `.status-toggle`, `.copy-btn`, `.link-btn`).
    - Tabs (`.tabs-container`, `.tab`, `.tab-active`, `.tab-pane`, `.tab-pane-active`).
    - Vistas de depósito/cashout (`.tab-info-card`, `.metodo-deposito-item`, etc.).
    - Promociones, consideraciones, términos, canales.
    - Notas timeline:
      - `.notas-list`, `.nota-item`, `.nota-header`, `.nota-fecha`, `.nota-texto`
      - `.edit-nota-card`, `.nota-fecha-edit`, `.edit-nota-textarea`
      - `.new-nota-card`, etc.
    - **Resultados de búsqueda global**:
      - `.result-section`, `.search-result-card`, `.search-result-title`
      - `.search-result-text`, `.search-result-date`
      - `.global-results` con secciones organizadas por tipo
    - Estados vacíos (`.empty-state`).
    - Modo edición ("tarjetas" de edición genéricas: `.edit-section`, `.edit-metodo-card`, `.edit-input`, `.edit-textarea`, `.delete-btn`, `.add-new-btn`).

- `app.js`
  - **Estado global:**
    - `companies`: array de compañías.
    - `currentCompany`: compañía seleccionada.
    - `isEditMode`: modo edición on/off.
    - `currentTab`: tab actual (`credenciales`, `deposito`, `cashout`, etc.).
    - `selectedCompanyId`: para recordar la compañía seleccionada.
    - `adminLoggedIn`: control de acceso al modo edición.
    - `localCompanyFilter`: filtro local de compañías (ids).
  - **Referencias a elementos DOM**: `companiesList`, `gamesGrid`, `companyTitle`, `gameSearch`, `globalSearch`, `toast`, `localFilterList`, `editModeBtn`, `tabsContainer`.
  - **Tema (dark/light):**
    - Lee/escribe `operapediaTheme` en `localStorage`.
    - Aplica el tema a `document.documentElement` y sincroniza con checkbox.
  - **Filtro local de compañías:**
    - Guarda en `localStorage` (`companyLocalFilter`).
    - `renderLocalFilterList()` pinta checkboxes por compañía.
    - Al cambiar, recalcula qué compañías se muestran y re-renderiza.
  - **Integración Firebase:**
    - Lectura de `companies` desde RTDB.
      - Cada compañía se normaliza a `{ id, ...companyValue, games: [ ... ] }`.
    - Lectura/escucha de `gamesConfig` para toggles remotos de juegos (activo/inactivo).
    - Escritura de:
      - `gamesConfig/{companyId_gameId}` para estado activo/inactivo.
      - `companies/{id}/games/{id}` para credenciales.
      - `companies/{id}/metodosDeposito`, `metodosCashout`, `consideracionesCashout`, `promociones`, `terminosLink`, `canales`, `notas`.
  - **Estado local de juegos (toggles y lastModified):**
    - `credentialsState` en `localStorage` (companyId, gameId, active, lastModified).
    - `loadState()` mergea esto sobre los datos iniciales.
    - `saveState()` guarda la foto actual.
  - **Selección de compañía y tabs:**
    - `renderCompanies()` pinta la lista y cuenta de juegos activos.
    - `selectCompany(company)` setea `currentCompany`, resetea búsqueda local, habilita tabs, selecciona `credenciales`.
    - `switchTab(tabName)` cambia clases de tabs y panes, y llama a:
      - `renderGames`, `renderDeposito`, `renderCashout`, `renderConsideraciones`, `renderPromociones`, `renderTerminos`, `renderCanales`, `renderNotas`.
  - **Credenciales (tab credenciales):**
    - Modo vista:
      - Lista de `games` filtrados por búsqueda local.
      - Botones de copiar username y abrir link.
      - Toggle de activo/inactivo con `status-toggle`.
    - Modo edición:
      - Inputs editables para username y link.
      - Botones Guardar/Eliminar por juego.
      - Card de "Nuevo juego" con inputs y botón `Agregar juego`.
    - Guardado:
      - Cada "Guardar" de juego escribe en Firebase y `localStorage`.
      - "Agregar juego" crea un id incremental, setea `active:true`, `lastModified` hoy, y persiste.
      - `deleteGameFromCompany` elimina juego y borra el nodo en Firebase.
  - **Tabs adicionales:**
    - `renderDeposito(company)`:
      - Vista: lista de métodos (proveedor, monto mínimo/máximo).
      - Edición: tarjetas con inputs para cada campo y botón eliminar + botón global `+ Agregar método`.
      - Guardado: sobrescribe `company.metodosDeposito` y envía array a Firebase.
    - `renderCashout(company)`:
      - Igual que depósito pero para cashout.
    - `renderConsideraciones(company)`:
      - Vista: texto plano (pre-wrap).
      - Edición: textarea única. Guarda en `company.consideracionesCashout`.
    - `renderPromociones(company)`:
      - Vista: lista simple de promos (título + descripción).
      - Edición: tarjetas con título + textarea descripción, botón eliminar, botón `+ Agregar promoción`.
    - `renderTerminos(company)`:
      - Vista:
        - Si es URL http/https: muestra botón para abrir.
        - Si no, despliega texto plano.
      - Edición: input de texto simple (`terminosLink`).
    - `renderCanales(company)`:
      - Vista: lista de canales (string simple o objeto con nombre/contacto).
      - Edición: inputs por línea, botón eliminar, botón `+ Agregar canal`.
  - **Notas (tab notas) – timeline:**
    - Estructura en compañía:
      - `company.notas` es un array de objetos `{ texto: string, fecha: ISOString }`.
    - Vista (modo lectura):
      - Ordena las notas por `fecha` desc (más recientes primero).
      - Muestra tarjetas con fecha formateada y texto.
    - Modo edición:
      - Ordena visualmente, pero **mantiene referencia al índice original** para evitar sobrescribir datos incorrectos.
      - Para cada nota:
        - Tarjeta con fecha y textarea del texto.
        - Botón de eliminar con `data-type="nota"` y `data-index` apuntando al índice original del array.
      - Card "Nueva nota" con textarea + botón `Agregar nota`.
      - El click en `Agregar nota`:
        - Crea `{ texto, fecha: new Date().toISOString() }` y lo pushea a `company.notas`.
      - Guardado del tab `notas`:
        - Recorre `.edit-nota-textarea`, actualiza `texto` en `company.notas[index]` y persiste `company.notas` completa en Firebase.
      - Eliminar nota:
        - Handler global de `delete-btn`, cuando `data-type="nota"` hace `currentCompany.notas.splice(index, 1)` y re-renderiza notas.

  - **Búsquedas:**
    - **Local (`gameSearch`)**: filtra solo juegos de `currentCompany` por nombre o username.
    - **Global (`globalSearch`)**: 
      - **Búsqueda completa en TODAS las secciones** de todas las compañías (respeta filtro local).
      - Busca en:
        1. **Credenciales**: nombre del juego, username, link
        2. **Métodos de depósito**: método, proveedor, montos
        3. **Métodos de cashout**: método, proveedor, montos
        4. **Consideraciones**: texto completo
        5. **Promociones**: título y descripción
        6. **Términos**: link o texto
        7. **Canales**: nombre y contacto
        8. **Notas**: texto de las notas
      - **Resultados organizados por compañía**:
        - Cada compañía muestra secciones separadas con íconos (🎮 Credenciales, 💰 Depósito, 💸 Cashout, 📋 Consideraciones, 🎁 Promociones, 📜 Términos, 📞 Canales, 📝 Notas).
        - Incluye contadores por sección (ej: "Promociones (3)").
        - Textos largos se truncan con preview (primeros 120-200 caracteres).
        - Notas muestran fecha formateada.

  - **Modo edición global:**
    - Botón `editModeBtn`:
      - Si no está en modo edición:
        - Solicita contraseña de admin (una vez) y la cachea en `localStorage`.
        - Activa `isEditMode = true`, cambia texto a "Guardar", re-renderiza el tab actual en modo edición.
      - Si está en modo edición:
        - Pregunta "¿Guardar los cambios?"
        - Ejecuta `saveCurrentTab()` en función del tab actual.
        - Desactiva `isEditMode`, pone texto "Editar" y re-renderiza el tab en modo lectura.
    - Cambiar de tab mientras `isEditMode === true`:
      - Pregunta si se quiere salir del modo edición (se pierden cambios sin guardar).

---

## Flujo típico de uso

1. Se cargan compañías desde Firebase.
2. Se sincroniza estado de toggles locales y remotos.
3. El usuario:
   - Selecciona compañía en el sidebar.
   - Usa tabs para navegar por información (credenciales, depósito, cashout, etc.).
   - Puede buscar:
     - **Localmente**: juegos de la compañía actual.
     - **Globalmente**: en TODAS las secciones de TODAS las compañías.
4. Para editar cualquier tab:
   - Pulsa "Editar".
   - Modifica lo que necesite en el tab actual.
   - Pulsa "Guardar" (botón global) para persistir solo ese tab.
5. En **Notas**:
   - Agrega notas nuevas desde el tab Notas en modo edición.
   - Edita textos existentes.
   - Elimina notas individuales.
   - Guarda el tab para escribir todo en Firebase.

---

## Mejoras recientes

### ✅ Sistema de búsqueda global mejorado
- **Antes**: Solo buscaba en credenciales (nombre juego, username).
- **Ahora**: Busca en **8 secciones diferentes**:
  - Credenciales, Depósito, Cashout, Consideraciones, Promociones, Términos, Canales, Notas.
- **Resultados organizados** por compañía con secciones separadas visualmente.
- **Contadores** de resultados por sección.
- **Previews** de textos largos.

### ✅ Sistema de notas tipo timeline
- Notas ordenadas por fecha (más recientes primero).
- Modo edición con referencia a índices originales (evita sobrescribir datos incorrectos).
- Fechas formateadas en formato local (es-PE).
- Agregar/Editar/Eliminar notas con persistencia en Firebase.

---

## Estructura de datos en Firebase

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