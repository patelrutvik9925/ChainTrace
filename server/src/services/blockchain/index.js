/**
 * Blockchain Adapter Registry
 * Returns the appropriate adapter for a given chain.
 * Stub adapters (Ethereum, Bitcoin) are architecture-ready but return demo data.
 */

import { tronAdapter } from './tron.adapter.js';
import { BlockchainAdapter } from './adapter.js';
import logger from '../../config/logger.js';

// ── Ethereum stub (architecture-ready) ────────────────────────────────────────
class EthereumAdapter extends BlockchainAdapter {
  constructor() { super('ETHEREUM'); }
  async validateAddress(address) {
    const valid = /^0x[0-9a-fA-F]{40}$/.test(address);
    return { valid, reason: valid ? undefined : 'Invalid Ethereum address format.', chain: 'ETHEREUM' };
  }
  async getTokenTransfers() {
    logger.info('[ETH] Ethereum adapter: architecture-ready, returning empty (no API configured)');
    return [];
  }
  async getTransactions() { return []; }
  async getWalletProfile() { return { balance: '0', txCount: 0, dataSource: 'NOT_CONFIGURED' }; }
}

// ── Bitcoin stub (architecture-ready) ─────────────────────────────────────────
class BitcoinAdapter extends BlockchainAdapter {
  constructor() { super('BITCOIN'); }
  async validateAddress(address) {
    const valid = /^(1|3|bc1)[a-zA-Z0-9]{25,62}$/.test(address);
    return { valid, reason: valid ? undefined : 'Invalid Bitcoin address format.', chain: 'BITCOIN' };
  }
  async getTokenTransfers() { return []; }
  async getTransactions() { return []; }
  async getWalletProfile() { return { balance: '0', txCount: 0, dataSource: 'NOT_CONFIGURED' }; }
}

const ADAPTERS = {
  TRON: tronAdapter,
  ETHEREUM: new EthereumAdapter(),
  BITCOIN: new BitcoinAdapter(),
};

export function getAdapter(chain) {
  const adapter = ADAPTERS[chain?.toUpperCase()];
  if (!adapter) throw new Error(`No adapter registered for chain: ${chain}`);
  return adapter;
}

export { tronAdapter };
