/**
 * export.js — Gnoke Logbook
 * Generates a printable HTML report and plain-text export.
 * No dependencies — uses window.print() for PDF.
 */

const Exporter = (() => {

  function _esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  /* ── Print/PDF ── */
  function printWeek(project, week) {
    const rows = week.rows.map((r, i) => `
      <tr>
        <td style="text-align:center;width:40px">${i + 1}</td>
        <td style="width:90px">${_esc(r.day)}</td>
        <td>${_esc(r.task)}</td>
        <td style="width:130px">${_esc(r.partners)}</td>
        <td style="text-align:center;width:50px">${r.done ? '✓' : ''}</td>
        <td>${_esc(r.remarks)}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Weekly Report — ${_esc(project.name)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Georgia', serif; font-size: 11pt; color: #1a1a1a; padding: 32px 40px; }
  h1 { font-size: 15pt; margin-bottom: 2px; }
  .meta { font-size: 9pt; color: #555; margin-bottom: 20px; font-family: monospace; }
  .header-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; margin-bottom: 18px; font-size: 10pt; }
  .header-grid span { color: #555; font-size: 9pt; }
  table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  th { background: #1a1a1a; color: #fff; padding: 7px 8px; text-align: left; font-size: 9pt; letter-spacing: 0.04em; }
  td { padding: 7px 8px; border-bottom: 1px solid #ddd; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  tr:nth-child(even) td { background: #f9f9f9; }
  .footer { margin-top: 28px; font-size: 9pt; color: #888; font-family: monospace; border-top: 1px solid #ddd; padding-top: 10px; display: flex; justify-content: space-between; }
  @media print { body { padding: 16px 24px; } }
</style>
</head>
<body>
  <h1>${_esc(project.name)}</h1>
  <div class="meta">Weekly Progress Report · ${DB.weekLabel(week.weekStr)}</div>
  <div class="header-grid">
    <div><span>Prepared by:</span> ${_esc(week.preparedBy || '—')}</div>
    <div><span>Submitted to:</span> ${_esc(week.submittedTo || project.submittedTo || '—')}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>S/N</th>
        <th>Day</th>
        <th>Task / Activity</th>
        <th>Partners</th>
        <th>Done</th>
        <th>Remarks</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">
    <span>Gnoke Logbook · gnoke suite</span>
    <span>Generated ${new Date().toLocaleDateString('en-NG', { dateStyle: 'long' })}</span>
  </div>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (!win) { alert('Allow pop-ups to export the report.'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  }

  /* ── Plain text (for WhatsApp / email) ── */
  function copyWeekText(project, week) {
    const lines = [
      `*${project.name} — Weekly Report*`,
      `Week: ${DB.weekLabel(week.weekStr)}`,
      `Prepared by: ${week.preparedBy || '—'}`,
      `Submitted to: ${week.submittedTo || project.submittedTo || '—'}`,
      '',
      week.rows.map((r, i) =>
        `${i+1}. [${r.done ? '✓' : ' '}] ${r.day ? r.day + ' — ' : ''}${r.task || '(no task)'}` +
        (r.partners ? `\n   Partners: ${r.partners}` : '') +
        (r.remarks  ? `\n   Remarks: ${r.remarks}`   : '')
      ).join('\n'),
      '',
      `— Gnoke Logbook`,
    ].join('\n');

    navigator.clipboard.writeText(lines)
      .then(() => UI.toast('Copied to clipboard', 'ok'))
      .catch(() => UI.toast('Copy failed — try again', 'err'));
  }

  return { printWeek, copyWeekText };

})();
