import { anatomyMap } from '../../components/anatomy-map.js';

// Preserve the FT-010A interface and stable IDs for the interactive generator.
export function bodyMap(selected, view) {
  return anatomyMap(selected, { view, interactive: true });
}
