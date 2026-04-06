/**
 * app.js — Gnoke Logbook
 * Bootstrap. Page routing, event wiring.
 * All data: db.js | All export: export.js
 */

document.addEventListener('DOMContentLoaded', () => {

  Theme.init();

  /* ── State ── */
  let activeProject = null;
  let activeWeekStr = DB.currentWeekStr();
  let activeWeek    = null;
  let checklistState = {};  // rowId → { checkId: bool }

  /* ══════════════════════════════════════════════
     PAGE ROUTING
  ══════════════════════════════════════════════ */
  function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');
  }
  window.showPage = showPage;

  /* ══════════════════════════════════════════════
     DRAWER
  ══════════════════════════════════════════════ */
  const Drawer = (() => {
    const panel   = () => document.getElementById('drawer');
    const overlay = () => document.getElementById('drawer-overlay');
    function open()  { panel()?.classList.add('open'); overlay()?.classList.add('open'); }
    function close() { panel()?.classList.remove('open'); overlay()?.classList.remove('open'); }
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    document.getElementById('hamburger')?.addEventListener('click', open);
    document.getElementById('drawer-close')?.addEventListener('click', close);
    document.getElementById('drawer-overlay')?.addEventListener('click', close);
    return { open, close };
  })();
  window.Drawer = Drawer;

  /* ══════════════════════════════════════════════
     PROJECTS LIST PAGE
  ══════════════════════════════════════════════ */
  function renderProjects() {
    showPage('projects-page');
    const list = document.getElementById('project-list');
    const projects = DB.getProjects();

    if (!projects.length) {
      list.innerHTML = `<div class="empty-state">No projects yet. Create one to get started.</div>`;
      return;
    }

    list.innerHTML = projects.map(p => {
      const weeks = DB.getWeeksForProject(p.id);
      return `
        <div class="project-card" onclick="openProject('${p.id}')">
          <div class="project-card-main">
            <div class="project-name">${p.name}</div>
            <div class="project-meta">${weeks.length} week${weeks.length !== 1 ? 's' : ''} logged${p.submittedTo ? ' · ' + p.submittedTo : ''}</div>
          </div>
          <span class="chevron">›</span>
        </div>`;
    }).join('');
  }

  /* ══════════════════════════════════════════════
     NEW / EDIT PROJECT MODAL
  ══════════════════════════════════════════════ */
  document.getElementById('btn-new-project')?.addEventListener('click', () => {
    document.getElementById('modal-project-title').textContent = 'New project';
    document.getElementById('inp-project-name').value = '';
    document.getElementById('inp-submitted-to').value = '';
    document.getElementById('inp-project-id').value   = '';
    UI.openModal('project-modal');
  });

  document.getElementById('btn-save-project')?.addEventListener('click', () => {
    const name = document.getElementById('inp-project-name').value.trim();
    if (!name) { UI.toast('Project name is required', 'err'); return; }
    const id   = document.getElementById('inp-project-id').value || undefined;
    DB.saveProject({
      id,
      name,
      submittedTo: document.getElementById('inp-submitted-to').value.trim(),
    });
    UI.closeModal('project-modal');
    renderProjects();
    UI.toast('Project saved', 'ok');
  });

  document.getElementById('btn-cancel-project')?.addEventListener('click', () => UI.closeModal('project-modal'));

  /* ══════════════════════════════════════════════
     OPEN PROJECT → WEEK VIEW
  ══════════════════════════════════════════════ */
  window.openProject = function(projectId) {
    activeProject = DB.getProjects().find(p => p.id === projectId);
    if (!activeProject) return;
    activeWeekStr = DB.currentWeekStr();
    openWeek();
  };

  function openWeek() {
    activeWeek = DB.getWeek(activeProject.id, activeWeekStr);
    renderWeekPage();
    showPage('week-page');
  }

  /* ══════════════════════════════════════════════
     WEEK PAGE
  ══════════════════════════════════════════════ */
  function renderWeekPage() {
    // Header
    document.getElementById('week-project-name').textContent = activeProject.name;
    document.getElementById('week-label').textContent = DB.weekLabel(activeWeekStr);
    document.getElementById('inp-prepared-by').value   = activeWeek.preparedBy || '';
    document.getElementById('inp-submitted-to-w').value = activeWeek.submittedTo || activeProject.submittedTo || '';

    // Week nav
    renderWeekNav();

    // Rows
    renderRows();

    // Checklist
    renderChecklist();
  }

  function renderWeekNav() {
    const weeks  = DB.getWeeksForProject(activeProject.id);
    const wkeys  = weeks.map(w => w.weekStr);
    if (!wkeys.includes(activeWeekStr)) wkeys.unshift(activeWeekStr);
    wkeys.sort((a, b) => b.localeCompare(a));

    const sel = document.getElementById('week-select');
    sel.innerHTML = wkeys.map(wk =>
      `<option value="${wk}" ${wk === activeWeekStr ? 'selected' : ''}>${DB.weekLabel(wk)}</option>`
    ).join('');
  }

  /* ── ROWS ── */
  function renderRows() {
    const tbody = document.getElementById('log-tbody');
    tbody.innerHTML = activeWeek.rows.map(r => `
      <tr data-row="${r.id}">
        <td class="td-sn">${r.sn}</td>
        <td class="td-day" style="font-size:0.78rem;font-family:var(--font-mono);color:var(--muted);padding-top:10px;white-space:nowrap;">${r.day}</td>
        <td class="td-task">
          <textarea class="cell-input cell-ta" data-field="task" placeholder="Describe the task or activity…" rows="2">${r.task}</textarea>
        </td>
        <td class="td-partners">
          <input class="cell-input" data-field="partners" value="${r.partners}" placeholder="Names…" />
        </td>
        <td class="td-done">
          <input type="checkbox" class="done-check" ${r.done ? 'checked' : ''} />
        </td>
        <td class="td-remarks">
          <textarea class="cell-input cell-ta" data-field="remarks" placeholder="Remarks / continuity notes…" rows="2">${r.remarks}</textarea>
        </td>
        <td class="td-del">
          <button class="del-row-btn" title="Remove row">×</button>
        </td>
      </tr>`).join('');

    // Wire events
    tbody.querySelectorAll('.cell-input').forEach(el => {
      el.addEventListener('input', e => {
        const tr    = e.target.closest('tr');
        const rowId = tr.dataset.row;
        const field = e.target.dataset.field;
        const row   = activeWeek.rows.find(r => r.id === rowId);
        if (row) { row[field] = e.target.value; autoSave(); }
      });
    });

    tbody.querySelectorAll('.done-check').forEach(el => {
      el.addEventListener('change', e => {
        const rowId = e.target.closest('tr').dataset.row;
        const row   = activeWeek.rows.find(r => r.id === rowId);
        if (row) { row.done = e.target.checked; autoSave(); }
      });
    });

    tbody.querySelectorAll('.del-row-btn').forEach(el => {
      el.addEventListener('click', e => {
        const rowId = e.target.closest('tr').dataset.row;
        DB.removeRow(activeWeek, rowId);
        renderRows();
        autoSave();
      });
    });
  }

  /* ── CHECKLIST ── */
  function renderChecklist() {
    const wrap = document.getElementById('checklist-wrap');
    const items = DB.getChecklist();
    wrap.innerHTML = items.map(item => `
      <label class="check-item">
        <input type="checkbox" class="checklist-box" data-id="${item.id}" ${item.on ? 'checked' : ''} />
        <span>${item.label}</span>
      </label>`).join('');

    wrap.querySelectorAll('.checklist-box').forEach(el => {
      el.addEventListener('change', e => {
        const items = DB.getChecklist();
        const item  = items.find(i => i.id === e.target.dataset.id);
        if (item) { item.on = e.target.checked; DB.saveChecklist(items); }
      });
    });
  }

  /* ── AUTOSAVE ── */
  let _saveTimer = null;
  function autoSave() {
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => {
      activeWeek.preparedBy  = document.getElementById('inp-prepared-by')?.value || '';
      activeWeek.submittedTo = document.getElementById('inp-submitted-to-w')?.value || '';
      DB.saveWeek(activeProject.id, activeWeekStr, activeWeek);
      UI.status('saved');
    }, 600);
  }

  // Header field changes also trigger save
  ['inp-prepared-by','inp-submitted-to-w'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', autoSave);
  });

  /* ── WEEK NAVIGATION ── */
  document.getElementById('week-select')?.addEventListener('change', e => {
    activeWeekStr = e.target.value;
    activeWeek    = DB.getWeek(activeProject.id, activeWeekStr);
    renderRows();
    document.getElementById('week-label').textContent = DB.weekLabel(activeWeekStr);
  });

  document.getElementById('btn-prev-week')?.addEventListener('click', () => {
    const d = new Date(activeWeekStr + 'T00:00:00');
    d.setDate(d.getDate() - 7);
    activeWeekStr = DB.dateStr(d);
    activeWeek    = DB.getWeek(activeProject.id, activeWeekStr);
    renderWeekPage();
  });

  document.getElementById('btn-next-week')?.addEventListener('click', () => {
    const d = new Date(activeWeekStr + 'T00:00:00');
    d.setDate(d.getDate() + 7);
    activeWeekStr = DB.dateStr(d);
    activeWeek    = DB.getWeek(activeProject.id, activeWeekStr);
    renderWeekPage();
  });

  /* ── ADD ROW ── */
  document.getElementById('btn-add-row')?.addEventListener('click', () => {
    DB.addRow(activeWeek);
    renderRows();
    autoSave();
  });

  /* ── EXPORT ── */
  document.getElementById('btn-print')?.addEventListener('click', () => {
    // save current header before printing
    activeWeek.preparedBy  = document.getElementById('inp-prepared-by')?.value || '';
    activeWeek.submittedTo = document.getElementById('inp-submitted-to-w')?.value || '';
    Exporter.printWeek(activeProject, activeWeek);
  });

  document.getElementById('btn-copy')?.addEventListener('click', () => {
    activeWeek.preparedBy  = document.getElementById('inp-prepared-by')?.value || '';
    activeWeek.submittedTo = document.getElementById('inp-submitted-to-w')?.value || '';
    Exporter.copyWeekText(activeProject, activeWeek);
  });

  /* ── BACK TO PROJECTS ── */
  document.getElementById('btn-back')?.addEventListener('click', renderProjects);

  /* ══════════════════════════════════════════════
     SETTINGS PAGE — checklist management
  ══════════════════════════════════════════════ */
  function renderSettings() {
    showPage('settings-page');
    renderSettingsChecklist();
  }

  function renderSettingsChecklist() {
    const list  = document.getElementById('settings-checklist');
    const items = DB.getChecklist();
    list.innerHTML = items.map(item => `
      <div class="settings-check-row" data-id="${item.id}">
        <span class="settings-check-label">${item.label}</span>
        <button class="settings-del-btn" data-id="${item.id}">Remove</button>
      </div>`).join('');

    list.querySelectorAll('.settings-del-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        DB.removeChecklistItem(e.target.dataset.id);
        renderSettingsChecklist();
        UI.toast('Removed', 'ok');
      });
    });
  }

  document.getElementById('btn-add-check')?.addEventListener('click', () => {
    const inp = document.getElementById('inp-new-check');
    const label = inp?.value.trim();
    if (!label) { UI.toast('Enter a checklist item', 'err'); return; }
    DB.addChecklistItem(label);
    inp.value = '';
    renderSettingsChecklist();
    UI.toast('Added', 'ok');
  });

  document.getElementById('btn-settings')?.addEventListener('click', () => { renderSettings(); Drawer.close(); });
  document.getElementById('btn-settings-back')?.addEventListener('click', renderProjects);
  document.getElementById('drawer-settings')?.addEventListener('click', () => { renderSettings(); Drawer.close(); });
  document.getElementById('drawer-projects')?.addEventListener('click', () => { renderProjects(); Drawer.close(); });

  /* ── About ── */
  function showAbout() { showPage('about-page'); }
  document.getElementById('btn-about-back')?.addEventListener('click', renderProjects);
  document.getElementById('drawer-about')?.addEventListener('click', () => { showAbout(); Drawer.close(); });

  /* ── Backup ── */
  document.getElementById('btn-backup')?.addEventListener('click', () => {
    DB.backup();
    UI.toast('Backup downloaded', 'ok');
  });

  /* ── Restore ── */
  document.getElementById('inp-restore')?.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await DB.restore(file);
      UI.toast('Restore successful', 'ok');
      renderProjects();
    } catch (err) {
      UI.toast('Restore failed — invalid file', 'err');
    }
    e.target.value = '';
  });

  /* ── Reset all ── */
  document.getElementById('btn-reset-all')?.addEventListener('click', () => {
    if (confirm('This will permanently delete ALL projects, logs and settings. Are you sure?')) {
      DB.resetAll();
      UI.toast('All data cleared', 'ok');
      renderProjects();
      renderSettings();
    }
  });

  /* ── Update checker ── */
  document.getElementById('btn-check-update')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-check-update');
    const res = document.getElementById('update-result');
    if (!btn || !res) return;
    btn.disabled = true; btn.textContent = 'Checking…';
    try {
      const r    = await fetch('https://raw.githubusercontent.com/edmundsparrow/gnoke-logbook/main/README.md', { cache: 'no-store' });
      const text = await r.text();
      const m    = text.match(/\bv(\d+\.\d+(?:\.\d+)?)\b/i);
      const latest = m ? `v${m[1]}` : 'v1.0';
      res.innerHTML = latest === 'v1.0'
        ? `<span style="font-size:0.75rem;color:var(--accent);font-family:var(--font-mono);">✓ You're up to date (v1.0)</span>`
        : `<span style="font-size:0.75rem;font-family:var(--font-mono);">Update available: <strong>${latest}</strong></span>`;
    } catch (_) {
      res.innerHTML = `<span style="font-size:0.75rem;color:var(--danger);font-family:var(--font-mono);">Could not check — no internet</span>`;
    } finally {
      btn.disabled = false; btn.textContent = '🔄 Check for updates';
    }
  });

  /* ── Boot ── */
  renderProjects();

});