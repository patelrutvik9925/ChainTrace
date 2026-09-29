/**
 * Blockchain Adapter Interface
 * ─────────────────────────────────────────────────────────────────────────────
 * Every chain adapter must implement these methods.
 * Adapters return normalized transaction objects (see transaction.model.js).
 */

export class BlockchainAdapter {
  constructor(chain) { this.chain = chain; }

  /** Validate an address for this chain. Returns { valid, reason } */
  async validateAddress(address) { throw new Error('Not implemented'); }

  /** Fetch transactions for an address. Returns normalized tx array. */
  async getTransactions(address, options = {}) { throw new Error('Not implemented'); }

  /** Fetch token transfers for an address. Returns normalized tx array. */
  async getTokenTransfers(address, token, options = {}) { throw new Error('Not implemented'); }

  /** Get wallet balance/profile. Returns { balance, firstSeen, lastSeen, txCount } */
  async getWalletProfile(address) { throw new Error('Not implemented'); }
}
