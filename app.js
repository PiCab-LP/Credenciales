document.addEventListener('DOMContentLoaded', () => {
  let companies = [];
  let currentCompany = null;
  let isEditMode = false;
  let currentTab = 'credenciales';
  let selectedCompanyId = null;
  let adminLoggedIn = false;
  const ADMIN_PASSWORD = 'superctrl2023';

  const companiesList = document.getElementById('companiesList');
  const gamesGrid = document.getElementById('gamesGrid');
  const companyTitle = document.getElementById('companyTitle');
  const gameSearch = document.getElementById('gameSearch');
  const globalSearch = document.getElementById('globalSearch');
  const toast = document.getElementById('toast');
  const localFilterList = document.getElementById('localFilterList');
  const editModeBtn = document.getElementById('editModeBtn');
  const tabsContainer = document.getElementById('tabsContainer');
  
  // ==================== THEME TOGGLE ====================
  let currentTheme = localStorage.getItem('operapediaTheme') || 'dark';
  const themeToggleInput = document.getElementById('themeToggle');

  const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    if (themeToggleInput) {
      themeToggleInput.checked = theme === 'light';
    }
  };

  const toggleTheme = () => {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(currentTheme);
    localStorage.setItem('operapediaTheme', currentTheme);
  };

  if (themeToggleInput) {
    themeToggleInput.addEventListener('change', toggleTheme);
  }

  applyTheme(currentTheme);
  // ==================== FIN THEME TOGGLE ====================

  // ========= FILTRO LOCAL =========
  let localCompanyFilter = { companyIds: [] };

  const loadLocalFilter = () => {
    const raw = localStorage.getItem('companyLocalFilter');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.companyIds)) {
        localCompanyFilter = { companyIds: parsed.companyIds };
      }
    } catch {
      localCompanyFilter = { companyIds: [] };
    }
  };

  const saveLocalFilter = () => {
    localStorage.setItem('companyLocalFilter', JSON.stringify(localCompanyFilter));
  };

  const renderLocalFilterList = () => {
    if (!localFilterList) return;
    localFilterList.innerHTML = '';
    companies.forEach(company => {
      const wrapper = document.createElement('label');
      wrapper.className = 'local-filter-item';
      const checked = localCompanyFilter.companyIds.includes(company.id);
      wrapper.innerHTML = `
        <input type="checkbox" data-company-id="${company.id}" ${checked ? 'checked' : ''}>
        <span>${company.name}</span>
      `;
      localFilterList.appendChild(wrapper);
    });
  };

  if (localFilterList) {
    localFilterList.addEventListener('change', e => {
      const input = e.target.closest('input[type="checkbox"]');
      if (!input) return;
      const idStr = input.getAttribute('data-company-id');
      const id = isNaN(Number(idStr)) ? idStr : Number(idStr);

      if (input.checked) {
        if (!localCompanyFilter.companyIds.includes(id)) {
          localCompanyFilter.companyIds.push(id);
        }
      } else {
        localCompanyFilter.companyIds =
          localCompanyFilter.companyIds.filter(x => x !== id);
      }

      saveLocalFilter();
      renderCompanies();
    });
  }

  // ========= FIREBASE (toggles remotos) =========
  const applyRemoteSettings = () => {
    if (!window.gamesRef || !window.firebaseOnValue) return;

    window.firebaseOnValue(window.gamesRef, snapshot => {
      const data = snapshot.val();
      if (!data) return;

      Object.values(data).forEach(s => {
        const company = companies.find(c => String(c.id) === String(s.companyId));
        if (!company) return;
        const game = company.games.find(g => String(g.id) === String(s.gameId));
        if (!game) return;
        game.active = s.active;
        if (s.lastModified) game.lastModified = s.lastModified;
      });

      renderCompanies();
      if (currentCompany && currentTab === 'credenciales' && !isEditMode) {
        renderGames(currentCompany.games, gameSearch.value);
      }
    });
  };

  const updateRemoteToggle = (company, game) => {
    if (!window.db || !window.firebaseRef || !window.firebaseSet) return;
    const key = `${company.id}_${game.id}`;
    const nodeRef = window.firebaseRef(window.db, `gamesConfig/${key}`);
    window.firebaseSet(nodeRef, {
      companyId: company.id,
      gameId: game.id,
      active: game.active,
      lastModified: game.lastModified
    });
  };

  // ========= ESTADO LOCAL (toggles) =========
  const loadState = () => {
    const saved = localStorage.getItem('credentialsState');
    if (!saved) return;
    const state = JSON.parse(saved);
    companies.forEach(company => {
      company.games.forEach(game => {
        const s = state.find(
          g => String(g.companyId) === String(company.id) && String(g.id) === String(game.id)
        );
        if (s) {
          game.active = s.active;
          game.lastModified = s.lastModified;
        }
      });
    });
  };

  const saveState = () => {
    const state = [];
    companies.forEach(company => {
      company.games.forEach(game => {
        state.push({
          companyId: company.id,
          id: game.id,
          active: game.active,
          lastModified: game.lastModified
        });
      });
    });
    localStorage.setItem('credentialsState', JSON.stringify(state));
  };

  // ========= RENDER COMPAÑÍAS =========
  const renderCompanies = () => {
    companiesList.innerHTML = '';

    const visibleCompanies = companies.filter(c => {
      if (localCompanyFilter.companyIds.length === 0) return true;
      return localCompanyFilter.companyIds.includes(c.id);
    });

    visibleCompanies.forEach(company => {
      const activeCount = company.games.filter(g => g.active).length;
      const item = document.createElement('div');
      item.className = 'company-item';
      item.innerHTML = `
        <div class="company-color" style="background:${company.color}"></div>
        <span class="company-name">${company.name}</span>
        <span class="company-count">${activeCount}</span>
      `;
      item.addEventListener('click', () => {
        document
          .querySelectorAll('.company-item')
          .forEach(el => el.classList.remove('active'));
        item.classList.add('active');
        selectCompany(company);
      });
      companiesList.appendChild(item);
    });

    if (
      currentCompany &&
      !visibleCompanies.find(c => String(c.id) === String(currentCompany.id))
    ) {
      currentCompany = null;
      companyTitle.textContent = 'Selecciona una compañía';
      if (editModeBtn) {
        isEditMode = false;
        editModeBtn.textContent = 'Editar';
        editModeBtn.disabled = true;
      }
      if (tabsContainer) {
        tabsContainer.style.display = 'none';
      }
      gamesGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📁</div>
          <p>Selecciona una compañía para ver sus credenciales</p>
        </div>`;
    }
  };

  // ========= SELECCIÓN DE COMPAÑÍA Y TABS =========
  const selectCompany = company => {
    currentCompany = company;
    selectedCompanyId = company.id;
    companyTitle.innerHTML = `
      <div class="company-title-bar" style="background:${company.color}"></div>
      ${company.name}
    `;
    gameSearch.value = '';
    
    if (isEditMode) {
      isEditMode = false;
      editModeBtn.textContent = 'Editar';
      updateAddCompanyBtnVisibility();
    }
    
    if (editModeBtn) {
      editModeBtn.disabled = false;
    }
    
    if (tabsContainer) {
      tabsContainer.style.display = 'flex';
    }
    
    currentTab = 'credenciales';
    switchTab('credenciales');
  };

const switchTab = (tabName) => {
  if (!currentCompany) return;

  if (isEditMode && currentTab !== tabName) {
    const confirmSwitch = confirm('¿Salir del modo edición? Los cambios no guardados se perderán.');
    if (!confirmSwitch) return;
    isEditMode = false;
    editModeBtn.textContent = 'Editar';
  }

  currentTab = tabName;

  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('tab-active', tab.dataset.tab === tabName);
  });

  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('tab-pane-active', pane.dataset.pane === tabName);
  });

  switch(tabName) {
    case 'credenciales':
      renderGames(currentCompany.games, '');
      break;
    case 'deposito':
      renderDeposito(currentCompany);
      break;
    case 'cashout':
      renderCashout(currentCompany);
      break;
    case 'consideraciones':
      renderConsideraciones(currentCompany);
      break;
    case 'promociones':
      renderPromociones(currentCompany);
      break;
    case 'terminos':
      renderTerminos(currentCompany);
      break;
    case 'canales':
      renderCanales(currentCompany);
      break;
    case 'notas':
      renderNotas(currentCompany);
      break;
  }
};

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      switchTab(tab.dataset.tab);
    });
  });

  // ========= RENDER CREDENCIALES =========
  const renderGames = (games, term) => {
    const t = term.toLowerCase();
    const filtered = games.filter(
      g =>
        g.name.toLowerCase().includes(t) ||
        g.username.toLowerCase().includes(t)
    );

    let html = '';

    if (!filtered.length) {
      html += `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <p>No se encontraron juegos</p>
        </div>`;
    } else {
      html += filtered
        .map(g => {
          const disabledAttr = g.active ? '' : 'disabled';
          const disabledClass = g.active ? '' : 'disabled';

          if (!isEditMode) {
            return `
          <div class="game-card ${g.active ? '' : 'inactive'}">
            <div class="game-header">
              <div class="game-name">${g.name}</div>
              <div class="game-status">
                <div class="status-toggle ${g.active ? 'active' : ''}"
                     data-company-id="${currentCompany.id}"
                     data-game-id="${g.id}"></div>
              </div>
            </div>
            <div class="game-details">
              <div class="detail-row">
                <span class="detail-label">Username:</span>
                <span class="detail-value">${g.username}</span>
                <button class="copy-btn ${disabledClass}" ${disabledAttr} data-copy="${g.username}">Copiar</button>
              </div>
              <div class="detail-row">
                <span class="detail-label">Link:</span>
                <span class="detail-value">${g.link}</span>
                <button class="link-btn ${disabledClass}" ${disabledAttr}
                        data-link="${g.link}" title="Abrir enlace">🔗</button>
              </div>
            </div>
            <div class="last-modified">Última mod: ${g.lastModified}</div>
          </div>
        `;
          }

          return `
        <div class="game-card ${g.active ? '' : 'inactive'}" data-edit-card="1"
             data-company-id="${currentCompany.id}" data-game-id="${g.id}">
          <div class="game-header">
            <div class="game-name">${g.name}</div>
            <div class="game-status">
              <div class="status-toggle ${g.active ? 'active' : ''}"
                   data-company-id="${currentCompany.id}"
                   data-game-id="${g.id}"></div>
            </div>
          </div>
          <div class="game-details">
            <div class="detail-row">
              <span class="detail-label">Username:</span>
              <input class="edit-username-input"
                     data-company-id="${currentCompany.id}"
                     data-game-id="${g.id}"
                     value="${g.username}">
            </div>
            <div class="detail-row">
              <span class="detail-label">Link:</span>
              <input class="edit-link-input"
                     data-company-id="${currentCompany.id}"
                     data-game-id="${g.id}"
                     value="${g.link}">
            </div>
          </div>
          <div class="edit-actions">
            <button class="save-edit-btn"
                    data-company-id="${currentCompany.id}"
                    data-game-id="${g.id}">
              Guardar
            </button>
            <button class="delete-game-btn"
                    data-company-id="${currentCompany.id}"
                    data-game-id="${g.id}">
              Eliminar
            </button>
          </div>
          <div class="last-modified">Última mod: ${g.lastModified}</div>
        </div>
      `;
        })
        .join('');
    }

    if (isEditMode && currentCompany) {
      html += `
        <div class="game-card new-game-card">
          <div class="game-header">
            <div class="game-name">Nuevo juego</div>
          </div>
          <div class="game-details">
            <div class="detail-row">
              <span class="detail-label">Nombre:</span>
              <input class="new-game-name-input">
            </div>
            <div class="detail-row">
              <span class="detail-label">Username:</span>
              <input class="new-game-username-input">
            </div>
            <div class="detail-row">
              <span class="detail-label">Link:</span>
              <input class="new-game-link-input">
            </div>
          </div>
          <div class="edit-actions">
            <button class="add-game-btn">Agregar juego</button>
          </div>
        </div>
      `;
    }

    gamesGrid.innerHTML = html;
    if (isEditMode && currentCompany) {
      attachEditInputsListeners();
    }
  };

  // ========= RENDER MÉTODOS DE DEPÓSITO =========
  const renderDeposito = (company) => {
    const container = document.getElementById('depositoContent');
    if (!container) return;
    
    const metodos = company.metodosDeposito || [];
    
    if (!isEditMode) {
      if (metodos.length === 0) {
        container.innerHTML = `
          <div class="tab-info-card">
            <h3>Métodos de depósito</h3>
            <p>No hay métodos de depósito disponibles.</p>
          </div>
        `;
        return;
      }
      
      let html = '<div class="tab-info-card"><h3>Métodos de depósito</h3>';
      
      metodos.forEach((metodo) => {
        html += `
          <div class="metodo-deposito-item">
            <div class="metodo-titulo">${metodo.metodo || metodo.metodoPago || 'Método de depósito'}</div>
            <div class="metodo-detalles">
              <div class="metodo-row">
                <span class="metodo-label">Proveedor:</span>
                <span class="metodo-value">${metodo.proveedor || 'N/A'}</span>
              </div>
              <div class="metodo-row">
                <span class="metodo-label">Monto mínimo:</span>
                <span class="metodo-value">${metodo.montoMinimo || 'N/A'}</span>
              </div>
              <div class="metodo-row">
                <span class="metodo-label">Monto máximo:</span>
                <span class="metodo-value">${metodo.montoMaximo || 'N/A'}</span>
              </div>
            </div>
          </div>
        `;
      });
      
      html += '</div>';
      container.innerHTML = html;
    } else {
      let html = '<div class="edit-section"><h3>Métodos de depósito</h3>';
      
      metodos.forEach((metodo, index) => {
        html += `
          <div class="edit-metodo-card">
            <div class="edit-card-header">
              <input 
                type="text" 
                class="edit-input" 
                value="${metodo.metodo || metodo.metodoPago || ''}" 
                data-index="${index}"
                data-field="metodo"
                placeholder="Nombre del método"
              />
              <button class="delete-btn" data-index="${index}" data-type="deposito">🗑️</button>
            </div>
            <div class="edit-card-body">
              <label>Proveedor:</label>
              <input 
                type="text" 
                class="edit-input" 
                value="${metodo.proveedor || ''}" 
                data-index="${index}"
                data-field="proveedor"
              />
              <label>Monto mínimo:</label>
              <input 
                type="text" 
                class="edit-input" 
                value="${metodo.montoMinimo || ''}" 
                data-index="${index}"
                data-field="montoMinimo"
              />
              <label>Monto máximo:</label>
              <input 
                type="text" 
                class="edit-input" 
                value="${metodo.montoMaximo || ''}" 
                data-index="${index}"
                data-field="montoMaximo"
              />
            </div>
          </div>
        `;
      });
      
      html += `
        <button class="add-new-btn" data-type="deposito">
          + Agregar método de depósito
        </button>
      `;
      
      html += '</div>';
      container.innerHTML = html;
    }
  };

  // ========= RENDER MÉTODOS DE CASHOUT =========
  const renderCashout = (company) => {
    const container = document.getElementById('cashoutContent');
    if (!container) return;
    
    const metodos = company.metodosCashout || [];
    
    if (!isEditMode) {
      if (metodos.length === 0) {
        container.innerHTML = `
          <div class="tab-info-card">
            <h3>Métodos de cashout</h3>
            <p>No hay métodos de cashout disponibles.</p>
          </div>
        `;
        return;
      }
      
      let html = '<div class="tab-info-card"><h3>Métodos de cashout</h3>';
      
      metodos.forEach((metodo) => {
        html += `
          <div class="metodo-deposito-item">
            <div class="metodo-titulo">${metodo.metodo || metodo.metodoPago || 'Método de cashout'}</div>
            <div class="metodo-detalles">
              <div class="metodo-row">
                <span class="metodo-label">Proveedor:</span>
                <span class="metodo-value">${metodo.proveedor || 'N/A'}</span>
              </div>
              <div class="metodo-row">
                <span class="metodo-label">Monto mínimo:</span>
                <span class="metodo-value">${metodo.montoMinimo || 'N/A'}</span>
              </div>
              <div class="metodo-row">
                <span class="metodo-label">Monto máximo:</span>
                <span class="metodo-value">${metodo.montoMaximo || 'N/A'}</span>
              </div>
            </div>
          </div>
        `;
      });
      
      html += '</div>';
      container.innerHTML = html;
    } else {
      let html = '<div class="edit-section"><h3>Métodos de cashout</h3>';
      
      metodos.forEach((metodo, index) => {
        html += `
          <div class="edit-metodo-card">
            <div class="edit-card-header">
              <input 
                type="text" 
                class="edit-input" 
                value="${metodo.metodo || metodo.metodoPago || ''}" 
                data-index="${index}"
                data-field="metodo"
                placeholder="Nombre del método"
              />
              <button class="delete-btn" data-index="${index}" data-type="cashout">🗑️</button>
            </div>
            <div class="edit-card-body">
              <label>Proveedor:</label>
              <input 
                type="text" 
                class="edit-input" 
                value="${metodo.proveedor || ''}" 
                data-index="${index}"
                data-field="proveedor"
              />
              <label>Monto mínimo:</label>
              <input 
                type="text" 
                class="edit-input" 
                value="${metodo.montoMinimo || ''}" 
                data-index="${index}"
                data-field="montoMinimo"
              />
              <label>Monto máximo:</label>
              <input 
                type="text" 
                class="edit-input" 
                value="${metodo.montoMaximo || ''}" 
                data-index="${index}"
                data-field="montoMaximo"
              />
            </div>
          </div>
        `;
      });
      
      html += `
        <button class="add-new-btn" data-type="cashout">
          + Agregar método de cashout
        </button>
      `;
      
      html += '</div>';
      container.innerHTML = html;
    }
  };

  // ========= RENDER CONSIDERACIONES =========
  const renderConsideraciones = (company) => {
    const container = document.getElementById('consideracionesContent');
    if (!container) return;
    
    const consideraciones = company.consideracionesCashout || '';
    
    if (!isEditMode) {
      if (!consideraciones) {
        container.innerHTML = `
          <div class="tab-info-card">
            <h3>Consideraciones para cashouts</h3>
            <p>No hay consideraciones disponibles.</p>
          </div>
        `;
        return;
      }
      
      container.innerHTML = `
        <div class="tab-info-card">
          <h3>Consideraciones para cashouts</h3>
          <p style="white-space: pre-wrap; line-height: 1.6;">${consideraciones}</p>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="edit-section">
          <h3>Consideraciones para cashouts</h3>
          <textarea 
            id="consideracionesTextarea"
            class="edit-textarea" 
            rows="10"
            placeholder="Escribe las consideraciones para cashouts..."
          >${consideraciones}</textarea>
        </div>
      `;
    }
  };

  // ========= RENDER PROMOCIONES =========
  const renderPromociones = (company) => {
    const container = document.getElementById('promocionesContent');
    if (!container) return;
    
    const promociones = company.promociones || [];
    
    if (!isEditMode) {
      if (promociones.length === 0) {
        container.innerHTML = `
          <div class="tab-info-card">
            <h3>Promociones activas</h3>
            <p>No hay promociones disponibles.</p>
          </div>
        `;
        return;
      }
      
      let html = '<div class="tab-info-card"><h3>Promociones activas</h3>';
      html += '<div class="promociones-simple-list">';
      
      promociones.forEach((promo, index) => {
        html += `
          <div class="promocion-simple-item">
            <div class="promocion-simple-title">${promo.titulo || 'Promoción ' + (index + 1)}</div>
            <div class="promocion-simple-desc">${promo.descripcion || 'Sin descripción'}</div>
          </div>
        `;
      });
      
      html += '</div></div>';
      container.innerHTML = html;
    } else {
      let html = '<div class="edit-section"><h3>Promociones activas</h3>';
      
      promociones.forEach((promo, index) => {
        html += `
          <div class="edit-metodo-card">
            <div class="edit-card-header">
              <input 
                type="text" 
                class="edit-input" 
                value="${promo.titulo || ''}" 
                data-index="${index}"
                data-field="titulo"
                placeholder="Título de la promoción"
              />
              <button class="delete-btn" data-index="${index}" data-type="promociones">🗑️</button>
            </div>
            <div class="edit-card-body">
              <label>Descripción:</label>
              <textarea 
                class="edit-textarea" 
                rows="3"
                data-index="${index}"
                data-field="descripcion"
                placeholder="Descripción de la promoción"
              >${promo.descripcion || ''}</textarea>
            </div>
          </div>
        `;
      });
      
      html += `
        <button class="add-new-btn" data-type="promociones">
          + Agregar promoción
        </button>
      `;
      
      html += '</div>';
      container.innerHTML = html;
    }
  };

  // ========= RENDER TÉRMINOS =========
  const renderTerminos = (company) => {
    const container = document.getElementById('terminosContent');
    if (!container) return;
    
    const link = company.terminosLink || company.terminosCondiciones || '';
    
    if (!isEditMode) {
      if (!link) {
        container.innerHTML = `
          <div class="tab-info-card">
            <h3>Términos y condiciones</h3>
            <p>No hay información disponible.</p>
          </div>
        `;
        return;
      }
      
      if (typeof link === 'string' && (link.startsWith('http://') || link.startsWith('https://'))) {
        container.innerHTML = `
          <div class="tab-info-card">
            <h3>Términos y condiciones</h3>
            <p style="margin-bottom: 16px;">Consulta los términos y condiciones completos en el siguiente enlace:</p>
            <a href="${link}" target="_blank" rel="noopener noreferrer" class="terminos-link-btn">
              Ver términos y condiciones completos →
            </a>
          </div>
        `;
      } else {
        container.innerHTML = `
          <div class="tab-info-card">
            <h3>Términos y condiciones</h3>
            <p style="white-space: pre-wrap;">${link}</p>
          </div>
        `;
      }
    } else {
      container.innerHTML = `
        <div class="edit-section">
          <h3>Términos y condiciones</h3>
          <label>URL o texto de términos y condiciones:</label>
          <input 
            type="text" 
            id="terminosInput"
            class="edit-input" 
            value="${link}" 
            placeholder="https://example.com/terminos o texto directo"
          />
        </div>
      `;
    }
  };

  // ========= RENDER CANALES =========
  const renderCanales = (company) => {
    const container = document.getElementById('canalesContent');
    if (!container) return;
    
    const canales = company.canales || company.canalesAtencion || [];
    
    if (!isEditMode) {
      if (canales.length === 0) {
        container.innerHTML = `
          <div class="tab-info-card">
            <h3>Canales de atención</h3>
            <p>No hay canales de atención disponibles.</p>
          </div>
        `;
        return;
      }
      
      let html = '<div class="tab-info-card"><h3>Canales de atención</h3><div class="canales-list">';
      
      canales.forEach((canal) => {
        if (typeof canal === 'string') {
          html += `
            <div class="canal-item">
              <div class="canal-nombre">${canal}</div>
            </div>
          `;
        } else {
          const nombre = canal.nombre || canal.tipo || 'Canal de atención';
          const contacto = canal.contacto || canal.valor || canal.link || '';
          
          html += `
            <div class="canal-item">
              <div class="canal-nombre">${nombre}</div>
              ${contacto ? `<div class="canal-contacto">${contacto}</div>` : ''}
            </div>
          `;
        }
      });
      
      html += '</div></div>';
      container.innerHTML = html;
    } else {
      let html = '<div class="edit-section"><h3>Canales de atención</h3>';
      
      canales.forEach((canal, index) => {
        const canalTexto = typeof canal === 'string' ? canal : (canal.nombre || '');
        html += `
          <div class="edit-canal-card">
            <div class="edit-card-header">
              <input 
                type="text" 
                class="edit-input" 
                value="${canalTexto}" 
                data-index="${index}"
                placeholder="Nombre del canal (ej: WhatsApp: +123456789)"
              />
              <button class="delete-btn" data-index="${index}" data-type="canales">🗑️</button>
            </div>
          </div>
        `;
      });
      
      html += `
        <button class="add-new-btn" data-type="canales">
          + Agregar canal de atención
        </button>
      `;
      
      html += '</div>';
      container.innerHTML = html;
    }
  };

// ========= RENDER NOTAS (TIMELINE) =========
const renderNotas = (company) => {
  const container = document.getElementById('notasContent');
  if (!container) return;
  
  const notas = Array.isArray(company.notas) ? company.notas : [];
  
  if (!isEditMode) {
    // MODO VISTA
    if (notas.length === 0) {
      container.innerHTML = `
        <div class="tab-info-card">
          <h3>Notas</h3>
          <p>No hay notas registradas para esta compañía.</p>
        </div>
      `;
      return;
    }
    
    const sortedNotas = [...notas].sort((a, b) => 
      new Date(b.fecha) - new Date(a.fecha)
    );
    
    let html = '<div class="notas-list">';
    sortedNotas.forEach((nota) => {
      const fechaObj = new Date(nota.fecha);
      const fechaFormateada = fechaObj.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      html += `
        <div class="nota-item">
          <div class="nota-header">
            <span class="nota-fecha">📌 ${fechaFormateada}</span>
          </div>
          <div class="nota-texto">${nota.texto}</div>
        </div>
      `;
    });
    html += '</div>';
    
    container.innerHTML = html;
    
  } else {
    // MODO EDICIÓN - USAR ÍNDICES ORIGINALES
    let html = '<div class="edit-section"><h3>Notas</h3>';
    
    // Crear array con índices originales para mapeo correcto
    const notasConIndice = notas.map((nota, originalIndex) => ({
      nota,
      originalIndex
    })).sort((a, b) => 
      new Date(b.nota.fecha) - new Date(a.nota.fecha)
    );
    
    notasConIndice.forEach(({ nota, originalIndex }) => {
      const fechaObj = new Date(nota.fecha);
      const fechaFormateada = fechaObj.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      html += `
        <div class="edit-nota-card">
          <div class="edit-card-header">
            <span class="nota-fecha-edit">📌 ${fechaFormateada}</span>
            <button class="delete-btn" data-index="${originalIndex}" data-type="nota">🗑️</button>
          </div>
          <textarea 
            class="edit-textarea edit-nota-textarea" 
            rows="4" 
            data-index="${originalIndex}"
          >${nota.texto}</textarea>
        </div>
      `;
    });
    
    html += `
      <div class="new-nota-card">
        <h4>➕ Nueva nota</h4>
        <textarea 
          id="newNotaTextarea"
          class="edit-textarea" 
          rows="5"
          placeholder="Escribe tu nueva nota aquí..."
        ></textarea>
        <button class="add-new-btn" data-type="nota">Agregar nota</button>
      </div>
    `;
    
    html += '</div>';
    container.innerHTML = html;
  }
};

  // ========= GUARDAR CAMBIOS POR TAB =========
  const saveCurrentTab = async () => {
    if (!currentCompany) return;

    const companyIndex = companies.findIndex(c => c.id === currentCompany.id);
    if (companyIndex === -1) return;

    try {
      switch(currentTab) {
        case 'credenciales':
          break;
          
        case 'deposito':
          const depositoContainer = document.getElementById('depositoContent');
          const metodosDeposito = [];
          depositoContainer.querySelectorAll('.edit-metodo-card').forEach((card) => {
            const metodo = card.querySelector('[data-field="metodo"]').value;
            const proveedor = card.querySelector('[data-field="proveedor"]').value;
            const montoMinimo = card.querySelector('[data-field="montoMinimo"]').value;
            const montoMaximo = card.querySelector('[data-field="montoMaximo"]').value;
            metodosDeposito.push({ metodo, proveedor, montoMinimo, montoMaximo });
          });
          currentCompany.metodosDeposito = metodosDeposito;
          await window.firebaseSet(
            window.firebaseRef(window.db, `companies/${currentCompany.id}/metodosDeposito`),
            metodosDeposito
          );
          break;
          
        case 'cashout':
          const cashoutContainer = document.getElementById('cashoutContent');
          const metodosCashout = [];
          cashoutContainer.querySelectorAll('.edit-metodo-card').forEach((card) => {
            const metodo = card.querySelector('[data-field="metodo"]').value;
            const proveedor = card.querySelector('[data-field="proveedor"]').value;
            const montoMinimo = card.querySelector('[data-field="montoMinimo"]').value;
            const montoMaximo = card.querySelector('[data-field="montoMaximo"]').value;
            metodosCashout.push({ metodo, proveedor, montoMinimo, montoMaximo });
          });
          currentCompany.metodosCashout = metodosCashout;
          await window.firebaseSet(
            window.firebaseRef(window.db, `companies/${currentCompany.id}/metodosCashout`),
            metodosCashout
          );
          break;
          
        case 'consideraciones':
          const consideracionesValue = document.getElementById('consideracionesTextarea').value;
          currentCompany.consideracionesCashout = consideracionesValue;
          await window.firebaseSet(
            window.firebaseRef(window.db, `companies/${currentCompany.id}/consideracionesCashout`),
            consideracionesValue
          );
          break;
          
        case 'promociones':
          const promocionesContainer = document.getElementById('promocionesContent');
          const promociones = [];
          promocionesContainer.querySelectorAll('.edit-metodo-card').forEach((card) => {
            const titulo = card.querySelector('[data-field="titulo"]').value;
            const descripcion = card.querySelector('[data-field="descripcion"]').value;
            promociones.push({ titulo, descripcion });
          });
          currentCompany.promociones = promociones;
          await window.firebaseSet(
            window.firebaseRef(window.db, `companies/${currentCompany.id}/promociones`),
            promociones
          );
          break;
          
        case 'terminos':
          const terminosValue = document.getElementById('terminosInput').value;
          currentCompany.terminosLink = terminosValue;
          await window.firebaseSet(
            window.firebaseRef(window.db, `companies/${currentCompany.id}/terminosLink`),
            terminosValue
          );
          break;
          
        case 'canales':
          const canalesContainer = document.getElementById('canalesContent');
          const canales = [];
          canalesContainer.querySelectorAll('.edit-canal-card input').forEach((input) => {
            if (input.value.trim()) canales.push(input.value.trim());
          });
          currentCompany.canales = canales;
          await window.firebaseSet(
            window.firebaseRef(window.db, `companies/${currentCompany.id}/canales`),
            canales
          );
          break;
          
        case 'notas':
          const notaTextareas = document.querySelectorAll('.edit-nota-textarea');
          notaTextareas.forEach(textarea => {
            const index = parseInt(textarea.dataset.index);
            if (currentCompany.notas[index]) {
              currentCompany.notas[index].texto = textarea.value.trim();
            }
          });
          
          await window.firebaseSet(
            window.firebaseRef(window.db, `companies/${currentCompany.id}/notas`),
            currentCompany.notas || []
          );
          break;
      }

      toast.textContent = '✅ Cambios guardados correctamente';
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
      
    } catch (error) {
      console.error('Error al guardar:', error);
      toast.textContent = '❌ Error al guardar cambios';
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
    }
  };

  // ========= EVENT DELEGATION PARA BOTONES DE EDICIÓN =========
  document.addEventListener('click', (e) => {
    // Agregar nuevo elemento
    const addBtn = e.target.closest('.add-new-btn');
    if (addBtn && isEditMode) {
      const type = addBtn.dataset.type;
      
      switch(type) {
        case 'deposito':
          if (!currentCompany.metodosDeposito) currentCompany.metodosDeposito = [];
          currentCompany.metodosDeposito.push({ metodo: '', proveedor: '', montoMinimo: '', montoMaximo: '' });
          renderDeposito(currentCompany);
          break;
        case 'cashout':
          if (!currentCompany.metodosCashout) currentCompany.metodosCashout = [];
          currentCompany.metodosCashout.push({ metodo: '', proveedor: '', montoMinimo: '', montoMaximo: '' });
          renderCashout(currentCompany);
          break;
        case 'promociones':
          if (!currentCompany.promociones) currentCompany.promociones = [];
          currentCompany.promociones.push({ titulo: '', descripcion: '' });
          renderPromociones(currentCompany);
          break;
        case 'canales':
          if (!currentCompany.canales) currentCompany.canales = [];
          currentCompany.canales.push('');
          renderCanales(currentCompany);
          break;
        case 'nota':
          const textarea = document.getElementById('newNotaTextarea');
          if (!textarea) return;
          
          const textoNota = textarea.value.trim();
          if (!textoNota) {
            toast.textContent = 'Escribe algo en la nota';
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 1500);
            return;
          }
          
          const nuevaNota = {
            texto: textoNota,
            fecha: new Date().toISOString()
          };
          
          if (!Array.isArray(currentCompany.notas)) {
            currentCompany.notas = [];
          }
          
          currentCompany.notas.push(nuevaNota);
          renderNotas(currentCompany);
          
          toast.textContent = '✅ Nota agregada (recuerda guardar)';
          toast.classList.add('show');
          setTimeout(() => toast.classList.remove('show'), 1500);
          break;
      }
    }
    
    // Eliminar elemento
    const deleteBtn = e.target.closest('.delete-btn');
    if (deleteBtn && isEditMode) {
      const type = deleteBtn.dataset.type;
      const index = parseInt(deleteBtn.dataset.index);
      
      if (!confirm('¿Eliminar este elemento?')) return;
      
      switch(type) {
        case 'deposito':
          currentCompany.metodosDeposito.splice(index, 1);
          renderDeposito(currentCompany);
          break;
        case 'cashout':
          currentCompany.metodosCashout.splice(index, 1);
          renderCashout(currentCompany);
          break;
        case 'promociones':
          currentCompany.promociones.splice(index, 1);
          renderPromociones(currentCompany);
          break;
        case 'canales':
          currentCompany.canales.splice(index, 1);
          renderCanales(currentCompany);
          break;
        case 'nota':
          if (Array.isArray(currentCompany.notas)) {
            currentCompany.notas.splice(index, 1);
            renderNotas(currentCompany);
            
            toast.textContent = '🗑️ Nota eliminada (recuerda guardar)';
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 1500);
          }
          break;
      }
    }
  });

  // ========= MARCAR INPUTS MODIFICADOS (CREDENCIALES) =========
  const attachEditInputsListeners = () => {
    if (!currentCompany || !isEditMode) return;

    const usernameInputs = gamesGrid.querySelectorAll('.edit-username-input');
    const linkInputs = gamesGrid.querySelectorAll('.edit-link-input');

    usernameInputs.forEach(input => {
      const companyId = input.getAttribute('data-company-id');
      const gameId = input.getAttribute('data-game-id');
      const company = companies.find(c => String(c.id) === String(companyId));
      if (!company) return;
      const game = company.games.find(g => String(g.id) === String(gameId));
      if (!game) return;

      const original = game.username ?? '';
      input.addEventListener('input', () => {
        const current = input.value.trim();
        if (current !== original) {
          input.classList.add('input-dirty');
        } else {
          input.classList.remove('input-dirty');
        }
      });
    });

    linkInputs.forEach(input => {
      const companyId = input.getAttribute('data-company-id');
      const gameId = input.getAttribute('data-game-id');
      const company = companies.find(c => String(c.id) === String(companyId));
      if (!company) return;
      const game = company.games.find(g => String(g.id) === String(gameId));
      if (!game) return;

      const original = game.link ?? '';
      input.addEventListener('input', () => {
        const current = input.value.trim();
        if (current !== original) {
          input.classList.add('input-dirty');
        } else {
          input.classList.remove('input-dirty');
        }
      });
    });
  };

  // ========= BÚSQUEDAS =========
  gameSearch.addEventListener('input', e => {
    if (!currentCompany) return;
    renderGames(currentCompany.games, e.target.value);
  });

const renderGlobalResults = term => {
  const t = term.toLowerCase();
  if (!t) {
    gamesGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📁</div>
        <p>Selecciona una compañía</p>
      </div>`;
    return;
  }

  const results = [];
  
  companies.forEach(company => {
    const isVisibleByFilter =
      localCompanyFilter.companyIds.length === 0 ||
      localCompanyFilter.companyIds.includes(company.id);
    if (!isVisibleByFilter) return;

    const matches = {
      credenciales: [],
      deposito: [],
      cashout: [],
      consideraciones: null,
      promociones: [],
      terminos: null,
      canales: [],
      notas: []
    };

    let hasMatches = false;

    // 1. BUSCAR EN CREDENCIALES (juegos)
    company.games.forEach(g => {
      if (
        g.name.toLowerCase().includes(t) ||
        g.username.toLowerCase().includes(t) ||
        g.link.toLowerCase().includes(t)
      ) {
        matches.credenciales.push(g);
        hasMatches = true;
      }
    });

    // 2. BUSCAR EN MÉTODOS DE DEPÓSITO
    if (Array.isArray(company.metodosDeposito)) {
      company.metodosDeposito.forEach(m => {
        const searchText = `${m.metodo || ''} ${m.proveedor || ''} ${m.montoMinimo || ''} ${m.montoMaximo || ''}`.toLowerCase();
        if (searchText.includes(t)) {
          matches.deposito.push(m);
          hasMatches = true;
        }
      });
    }

    // 3. BUSCAR EN MÉTODOS DE CASHOUT
    if (Array.isArray(company.metodosCashout)) {
      company.metodosCashout.forEach(m => {
        const searchText = `${m.metodo || ''} ${m.proveedor || ''} ${m.montoMinimo || ''} ${m.montoMaximo || ''}`.toLowerCase();
        if (searchText.includes(t)) {
          matches.cashout.push(m);
          hasMatches = true;
        }
      });
    }

    // 4. BUSCAR EN CONSIDERACIONES
    const consideraciones = company.consideracionesCashout || '';
    if (consideraciones.toLowerCase().includes(t)) {
      matches.consideraciones = consideraciones;
      hasMatches = true;
    }

    // 5. BUSCAR EN PROMOCIONES
    if (Array.isArray(company.promociones)) {
      company.promociones.forEach(p => {
        const searchText = `${p.titulo || ''} ${p.descripcion || ''}`.toLowerCase();
        if (searchText.includes(t)) {
          matches.promociones.push(p);
          hasMatches = true;
        }
      });
    }

    // 6. BUSCAR EN TÉRMINOS
    const terminos = company.terminosLink || company.terminosCondiciones || '';
    if (terminos.toLowerCase().includes(t)) {
      matches.terminos = terminos;
      hasMatches = true;
    }

    // 7. BUSCAR EN CANALES
    const canales = company.canales || company.canalesAtencion || [];
    canales.forEach(c => {
      const searchText = typeof c === 'string' ? c : `${c.nombre || ''} ${c.contacto || ''}`;
      if (searchText.toLowerCase().includes(t)) {
        matches.canales.push(c);
        hasMatches = true;
      }
    });

    // 8. BUSCAR EN NOTAS
    if (Array.isArray(company.notas)) {
      company.notas.forEach(n => {
        if (n.texto.toLowerCase().includes(t)) {
          matches.notas.push(n);
          hasMatches = true;
        }
      });
    }

    if (hasMatches) {
      results.push({ company, matches });
    }
  });

  if (!results.length) {
    gamesGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <p>No se encontraron resultados para "${term}"</p>
      </div>`;
    return;
  }

  gamesGrid.innerHTML = results.map(({ company, matches }) => {
    let html = `
      <div class="global-results">
        <h3>
          <div style="background:${company.color};width:4px;height:20px;display:inline-block;margin-right:8px;"></div>
          ${company.name}
        </h3>
    `;

    // CREDENCIALES
    if (matches.credenciales.length > 0) {
      html += `<div class="result-section"><h4>🎮 Credenciales (${matches.credenciales.length})</h4>`;
      matches.credenciales.forEach(g => {
        const disabledAttr = g.active ? '' : 'disabled';
        const disabledClass = g.active ? '' : 'disabled';
        html += `
          <div class="game-card ${g.active ? '' : 'inactive'}">
            <div class="game-header">
              <div class="game-name">${g.name}</div>
              <div class="game-status">
                <div class="status-toggle ${g.active ? 'active' : ''}"
                     data-company-id="${company.id}"
                     data-game-id="${g.id}"></div>
              </div>
            </div>
            <div class="game-details">
              <div class="detail-row">
                <span class="detail-label">Username:</span>
                <span class="detail-value">${g.username}</span>
                <button class="copy-btn ${disabledClass}" ${disabledAttr} data-copy="${g.username}">Copiar</button>
              </div>
              <div class="detail-row">
                <span class="detail-label">Link:</span>
                <span class="detail-value">${g.link}</span>
                <button class="link-btn ${disabledClass}" ${disabledAttr}
                        data-link="${g.link}" title="Abrir enlace">🔗</button>
              </div>
            </div>
            <div class="last-modified">Última mod: ${g.lastModified}</div>
          </div>
        `;
      });
      html += '</div>';
    }

    // DEPÓSITO
    if (matches.deposito.length > 0) {
      html += `<div class="result-section"><h4>💰 Métodos de depósito (${matches.deposito.length})</h4>`;
      matches.deposito.forEach(m => {
        html += `
          <div class="search-result-card">
            <div class="search-result-title">${m.metodo || m.metodoPago || 'Método de depósito'}</div>
            <div class="search-result-text">Proveedor: ${m.proveedor || 'N/A'}</div>
            <div class="search-result-text">Monto: ${m.montoMinimo || 'N/A'} - ${m.montoMaximo || 'N/A'}</div>
          </div>
        `;
      });
      html += '</div>';
    }

    // CASHOUT
    if (matches.cashout.length > 0) {
      html += `<div class="result-section"><h4>💸 Métodos de cashout (${matches.cashout.length})</h4>`;
      matches.cashout.forEach(m => {
        html += `
          <div class="search-result-card">
            <div class="search-result-title">${m.metodo || m.metodoPago || 'Método de cashout'}</div>
            <div class="search-result-text">Proveedor: ${m.proveedor || 'N/A'}</div>
            <div class="search-result-text">Monto: ${m.montoMinimo || 'N/A'} - ${m.montoMaximo || 'N/A'}</div>
          </div>
        `;
      });
      html += '</div>';
    }

    // CONSIDERACIONES
    if (matches.consideraciones) {
      html += `<div class="result-section"><h4>📋 Consideraciones para cashouts</h4>`;
      const preview = matches.consideraciones.substring(0, 200) + (matches.consideraciones.length > 200 ? '...' : '');
      html += `<div class="search-result-card"><div class="search-result-text">${preview}</div></div>`;
      html += '</div>';
    }

    // PROMOCIONES
    if (matches.promociones.length > 0) {
      html += `<div class="result-section"><h4>🎁 Promociones (${matches.promociones.length})</h4>`;
      matches.promociones.forEach(p => {
        html += `
          <div class="search-result-card">
            <div class="search-result-title">${p.titulo || 'Promoción'}</div>
            <div class="search-result-text">${p.descripcion || 'Sin descripción'}</div>
          </div>
        `;
      });
      html += '</div>';
    }

    // TÉRMINOS
    if (matches.terminos) {
      html += `<div class="result-section"><h4>📜 Términos y condiciones</h4>`;
      const preview = matches.terminos.substring(0, 150) + (matches.terminos.length > 150 ? '...' : '');
      html += `<div class="search-result-card"><div class="search-result-text">${preview}</div></div>`;
      html += '</div>';
    }

    // CANALES
    if (matches.canales.length > 0) {
      html += `<div class="result-section"><h4>📞 Canales de atención (${matches.canales.length})</h4>`;
      matches.canales.forEach(c => {
        const texto = typeof c === 'string' ? c : `${c.nombre || 'Canal'}: ${c.contacto || ''}`;
        html += `<div class="search-result-card"><div class="search-result-text">${texto}</div></div>`;
      });
      html += '</div>';
    }

    // NOTAS
    if (matches.notas.length > 0) {
      html += `<div class="result-section"><h4>📝 Notas (${matches.notas.length})</h4>`;
      matches.notas.forEach(n => {
        const fechaObj = new Date(n.fecha);
        const fechaFormateada = fechaObj.toLocaleDateString('es-PE', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
        const preview = n.texto.substring(0, 120) + (n.texto.length > 120 ? '...' : '');
        html += `
          <div class="search-result-card">
            <div class="search-result-date">📌 ${fechaFormateada}</div>
            <div class="search-result-text">${preview}</div>
          </div>
        `;
      });
      html += '</div>';
    }

    html += '</div>';
    return html;
  }).join('');
};

  globalSearch.addEventListener('input', e => {
    renderGlobalResults(e.target.value);
  });

  // ========= HELPERS CREAR / ELIMINAR (CREDENCIALES) =========
  const getNextGameId = company => {
    if (!company.games.length) return 1;
    const maxId = company.games.reduce(
      (max, g) => Math.max(max, Number(g.id)),
      0
    );
    return maxId + 1;
  };

  const deleteGameFromCompany = (companyId, gameId) => {
    const company = companies.find(c => String(c.id) === String(companyId));
    if (!company) return;

    company.games = company.games.filter(
      g => String(g.id) !== String(gameId)
    );

    if (window.db && window.firebaseRef && window.firebaseSet) {
      const nodeRef = window.firebaseRef(
        window.db,
        `companies/${companyId}/games/${gameId}`
      );
      window.firebaseSet(nodeRef, null);
    }

    saveState();
    renderCompanies();
    if (currentCompany && String(currentCompany.id) === String(companyId)) {
      renderGames(currentCompany.games, gameSearch.value);
    }
  };

  const addGameToCurrentCompany = () => {
    if (!currentCompany) return;

    const nameInput = gamesGrid.querySelector('.new-game-name-input');
    const userInput = gamesGrid.querySelector('.new-game-username-input');
    const linkInput = gamesGrid.querySelector('.new-game-link-input');

    if (!nameInput || !userInput || !linkInput) return;

    const name = nameInput.value.trim();
    const username = userInput.value.trim();
    const link = linkInput.value.trim();

    if (!name || !username || !link) {
      toast.textContent = 'Nombre, username y link son obligatorios';
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 1500);
      return;
    }

    const newId = getNextGameId(currentCompany);
    const today = new Date().toISOString().split('T')[0];

    const newGame = {
      id: newId,
      name,
      username,
      link,
      active: true,
      lastModified: today
    };

    const ok = confirm(
      `Estás a punto de crear el juego "${name}" en ${currentCompany.name}. ¿Quieres proceder?`
    );
    if (!ok) return;

    currentCompany.games.push(newGame);

    if (window.db && window.firebaseRef && window.firebaseSet) {
      const nodeRef = window.firebaseRef(
        window.db,
        `companies/${currentCompany.id}/games/${newId}`
      );
      window.firebaseSet(nodeRef, newGame);
    }

    saveState();
    renderCompanies();
    renderGames(currentCompany.games, gameSearch.value);

    nameInput.value = '';
    userInput.value = '';
    linkInput.value = '';

    toast.textContent = 'Juego agregado';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1200);
  };

  // ========= EVENTOS GRID (CREDENCIALES) =========
  gamesGrid.addEventListener('click', e => {
    if (!companies || !companies.length) return;

    const copyBtn = e.target.closest('.copy-btn');
    if (copyBtn && !isEditMode) {
      if (
        copyBtn.classList.contains('disabled') ||
        copyBtn.hasAttribute('disabled')
      ) {
        return;
      }
      const text = copyBtn.getAttribute('data-copy') || '';
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        toast.textContent =
          'Copiado: ' +
          (text.length > 20 ? text.slice(0, 20) + '…' : text);
        toast.classList.add('show');
        copyBtn.textContent = '✓';
        copyBtn.classList.add('copied');
        setTimeout(() => {
          toast.classList.remove('show');
          copyBtn.textContent = 'Copiar';
          copyBtn.classList.remove('copied');
        }, 1500);
      });
      return;
    }

    const linkBtn = e.target.closest('.link-btn');
    if (linkBtn && !isEditMode) {
      if (
        linkBtn.classList.contains('disabled') ||
        linkBtn.hasAttribute('disabled')
      ) {
        return;
      }
      const url = linkBtn.getAttribute('data-link');
      if (url) {
        window.open(url, '_blank', 'noopener');
      }
      return;
    }

    const saveBtn = e.target.closest('.save-edit-btn');
    if (saveBtn && isEditMode) {
      const companyId = saveBtn.getAttribute('data-company-id');
      const gameId = saveBtn.getAttribute('data-game-id');

      const company = companies.find(c => String(c.id) === String(companyId));
      if (!company) return;
      const game = company.games.find(g => String(g.id) === String(gameId));
      if (!game) return;

      const usernameInput = gamesGrid.querySelector(
        `.edit-username-input[data-company-id="${companyId}"][data-game-id="${gameId}"]`
      );
      const linkInput = gamesGrid.querySelector(
        `.edit-link-input[data-company-id="${companyId}"][data-game-id="${gameId}"]`
      );

      const newUsername = usernameInput ? usernameInput.value.trim() : game.username;
      const newLink = linkInput ? linkInput.value.trim() : game.link;

      if (newUsername === game.username && newLink === game.link) {
        return;
      }

      const okEdit = confirm(
        `¿Estás seguro que quieres editar los datos del juego "${game.name}"?`
      );
      if (!okEdit) return;

      game.username = newUsername;
      game.link = newLink;
      game.lastModified = new Date().toISOString().split('T')[0];

      if (window.db && window.firebaseRef && window.firebaseSet) {
        const nodeRef = window.firebaseRef(
          window.db,
          `companies/${companyId}/games/${gameId}`
        );
        window.firebaseSet(nodeRef, {
          ...game
        });
      }

      saveState();
      renderGames(currentCompany.games, gameSearch.value);

      toast.textContent = 'Cambios guardados';
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 1200);

      return;
    }

    const deleteBtn = e.target.closest('.delete-game-btn');
    if (deleteBtn && isEditMode) {
      const companyId = deleteBtn.getAttribute('data-company-id');
      const gameId = deleteBtn.getAttribute('data-game-id');

      const company = companies.find(c => String(c.id) === String(companyId));
      if (!company) return;
      const game = company.games.find(g => String(g.id) === String(gameId));
      if (!game) return;

      const okDel = confirm(
        `¿Seguro que quieres eliminar el juego "${game.name}"?`
      );
      if (okDel) {
        deleteGameFromCompany(companyId, gameId);
      }
      return;
    }

    const addBtn = e.target.closest('.add-game-btn');
    if (addBtn && isEditMode) {
      addGameToCurrentCompany();
      return;
    }

    const toggle = e.target.closest('.status-toggle');
    if (toggle) {
      const companyIdAttr = toggle.getAttribute('data-company-id');
      const gameIdAttr = toggle.getAttribute('data-game-id');

      const companyId = companyIdAttr;
      const gameId = gameIdAttr;

      const company = companies.find(c => String(c.id) === String(companyId));
      if (!company) {
        console.warn('No se encontró company para toggle', { companyId, companies });
        return;
      }

      const game = company.games.find(g => String(g.id) === String(gameId));
      if (!game) {
        console.warn('No se encontró game para toggle', { companyId, gameId, company });
        return;
      }

      game.active = !game.active;
      game.lastModified = new Date().toISOString().split('T')[0];

      saveState();
      updateRemoteToggle(company, game);

      renderCompanies();
      if (globalSearch.value) {
        renderGlobalResults(globalSearch.value);
      } else if (currentCompany && String(currentCompany.id) === String(company.id)) {
        renderGames(currentCompany.games, gameSearch.value);
      }
    }
  });

  // ========= BOTÓN EDITAR =========
  if (editModeBtn) {
    editModeBtn.addEventListener('click', async () => {
      if (!currentCompany) return;

      if (!isEditMode) {
        // ENTRAR EN MODO EDICIÓN
        if (!adminLoggedIn) {
          const storedAdmin = localStorage.getItem('credentialsAdminLoggedIn');
          adminLoggedIn = storedAdmin === 'true';

          if (!adminLoggedIn) {
            const pwd = prompt('Introduce la contraseña de administrador para editar:');
            if (!pwd) return;
            if (pwd !== ADMIN_PASSWORD) {
              alert('Contraseña incorrecta.');
              return;
            }
            adminLoggedIn = true;
            localStorage.setItem('credentialsAdminLoggedIn', 'true');
            alert('Acceso concedido. Ahora puedes editar.');
            updateAddCompanyBtnVisibility();
          }
        }

        isEditMode = true;
        editModeBtn.textContent = 'Guardar';
        updateAddCompanyBtnVisibility();
        
        switchTab(currentTab);
        
      } else {
        // GUARDAR Y SALIR DE MODO EDICIÓN
        const confirmSave = confirm('¿Guardar los cambios?');
        if (!confirmSave) return;
        
        await saveCurrentTab();
        
        isEditMode = false;
        editModeBtn.textContent = 'Editar';
        updateAddCompanyBtnVisibility();
        
        switchTab(currentTab);
      }
    });
  }

  // ========= INICIALIZACIÓN =========
  const initApp = () => {
    const storedAdmin = localStorage.getItem('credentialsAdminLoggedIn');
    adminLoggedIn = storedAdmin === 'true';
    
    updateAddCompanyBtnVisibility();

    loadLocalFilter();
    loadState();
    applyRemoteSettings();
    renderLocalFilterList();
    renderCompanies();

    if (!companies.length) return;

    let target = null;

    if (selectedCompanyId != null) {
      target = companies.find(
        c =>
          String(c.id) === String(selectedCompanyId) &&
          (localCompanyFilter.companyIds.length === 0 ||
           localCompanyFilter.companyIds.includes(c.id))
      );
    }

    if (!target) {
      target = companies.find(c => {
        return (
          localCompanyFilter.companyIds.length === 0 ||
          localCompanyFilter.companyIds.includes(c.id)
        );
      });
    }

    if (target) {
      const items = companiesList.querySelectorAll('.company-item');
      items.forEach(el => el.classList.remove('active'));

      const targetItem = Array.from(companiesList.querySelectorAll('.company-item'))
        .find(el => {
          const nameEl = el.querySelector('.company-name');
          return nameEl && nameEl.textContent.trim() === String(target.name);
        });

      if (targetItem) {
        targetItem.classList.add('active');
      }

      selectCompany(target);
    }
  };

  // ==================== AGREGAR COMPAÑÍA ==================== 
const addCompanyBtn = document.getElementById('addCompanyBtn');

// Crear modal HTML
const createCompanyModal = () => {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'addCompanyModal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title">➕ Nueva compañía</h2>
        <button class="modal-close" id="closeModalBtn">✕</button>
      </div>
      <div class="modal-body">
        <div class="modal-field">
          <label for="companyName">Nombre de la compañía *</label>
          <input type="text" id="companyName" placeholder="Ej: Betsson, Inkabet, etc." />
        </div>
        
        <div class="modal-field">
          <label for="companyColor">Color identificador *</label>
          <div class="color-picker-container">
            <div class="color-preview" id="colorPreview" style="background: #3b82f6;"></div>
            <input type="text" id="companyColor" value="#3b82f6" placeholder="#3b82f6" />
          </div>
          <div class="color-suggestions" id="colorSuggestions"></div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-secondary" id="cancelModalBtn">Cancelar</button>
        <button class="modal-btn modal-btn-primary" id="createCompanyBtn">Crear compañía</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
};

// Paleta de colores sugeridos
const coloresSugeridos = [
  '#3b82f6', // Azul
  '#ef4444', // Rojo
  '#10b981', // Verde
  '#f59e0b', // Naranja
  '#8b5cf6', // Morado
  '#ec4899', // Rosa
  '#06b6d4', // Cyan
  '#84cc16', // Lima
  '#f97316', // Naranja oscuro
  '#6366f1', // Índigo
  '#14b8a6', // Teal
  '#f43f5e', // Rosa rojo
];

// Renderizar sugerencias de color
const renderColorSuggestions = (container, inputElement, previewElement) => {
  container.innerHTML = '';
  coloresSugeridos.forEach(color => {
    const suggestion = document.createElement('div');
    suggestion.className = 'color-suggestion';
    suggestion.style.background = color;
    suggestion.title = color;
    suggestion.addEventListener('click', () => {
      inputElement.value = color;
      previewElement.style.background = color;
    });
    container.appendChild(suggestion);
  });
};

// Abrir modal
const openAddCompanyModal = () => {
  let modal = document.getElementById('addCompanyModal');
  if (!modal) {
    modal = createCompanyModal();
  }
  
  const nameInput = document.getElementById('companyName');
  const colorInput = document.getElementById('companyColor');
  const colorPreview = document.getElementById('colorPreview');
  const colorSuggestions = document.getElementById('colorSuggestions');
  const closeBtn = document.getElementById('closeModalBtn');
  const cancelBtn = document.getElementById('cancelModalBtn');
  const createBtn = document.getElementById('createCompanyBtn');
  
  // Reset inputs
  nameInput.value = '';
  colorInput.value = '#3b82f6';
  colorPreview.style.background = '#3b82f6';
  
  // Renderizar sugerencias
  renderColorSuggestions(colorSuggestions, colorInput, colorPreview);
  
  // Actualizar preview en tiempo real
  colorInput.addEventListener('input', () => {
    const color = colorInput.value.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
      colorPreview.style.background = color;
    }
  });
  
  // Cerrar modal
  const closeModal = () => {
    modal.classList.remove('show');
  };
  
  closeBtn.onclick = closeModal;
  cancelBtn.onclick = closeModal;
  
  // Click fuera del modal
  modal.onclick = (e) => {
    if (e.target === modal) closeModal();
  };
  
  // Crear compañía
  createBtn.onclick = async () => {
    const name = nameInput.value.trim();
    const color = colorInput.value.trim();
    
    // Validaciones
    if (!name) {
      toast.textContent = '⚠️ El nombre es obligatorio';
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
      return;
    }
    
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
      toast.textContent = '⚠️ Color inválido. Usa formato #RRGGBB';
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
      return;
    }
    
    // Verificar nombre duplicado
    if (companies.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      toast.textContent = '⚠️ Ya existe una compañía con ese nombre';
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
      return;
    }
    
    // Obtener el próximo ID disponible
    const maxId = companies.length > 0 
      ? Math.max(...companies.map(c => Number(c.id) || 0)) 
      : 0;
    const newId = maxId + 1;
    
    // Crear estructura completa
    const newCompany = {
      id: newId,
      name: name,
      color: color,
      games: {},
      metodosDeposito: [],
      metodosCashout: [],
      consideracionesCashout: '',
      promociones: [],
      terminosLink: '',
      canales: [],
      notas: [
        {
          texto: `Compañía "${name}" creada en el sistema`,
          fecha: new Date().toISOString()
        }
      ]
    };
    
    try {
      // Deshabilitar botón mientras se crea
      createBtn.disabled = true;
      createBtn.textContent = 'Creando...';
      
      // Guardar en Firebase
      await window.firebaseSet(
        window.firebaseRef(window.db, `companies/${newId}`),
        newCompany
      );
      
      updateAddCompanyBtnVisibility();

      toast.textContent = `✅ Compañía "${name}" creada correctamente`;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
      
      closeModal();
      
    } catch (error) {
      console.error('Error al crear compañía:', error);
      toast.textContent = '❌ Error al crear compañía';
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
      
      createBtn.disabled = false;
      createBtn.textContent = 'Crear compañía';
    }
  };
  
  modal.classList.add('show');
  nameInput.focus();
};

// Event listener del botón
if (addCompanyBtn) {
  addCompanyBtn.addEventListener('click', openAddCompanyModal);
}

// Mostrar botón solo si está logueado como admin
const updateAddCompanyBtnVisibility = () => {
  if (addCompanyBtn) {
    const shouldShow = adminLoggedIn && isEditMode;
    addCompanyBtn.style.display = shouldShow ? 'block' : 'none';
  }
};

// Llamar después de login admin
updateAddCompanyBtnVisibility();


  // Cargar companies desde Firebase y arrancar
  if (window.companiesRef && window.firebaseOnValue) {
    window.firebaseOnValue(window.companiesRef, snapshot => {

      const storedAdmin = localStorage.getItem('credentialsAdminLoggedIn');
      adminLoggedIn = storedAdmin === 'true';

      const data = snapshot.val() || {};

      companies = Object.entries(data).map(([companyKey, companyValue]) => {
        const gamesObj = companyValue.games || {};
        const gamesArray = Object.entries(gamesObj).map(([gameKey, gameValue]) => ({
          id: gameValue.id ?? gameKey,
          ...gameValue
        }));

        return {
          id: companyValue.id ?? companyKey,
          ...companyValue,
          games: gamesArray
        };
      });

      initApp();
    });
  } else {
    console.error('Firebase no está inicializado o companiesRef no existe.');
  }
});
