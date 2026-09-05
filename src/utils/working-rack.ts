import type { RackConfig } from '../state/types';
import { isRackConfig } from './url-sharing';

export const WORKING_RACK_KEY = 'rack-configurator.working-rack.v1';

// Safari can deny storage in restricted contexts. Editing must still work.
export function readWorkingRack(): RackConfig | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(WORKING_RACK_KEY) ?? 'null');
    return isRackConfig(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveWorkingRack(config: RackConfig): boolean {
  try {
    localStorage.setItem(WORKING_RACK_KEY, JSON.stringify(config));
    return true;
  } catch {
    return false;
  }
}
