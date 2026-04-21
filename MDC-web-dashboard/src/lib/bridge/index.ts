/**
 * ZT Bridge Module
 * Exports for ZT Bridge integration
 */

// Types
export * from './types';

// Client
export { bridgeClient, BridgeAPIError } from './client';

// Hooks
export {
  bridgeKeys,
  useConsoles,
  useCreateConsole,
  useDeleteConsole,
  useBridgeHealth,
  usePVEProxyInfo,
  useOpenConsole,
} from './hooks';
