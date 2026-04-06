const Theme = (() => {
  const KEY = 'gnoke_logbook_theme';
  function current() { return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }
  function _apply(t) { document.documentElement.setAttribute('data-theme', t); localStorage.setItem(KEY, t); _icon(t); }
  function _icon(t) { const b = document.getElementById('theme-toggle'); if(b) b.textContent = t==='dark'?'☀️':'🌙'; }
  function toggle() { _apply(current()==='dark'?'light':'dark'); }
  function init() { _icon(current()); document.getElementById('theme-toggle')?.addEventListener('click', toggle); }
  return { init, toggle, current };
})();
