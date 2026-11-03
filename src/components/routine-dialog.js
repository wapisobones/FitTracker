import { icon } from './icons.js';
import { escapeHTML } from '../utils/html.js';

export function dialogHeading(title) {
  return `<div class="dialog-heading"><h2 id="routine-dialog-title">${escapeHTML(title)}</h2><button class="icon-button" type="button" data-close-routine-dialog aria-label="Cerrar ventana">${icon('close')}</button></div>`;
}

export function createRoutineDialog(root) {
  const dialog = document.createElement('dialog');
  dialog.className = 'exercise-dialog routine-dialog';
  dialog.setAttribute('aria-labelledby', 'routine-dialog-title');
  dialog.tabIndex = -1;
  root.append(dialog);
  dialog.addEventListener('cancel', (event) => { if (dialog.dataset.busy === 'true') event.preventDefault(); });
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const controls = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href]')].filter((control) => control.getClientRects().length);
    if (!controls.length) { event.preventDefault(); dialog.focus(); }
    else if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1).focus(); }
    else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus(); }
  });
  return dialog;
}
