/**
 * db.js — Gnoke Logbook
 * All data operations via localStorage. No SQL needed.
 * Data shape:
 *   gnoke_logbook_projects  → { id: { id, name, submittedTo, createdAt } }
 *   gnoke_logbook_weeks     → { "projectId_weekKey": { header, rows[], checklist } }
 *   gnoke_logbook_checklist → [ { id, label, default: bool } ]
 */

const DB = (() => {

  const KEYS = {
    projects  : 'gnoke_logbook_projects',
    weeks     : 'gnoke_logbook_weeks',
    checklist : 'gnoke_logbook_checklist',
  };

  const DEFAULT_CHECKLIST = [
    { id: 'c1', label: 'Task clearly described', on: true },
    { id: 'c2', label: 'Completed by named partner', on: false },
    { id: 'c3', label: 'No blockers outstanding', on: false },
    { id: 'c4', label: 'Ready for next phase', on: false },
  ];

  /* ── helpers ── */
  function _get(key)       { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch(_) { return {}; } }
  function _getArr(key)    { try { return JSON.parse(localStorage.getItem(key)) || []; } catch(_) { return []; } }
  function _set(key, val)  { localStorage.setItem(key, JSON.stringify(val)); }
  function _uid()          { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  /* ── PROJECTS ── */
  function getProjects() {
    const obj = _get(KEYS.projects);
    return Object.values(obj).sort((a, b) => b.createdAt - a.createdAt);
  }

  function saveProject(data) {
    const all = _get(KEYS.projects);
    const id  = data.id || _uid();
    all[id] = { ...data, id, createdAt: data.createdAt || Date.now() };
    _set(KEYS.projects, all);
    return all[id];
  }

  function deleteProject(id) {
    const all = _get(KEYS.projects);
    delete all[id];
    _set(KEYS.projects, all);
    // also delete all weeks for this project
    const weeks = _get(KEYS.weeks);
    Object.keys(weeks).forEach(k => { if (k.startsWith(id + '_')) delete weeks[k]; });
    _set(KEYS.weeks, weeks);
  }

  /* ── WEEKS ── */
  function weekKey(projectId, weekStr) { return projectId + '_' + weekStr; }

  function getWeek(projectId, weekStr) {
    const all = _get(KEYS.weeks);
    return all[weekKey(projectId, weekStr)] || _emptyWeek(weekStr);
  }

  function saveWeek(projectId, weekStr, data) {
    const all = _get(KEYS.weeks);
    all[weekKey(projectId, weekStr)] = { ...data, projectId, weekStr, savedAt: Date.now() };
    _set(KEYS.weeks, all);
  }

  function getWeeksForProject(projectId) {
    const all = _get(KEYS.weeks);
    return Object.values(all)
      .filter(w => w.projectId === projectId)
      .sort((a, b) => b.weekStr.localeCompare(a.weekStr));
  }

  function _emptyWeek(weekStr) {
    const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    return {
      weekStr,
      preparedBy : '',
      submittedTo: '',
      rows: DAYS.map((day, i) => ({
        id       : _uid(),
        sn       : i + 1,
        day,
        task     : '',
        partners : '',
        remarks  : '',
        done     : false,
      })),
    };
  }

  function addRow(week) {
    const sn = week.rows.length + 1;
    week.rows.push({ id: _uid(), sn, day: '', task: '', partners: '', remarks: '', done: false });
    return week;
  }

  function removeRow(week, rowId) {
    week.rows = week.rows.filter(r => r.id !== rowId);
    week.rows.forEach((r, i) => r.sn = i + 1);
    return week;
  }

  /* ── CHECKLIST TEMPLATES ── */
  function getChecklist() {
    const saved = _getArr(KEYS.checklist);
    return saved.length ? saved : DEFAULT_CHECKLIST;
  }

  function saveChecklist(items) {
    _set(KEYS.checklist, items);
  }

  function addChecklistItem(label) {
    const items = getChecklist();
    items.push({ id: _uid(), label, on: false });
    saveChecklist(items);
    return items;
  }

  function removeChecklistItem(id) {
    const items = getChecklist().filter(i => i.id !== id);
    saveChecklist(items);
    return items;
  }

  /* ── WEEK STRING UTILS ── */

  function _toDateStr(d) {
    // Build YYYY-MM-DD from LOCAL date parts — never use toISOString() for dates
    // because it converts to UTC first, which shifts the date in WAT (UTC+1)
    const y  = d.getFullYear();
    const m  = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  function currentWeekStr() {
    const now  = new Date();
    const day  = now.getDay();           // 0 = Sun, 1 = Mon … 6 = Sat
    const back = day === 0 ? -6 : 1 - day;
    const mon  = new Date(now);
    mon.setDate(now.getDate() + back);
    mon.setHours(0, 0, 0, 0);
    return _toDateStr(mon);
  }

  function weekLabel(weekStr) {
    const mon = new Date(weekStr + 'T00:00:00');
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const fmt = d => d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
    return fmt(mon) + ' – ' + fmt(sun) + ', ' + sun.getFullYear();
  }

  /* ── BACKUP / RESTORE / RESET ── */
  function backup() {
    const payload = {
      version   : 1,
      exportedAt: new Date().toISOString(),
      projects  : _get(KEYS.projects),
      weeks     : _get(KEYS.weeks),
      checklist : _getArr(KEYS.checklist),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'gnoke-logbook-backup-' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function restore(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const data = JSON.parse(e.target.result);
          if (!data.projects || !data.weeks) throw new Error('Invalid backup file');
          _set(KEYS.projects,  data.projects);
          _set(KEYS.weeks,     data.weeks);
          if (data.checklist?.length) _set(KEYS.checklist, data.checklist);
          resolve();
        } catch (err) { reject(err); }
      };
      reader.onerror = () => reject(new Error('Could not read file'));
      reader.readAsText(file);
    });
  }

  function resetAll() {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  }

  return {
    getProjects, saveProject, deleteProject,
    getWeek, saveWeek, getWeeksForProject,
    addRow, removeRow,
    getChecklist, saveChecklist, addChecklistItem, removeChecklistItem,
    currentWeekStr, weekLabel, dateStr: _toDateStr,
    backup, restore, resetAll,
  };

})();