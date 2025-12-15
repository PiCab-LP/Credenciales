document.addEventListener('DOMContentLoaded', () => {
  let companies = [];
  let currentCompany = null;
  let isEditMode = false;
  let selectedCompanyId = null; // recordar selección actual
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
      if (currentCompany) {
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
      gamesGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📁</div>
          <p>Selecciona una compañía para ver sus credenciales</p>
        </div>`;
    }
  };

  // ========= RENDER JUEGOS (incluye modo edición) =========
  const selectCompany = company => {
    currentCompany = company;
    selectedCompanyId = company.id;
    companyTitle.innerHTML = `
      <div class="company-title-bar" style="background:${company.color}"></div>
      ${company.name}
    `;
    gameSearch.value = '';
    if (editModeBtn) {
      editModeBtn.disabled = false;
    }
    renderGames(company.games, '');
  };

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

  // ========= MARCAR INPUTS MODIFICADOS =========
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

      const matches = company.games.filter(
        g =>
          g.name.toLowerCase().includes(t) ||
          g.username.toLowerCase().includes(t)
      );
      if (matches.length) results.push({ company, games: matches });
    });

    if (!results.length) {
      gamesGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <p>No se encontraron resultados</p>
        </div>`;
      return;
    }

    gamesGrid.innerHTML = results
      .map(({ company, games }) => {
        return `
      <div class="global-results">
        <h3>
          <div style="background:${company.color};width:4px;height:20px;display:inline-block;margin-right:8px;"></div>
          ${company.name} (${games.length})
        </h3>
        ${games
          .map(g => {
            const disabledAttr = g.active ? '' : 'disabled';
            const disabledClass = g.active ? '' : 'disabled';
            return `
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
          })
          .join('')}
      </div>
    `;
      })
      .join('');
  };

  globalSearch.addEventListener('input', e => {
    renderGlobalResults(e.target.value);
  });

  // ========= HELPERS CREAR / ELIMINAR =========
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

  // ========= EVENTOS GRID =========
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
        return; // sin cambios reales
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

  // ========= BOTÓN EDITAR + LOGIN BÁSICO =========
  if (editModeBtn) {
    editModeBtn.addEventListener('click', () => {
      if (!currentCompany) return;

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
        }
      }

      isEditMode = !isEditMode;
      editModeBtn.textContent = isEditMode ? 'Salir de edición' : 'Editar';
      renderGames(currentCompany.games, gameSearch.value);
      if (isEditMode && currentCompany) {
        attachEditInputsListeners();
      }
    });
  }

  // ========= INICIALIZACIÓN =========
  const initApp = () => {
    const storedAdmin = localStorage.getItem('credentialsAdminLoggedIn');
    adminLoggedIn = storedAdmin === 'true';

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

  // Cargar companies desde Firebase y arrancar
  if (window.companiesRef && window.firebaseOnValue) {
    window.firebaseOnValue(window.companiesRef, snapshot => {
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