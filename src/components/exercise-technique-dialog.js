import { techniqueView } from '../features/exercises/views.js';
import { mountExerciseMedia, loadDemonstration } from './exercise-media.js';

// The catalog can share its editor dialog; other screens only mount technique.
export function mountExerciseTechnique(root, { dialog: existingDialog, onAssign } = {}) {
  const events = new AbortController();
  const { signal } = events;
  const dialog = existingDialog ?? document.createElement('dialog');
  if (!existingDialog) {
    dialog.className = 'exercise-dialog';
    dialog.setAttribute('aria-labelledby', 'exercise-dialog-title');
    dialog.tabIndex = -1;
    root.append(dialog);
  }
  const media = mountExerciseMedia(root, signal);
  let selected;
  let trigger;
  let stopDemonstration = () => {};
  const stopMedia = () => { stopDemonstration(); stopDemonstration = () => {}; };
  const close = () => { stopMedia(); dialog.close(); };

  dialog.addEventListener('click', (event) => {
    if (dialog.dataset.kind !== 'technique') return;
    // Technique controls never reach the generator or routine action handlers.
    event.stopPropagation();
    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-close-exercise-dialog')) close();
    else if (button.hasAttribute('data-load-demonstration')) {
      stopMedia();
      stopDemonstration = loadDemonstration(dialog.querySelector('[data-technique-media]'), selected);
    } else if (button.hasAttribute('data-add-exercise-to-routine') && onAssign) {
      close();
      onAssign(selected);
    }
  }, { signal });
  dialog.addEventListener('cancel', () => { if (dialog.dataset.kind === 'technique') stopMedia(); }, { signal });
  dialog.addEventListener('close', () => {
    if (dialog.dataset.kind !== 'technique' || dialog.open) return;
    stopMedia();
    // Discard closed media as well as any player source/listeners.
    dialog.replaceChildren();
    if (trigger?.isConnected) trigger.focus({ preventScroll: true });
  }, { signal });
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab' || dialog.querySelector('video, iframe')) return;
    const controls = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href], summary')].filter((control) => control.getClientRects().length);
    const first = controls[0];
    const last = controls.at(-1);
    if (!first) { event.preventDefault(); dialog.focus(); }
    else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }, { signal });

  return {
    open(exercise, button) {
      stopMedia();
      selected = exercise;
      trigger = button;
      dialog.dataset.kind = 'technique';
      dialog.innerHTML = techniqueView(exercise, { allowAssignment: Boolean(onAssign) });
      dialog.showModal();
      media.refresh();
    },
    refresh: () => media.refresh(),
    stopMedia,
    destroy() {
      stopMedia();
      events.abort();
      if (dialog.dataset.kind === 'technique' && dialog.open) dialog.close();
      if (!existingDialog) dialog.remove();
    },
  };
}
