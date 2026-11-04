import { icon } from '../../components/icons.js';
import { escapeHTML as esc } from '../../utils/html.js';
import { weightInput, toKg, fromKg } from '../../utils/units.js';
import { createRoutineDialog, dialogHeading } from '../../components/routine-dialog.js';
import { profileService } from './profile-service.js';
import { MAX_BACKUP_BYTES, parseBackup, backupCounts, readPersonalData, exportPersonalBackup, restorePersonalBackup, resetPersonalData } from './backup.js';

const heading = () => `<section class="page-heading"><div><h1>${icon('user')}Perfil</h1><p>Tu alias, objetivos y preferencias de entrenamiento, en este dispositivo.</p></div></section>`;
const labels = { exercises: 'Ejercicios personalizados', routines: 'Rutinas', routineSessions: 'Sesiones de rutina', workouts: 'Entrenamientos (incluye pendientes)', setRecords: 'Series realizadas', profiles: 'Perfiles', settings: 'Preferencias y configuración' };
function view(data, mode) {
  return `<header class="card profile-banner"><span class="profile-avatar">${icon('user')}</span><div><h2 data-profile-alias>${esc(data.alias || (mode === 'demo' ? 'Deportista demo' : 'Tu perfil local'))}</h2><p>Entrena · Registra · Progresa</p><span class="stage-pill">${mode === 'demo' ? 'Demostración' : 'Modo personal'}</span></div><span class="profile-banner-mark" aria-hidden="true">${icon('dumbbell')}</span></header><div class="profile-grid"><section class="card profile-settings"><h2>${icon('target')}Objetivos y preferencias</h2><p class="availability-note">Estos cambios pertenecen solo al modo ${mode === 'demo' ? 'demostración' : 'personal'}. Los objetivos aparecen en Inicio.</p><form data-profile-form novalidate><label>Alias<input name="alias" autocomplete="off" maxlength="50" value="${esc(data.alias)}" placeholder="Cómo quieres aparecer"></label><label>Unidades de peso<select name="weightUnit"><option value="kg"${data.weightUnit === 'kg' ? ' selected' : ''}>Kilogramos (kg)</option><option value="lb"${data.weightUnit === 'lb' ? ' selected' : ''}>Libras (lb)</option></select></label><label>Sesiones por semana (opcional)<input name="sessions" type="number" inputmode="numeric" min="1" max="21" step="1" value="${data.sessions ?? ''}" placeholder="Sin objetivo"></label><label><span data-volume-label>Volumen semanal (${data.weightUnit}, opcional)</span><input name="volume" type="number" inputmode="decimal" min="0" step="any" value="${data.volumeKg === null ? '' : weightInput(data.volumeKg, data.weightUnit)}" placeholder="Sin objetivo"></label><p class="availability-note">El volumen suma carga × repeticiones de las series completadas. Deja un objetivo vacío para quitarlo.</p><p class="profile-form-error" role="alert"></p><button class="button button-primary" type="submit">${icon('check')}Guardar cambios</button></form></section><div class="profile-data"><section class="card profile-backup"><h2>${icon('layers')}Respaldo personal</h2><p>Tus datos se guardan solo en este navegador. Borrar los datos del sitio puede eliminar tu historial. Guarda una copia para recuperarlo en otro navegador.</p><p class="backup-scope">La exportación, importación y eliminación de esta sección afectan exclusivamente al espacio personal, aunque estés en demostración.</p><div class="profile-actions"><button class="button button-secondary" type="button" data-export-personal>Exportar respaldo personal</button><label class="backup-file">Importar respaldo personal<input type="file" accept=".json,application/json" data-import-personal></label></div><p class="availability-note">JSON · Máximo 20 MiB. Antes de reemplazar tus datos verás una vista previa. La biblioteca base se incluye con la aplicación.</p></section><section class="card profile-reset"><h2>${icon('info')}Gestionar datos locales</h2><p>El restablecimiento personal elimina perfil, preferencias, rutinas e historial personal, incluida la sesión pendiente. Puedes exportar una copia primero.</p><div class="profile-actions"><button type="button" class="button button-secondary danger-button" data-reset-personal>Restablecer datos personales</button><button type="button" class="button button-secondary" data-request-reset>Restablecer demostración</button></div><button type="button" class="text-link" data-open-modes>Elegir espacio de entrenamiento</button></section></div></div>`;
}
function preview(backup, existing, filename) {
  const restored = backupCounts(backup.stores);
  const current = backupCounts(existing);
  return `${dialogHeading('Restaurar respaldo personal')}<p>Archivo: <strong>${esc(filename)}</strong></p><p>Exportado el ${esc(new Date(backup.exportedAt).toLocaleString('es-CL'))}. Vista previa validada.</p><table class="reference-table backup-preview"><caption>Reemplazo de datos personales</caption><thead><tr><th scope="col">Contenido</th><th scope="col">Actual</th><th scope="col">Respaldo</th></tr></thead><tbody>${Object.entries(labels).map(([key, label]) => `<tr><th scope="row">${label}</th><td>${current[key]}</td><td>${restored[key]}</td></tr>`).join('')}</tbody></table><p>Se reemplazará <strong>todo el espacio personal</strong> por este respaldo, incluido su perfil y la sesión pendiente si existe. La demostración se conserva. No se combinarán los datos.</p><p class="profile-form-error" role="alert"></p><div class="dialog-actions"><button class="button button-secondary" type="button" data-close-routine-dialog autofocus>Cancelar</button><button class="button button-primary" type="button" data-confirm-personal-import>Reemplazar datos personales</button></div>`;
}
export function mountProfile(root, mode, { onPersonalChange = () => {} } = {}) {
  const events = new AbortController();
  const service = profileService(mode);
  let alive = true;
  let busy = false;
  let data;
  let pending;
  let returnFocus;
  let reading = 0;
  root.innerHTML = `${heading()}<p class="profile-feedback" role="status"></p><div data-profile-content><p role="status">Cargando perfil…</p></div>`;
  const content = root.querySelector('[data-profile-content]');
  const dialog = createRoutineDialog(root);
  function feedback(message) { if (alive) root.querySelector('.profile-feedback').textContent = message; }
  async function load() {
    try { const saved = await service.load(); if (alive) { data = saved; content.innerHTML = view(saved, mode); } }
    catch (error) { if (alive) content.innerHTML = `<section class="card tool-error" role="alert"><p>${esc(error.message)}</p><button class="button button-secondary" type="button" data-retry-profile>Reintentar</button></section>`; }
  }
  async function perform(operation, done = () => {}) {
    if (busy || !alive) return;
    busy = true;
    const controls = [...root.querySelectorAll('button, input, select')].map((control) => [control, control.disabled]);
    controls.forEach(([control]) => { control.disabled = true; });
    dialog.dataset.busy = 'true';
    try { const result = await operation(); if (alive) await done(result); }
    catch (error) {
      if (alive) {
        const target = dialog.open ? dialog.querySelector('.profile-form-error') : root.querySelector('.profile-form-error');
        if (target) target.textContent = error.message;
        feedback(`No se completó la operación. ${error.message}`);
      }
    } finally { controls.forEach(([control, disabled]) => { control.disabled = disabled; }); dialog.dataset.busy = 'false'; busy = false; }
  }
  function show(html, trigger) { returnFocus = trigger; dialog.innerHTML = html; dialog.showModal(); dialog.querySelector('[autofocus]')?.focus(); }
  root.addEventListener('submit', (event) => {
    if (!event.target.matches('[data-profile-form]')) return;
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.target));
    void perform(() => service.save(fields, data), async () => {
      await load(); feedback(`Perfil y objetivos guardados en ${mode === 'demo' ? 'demostración' : 'modo personal'}.`);
      window.dispatchEvent(new Event('profile-change'));
    });
  }, { signal: events.signal });
  root.addEventListener('change', async (event) => {
    if (event.target.name === 'weightUnit') {
      // Preserve the physical target while switching the form's display unit.
      const volume = root.querySelector('[name="volume"]');
      if (!alive) return;
      if (volume.value !== '' && Number.isFinite(Number(volume.value))) volume.value = Number(fromKg(toKg(Number(volume.value), data.weightUnit), event.target.value).toFixed(4));
      data = { ...data, weightUnit: event.target.value };
      root.querySelector('[data-volume-label]').textContent = `Volumen semanal (${event.target.value}, opcional)`;
      return;
    }
    if (!event.target.matches('[data-import-personal]') || busy) return;
    const input = event.target;
    const file = input.files?.[0];
    input.value = '';
    const request = ++reading;
    if (!file) return;
    pending = null;
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error('El archivo supera 20 MiB.');
      const backup = parseBackup(await file.text());
      const existing = await readPersonalData();
      if (!alive || request !== reading) return;
      pending = { backup, existing };
      show(preview(backup, existing, file.name), input);
    } catch (error) { if (alive && request === reading) feedback(`No se importó ningún dato. ${error.message}`); }
  }, { signal: events.signal });
  root.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button || busy || button.disabled) return;
    if (button.hasAttribute('data-close-routine-dialog')) { dialog.close(); return; }
    if (button.hasAttribute('data-retry-profile')) void load();
    if (button.hasAttribute('data-export-personal')) void perform(exportPersonalBackup, (backup) => {
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      if (blob.size > MAX_BACKUP_BYTES) throw new Error('El respaldo supera el límite de 20 MiB admitido para restaurar. Los datos se conservan.');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `fittracker-personal-${backup.exportedAt.slice(0, 10)}.json`;
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      feedback('Respaldo personal exportado. Guárdalo en un lugar privado.');
    });
    if (button.hasAttribute('data-reset-personal')) void perform(readPersonalData, (existing) => {
      pending = { existing };
      const counts = backupCounts(existing);
      show(`${dialogHeading('¿Restablecer datos personales?')}<p>Se eliminarán ${counts.routines} rutinas, ${counts.routineSessions} sesiones de rutina, ${counts.workouts} entrenamientos, ${counts.setRecords} series y ${counts.exercises} ejercicios personalizados, además de tu perfil y preferencias.</p><p>Esta acción no se puede deshacer sin un respaldo. La demostración se conserva.</p><p class="profile-form-error" role="alert"></p><div class="dialog-actions"><button type="button" class="button button-secondary" data-close-routine-dialog autofocus>Cancelar</button><button type="button" class="button button-secondary danger-button" data-confirm-personal-reset>Eliminar datos personales</button></div>`, button);
    });
    if (button.hasAttribute('data-confirm-personal-import') && pending?.backup) void perform(() => restorePersonalBackup(pending.backup, pending.existing), async () => {
      pending = null; dialog.close(); onPersonalChange(); await load(); feedback('Respaldo restaurado en el espacio personal. La demostración se conservó.'); window.dispatchEvent(new Event('workout-change'));
    });
    if (button.hasAttribute('data-confirm-personal-reset') && pending) void perform(() => resetPersonalData(pending.existing), async () => {
      pending = null; dialog.close(); onPersonalChange(); await load(); feedback('Datos personales restablecidos. La demostración se conservó.'); window.dispatchEvent(new Event('workout-change'));
    });
  }, { signal: events.signal });
  dialog.addEventListener('close', () => { pending = null; if (alive && returnFocus?.isConnected) returnFocus.focus(); }, { signal: events.signal });
  const beforeUnload = (event) => { if (busy) { event.preventDefault(); event.returnValue = ''; } };
  window.addEventListener('beforeunload', beforeUnload);
  void load();
  return {
    async prepareLeave() { while (busy) await new Promise((resolve) => setTimeout(resolve, 15)); return true; },
    destroy() { alive = false; reading++; pending = null; events.abort(); window.removeEventListener('beforeunload', beforeUnload); if (dialog.open) dialog.close(); },
  };
}
