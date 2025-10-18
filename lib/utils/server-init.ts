import { showStartupBanner } from './startup-banner';

let initialized = false;

export function initializeServer() {
  if (!initialized && process.env.NODE_ENV === 'development') {
    showStartupBanner();
    initialized = true;
  }
}
