/**
 * TRON / TRC-20 Blockchain Adapter
 * ─────────────────────────────────────────────────────────────────────────────
 * Primary data source: TronGrid API (api.trongrid.io)
 * Fallback: TronScan API (apilist.tronscan.org)
 *
 * When external APIs are unavailable OR DEMO_MODE=true, the adapter returns
 * clearly-labelled DEMO data from the demo store.
 *
 * ⚠ DEMO data is NEVER presented as live blockchain data.
 */

import axios from 'axios';
import { BlockchainAdapter } from './adapter.js';
import logger from '../../config/logger.js';
import { DEMO_TRANSACTIONS, DEMO_GRAPH_NODES } from '../demo.service.js';

// TRC-20 USDT contract on TRON mainnet
const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

// TRON base58 address regex (starts with T, 34 chars)
const TRON_ADDRESS_RE = /^T[A-HJ-NP-Za-km-z1-9]{33}$/;

export class TronAdapter extends BlockchainAdapter {
  constructor() {
    super('TRON');
    this.tronGridBase = process.env.TRONGRID_BASE_URL || 'https://api.trongrid.io';
    this.tronScanBase = process.env.TRONSCAN_BASE_URL || 'https://apilist.tronscan.org/api';
    this.apiKey = process.env.TRON_API_KEY || '';
    this.timeout = 10000;
  }

  // ── Address validation ───────────────────────────────────────────────────────
  async validateAddress(address) {
    if (!address || typeof address !== 'string') {
      return { valid: false, reason: 'Address is required.' };
    }
    const trimmed = address.trim();
    if (!TRON_ADDRESS_RE.test(trimmed)) {
      return { valid: false, reason: 'Invalid TRON address format. Must start with T and be 34 characters.' };
    }
    return { valid: true, address: trimmed, chain: 'TRON' };
  }

  // ── HTTP helpers ──────────────────────────────────────────────────────────────
  _tronGridHeaders() {
    const h = { 'Content-Type': 'application/json' };
    if (this.apiKey) h['TRON-PRO-API-KEY'] = this.apiKey;
    return h;
  }

  async _get(url, params = {}) {
    return axios.get(url, {
      params,
      headers: this._tronGridHeaders(),
      timeout: this.timeout,
    });
  }

  // ── Normalize a TronGrid TRC-20 transfer event ────────────────────────────────
  _normalizeTrc20Transfer(tx, retrievedAt = new Date()) {
    return {
      chain: 'TRON',
      transactionHash: tx.transaction_id || tx.hash || '',
      from: tx.from || tx.from_address || '',
      to: tx.to || tx.to_address || '',
      token: tx.token_info?.symbol || tx.tokenAbbr || 'USDT',
      amount: tx.quant ? String(parseInt(tx.quant) / 1e6) : (tx.amount ? String(parseInt(tx.amount) / 1e6) : '0'),
      amountRaw: String(tx.quant || tx.amount || '0'),
      timestamp: tx.block_timestamp ? new Date(tx.block_timestamp) : new Date(tx.timestamp || 0),
      blockNumber: tx.blockNumber || tx.block || 0,
      transactionStatus: 'SUCCESS',
      contractAddress: tx.token_info?.address || tx.contract_address || USDT_CONTRACT,
      dataSource: 'TRONGRID',
      provenance: {
        provider: 'TRONGRID',
        blockchain: 'TRON',
        retrievedAt,
        requestType: 'TRC20_TRANSFERS',
        sourceStatus: 'LIVE',
        referenceUrl: `https://tronscan.org/#/transaction/${tx.transaction_id}`,
      },
    };
  }

  // ── TronGrid: get TRC-20 USDT transfers ────────────────────────────────────────
  async getTokenTransfers(address, token = 'USDT', options = {}) {
    const { limit = 50, minTimestamp } = options;
    try {
      const url = `${this.tronGridBase}/v1/accounts/${address}/transactions/trc20`;
      const params = {
        limit: Math.min(limit, 200),
        contract_address: USDT_CONTRACT,
        only_confirmed: true,
      };
      if (minTimestamp) params.min_timestamp = minTimestamp;

      const res = await this._get(url, params);
      const transfers = res.data?.data || [];
      logger.info(`[TRON] Fetched ${transfers.length} TRC-20 transfers for ${address}`);
      return transfers.map(tx => this._normalizeTrc20Transfer(tx));
    } catch (err) {
      if (err.code === 'ECONNABORTED' || err.code === 'ENOTFOUND' || err.response?.status >= 500) {
        logger.warn(`[TRON] TronGrid unavailable (${err.code || err.response?.status}) — using demo fallback`);
        return this._demoFallbackTransactions(address);
      }
      if (err.response?.status === 429) {
        logger.warn('[TRON] Rate limited by TronGrid');
        throw { code: 'RATE_LIMITED', message: 'TronGrid rate limit reached. Please try again later.' };
      }
      logger.error('[TRON] getTokenTransfers error:', err.message);
      throw err;
    }
  }

  // ── TronGrid: get normal transactions ──────────────────────────────────────────
  async getTransactions(address, options = {}) {
    const { limit = 50 } = options;
    try {
      const url = `${this.tronGridBase}/v1/accounts/${address}/transactions`;
      const res = await this._get(url, { limit: Math.min(limit, 200), only_confirmed: true });
      const txs = res.data?.data || [];
      logger.info(`[TRON] Fetched ${txs.length} transactions for ${address}`);
      return txs;
    } catch (err) {
      logger.warn(`[TRON] getTransactions fallback for ${address}: ${err.message}`);
      return [];
    }
  }

  // ── TronGrid: wallet profile ─────────────────────────────────────────────────
  async getWalletProfile(address) {
    try {
      const url = `${this.tronGridBase}/v1/accounts/${address}`;
      const res = await this._get(url);
      const data = res.data?.data?.[0];
      if (!data) return { balance: '0', txCount: 0, firstSeen: null, lastSeen: null };
      return {
        balance: String((data.balance || 0) / 1e6),
        trxBalance: String((data.balance || 0) / 1e6),
        trc20Balances: data.trc20 || [],
        createTime: data.create_time ? new Date(data.create_time) : null,
        txCount: data.net_usage || 0,
        firstSeen: data.create_time ? new Date(data.create_time) : null,
        lastSeen: null,
        bandwidth: data.free_net_usage,
        energy: data.energy_usage,
        dataSource: 'TRONGRID',
      };
    } catch (err) {
      logger.warn(`[TRON] getWalletProfile unavailable for ${address}: ${err.message}`);
      return { balance: '0', txCount: 0, firstSeen: null, lastSeen: null, dataSource: 'UNAVAILABLE' };
    }
  }

  // ── Demo fallback ─────────────────────────────────────────────────────────────
  _demoFallbackTransactions(address) {
    const relevant = DEMO_TRANSACTIONS.filter(t => t.from === address || t.to === address);
    return relevant.map(tx => ({
      ...tx,
      dataSource: 'DEMO',
      provenance: {
        provider: 'DEMO',
        blockchain: 'TRON',
        retrievedAt: new Date(),
        requestType: 'DEMO_FALLBACK',
        sourceStatus: 'DEMO',
      },
    }));
  }
}

// Singleton export
export const tronAdapter = new TronAdapter();
