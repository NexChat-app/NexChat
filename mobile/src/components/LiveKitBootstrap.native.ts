import { registerGlobals } from '@livekit/react-native';

let initialized = false;

export function initializeLiveKit() {
  if (initialized) return;
  registerGlobals();
  initialized = true;
}
