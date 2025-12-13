document.addEventListener('DOMContentLoaded', () => {
  const { companies } = credentialsData;
  let currentCompany = null;

  const companiesList = document.getElementById('companiesList');
  const gamesGrid = document.getElementById('gamesGrid');
  const companyTitle = document.getElementById('companyTitle');
  const gameSearch = document.getElementById('gameSearch');
  const globalSearch = document.getElementById('globalSearch');
  const toast = document.getElementById('toast');
  const localFilterList = document.getElementById('localFilterList');

  // ========= FILTRO LOCAL DE COMPAÑÍAS (SOLO ESTA PC) =========
  // companyIds = []  => ver TODAS (checkboxes visualmente vacíos)
  // companyIds = [1,3] => ver solo esas
  let localCompanyFilter = {
    companyIds: []
  };

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

      // solo marcar visualmente si está en el array
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
      const id = Number(input.getAttribute('data-company-id'));

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

  // ========= FIREBASE =========
  const applyRemoteSettings = () => {
    if (!window.gamesRef || !window.firebaseOnValue) return;

    window.firebaseOnValue(window.gamesRef, snapshot => {
      const data = snapshot.val();
      if (!data) return;

      Object.values(data).forEach(s => {
        const company = companies.find(c => c.id === s.companyId);
        if (!company) return;
        const game = company.games.find(g => g.id === s.gameId);
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
          g => g.companyId === company.id && g.id === game.id
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

  loadLocalFilter();
  loadState();
  applyRemoteSettings();

  // ========= RENDER COMPAÑÍAS (usa filtro) =========
  const renderCompanies = () => {
    companiesList.innerHTML = '';

    const visibleCompanies = companies.filter(c => {
      if (localCompanyFilter.companyIds.length === 0) return true;      // sin selección -> todas
      return localCompanyFilter.companyIds.includes(c.id);              // selección -> solo marcadas
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

    // Si la compañía seleccionada fue filtrada, limpiamos selección
    if (
      currentCompany &&
      !visibleCompanies.find(c => c.id === currentCompany.id)
    ) {
      currentCompany = null;
      companyTitle.textContent = 'Selecciona una compañía';
      gamesGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📁</div>
          <p>Selecciona una compañía para ver sus credenciales</p>
        </div>`;
    }
  };

  // ========= RENDER JUEGOS =========
  const selectCompany = company => {
    currentCompany = company;
    companyTitle.innerHTML = `
      <div class="company-title-bar" style="background:${company.color}"></div>
      ${company.name}
    `;
    gameSearch.value = '';
    renderGames(company.games, '');
  };

  const renderGames = (games, term) => {
    const t = term.toLowerCase();
    const filtered = games.filter(
      g =>
        g.name.toLowerCase().includes(t) ||
        g.username.toLowerCase().includes(t)
    );

    if (!filtered.length) {
      gamesGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <p>No se encontraron juegos</p>
        </div>`;
      return;
    }

    gamesGrid.innerHTML = filtered
      .map(g => {
        const disabledAttr = g.active ? '' : 'disabled';
        const disabledClass = g.active ? '' : 'disabled';
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
      })
      .join('');
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

  // ========= EVENTOS DE COPIAR / LINK / TOGGLE =========
  gamesGrid.addEventListener('click', e => {
    // copiar username
    const copyBtn = e.target.closest('.copy-btn');
    if (copyBtn) {
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

    // abrir link
    const linkBtn = e.target.closest('.link-btn');
    if (linkBtn) {
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

    // toggle activo/inactivo
    const toggle = e.target.closest('.status-toggle');
    if (toggle) {
      const companyId = Number(toggle.getAttribute('data-company-id'));
      const gameId = Number(toggle.getAttribute('data-game-id'));
      const company = companies.find(c => c.id === companyId);
      const game = company.games.find(g => g.id === gameId);

      game.active = !game.active;
      game.lastModified = new Date().toISOString().split('T')[0];

      saveState();
      updateRemoteToggle(company, game);

      renderCompanies();
      if (globalSearch.value) {
        renderGlobalResults(globalSearch.value);
      } else if (currentCompany && currentCompany.id === companyId) {
        renderGames(currentCompany.games, gameSearch.value);
      }
    }
  });

  // ========= INICIALIZACIÓN =========
  renderLocalFilterList();
  renderCompanies();

  if (companies.length) {
    const firstVisible = companies.find(c => {
      return (
        localCompanyFilter.companyIds.length === 0 ||
        localCompanyFilter.companyIds.includes(c.id)
      );
    });
    if (firstVisible) {
      const firstItem = companiesList.querySelector('.company-item');
      if (firstItem) firstItem.classList.add('active');
      selectCompany(firstVisible);
    }
  }
});