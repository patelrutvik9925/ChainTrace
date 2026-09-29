/**
 * Demo Data Service
 * Provides controlled investigation data for hackathon demonstrations.
 * IMPORTANT: This data is clearly marked as DEMO — never presented as live blockchain data.
 */

export const DEMO_WALLETS = {
  // Victim-reported suspect wallet
  reported: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
  // Transaction chain
  hop1: 'TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH',
  hop2: 'TXmVpin5vres52mD9e1Z3os33wuCPA6Qme',
  hop3: 'TVDmEqBY6DRt7gBw4tELQFbKSe7nkH5m9P',
  hop4: 'TKVEtA6opBchJiURQBmRTKFGRotC57ytmF', // Possible VASP
  mixer: 'TRonMixerServiceAddressXXXXXXXXXXXX',
};

export const DEMO_TRANSACTIONS = [
  {
    chain: 'TRON',
    transactionHash: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
    from: DEMO_WALLETS.reported,
    to: DEMO_WALLETS.hop1,
    token: 'USDT',
    amount: '50000',
    amountRaw: '50000000000',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    blockNumber: 65234100,
    transactionStatus: 'SUCCESS',
    contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    dataSource: 'DEMO',
  },
  {
    chain: 'TRON',
    transactionHash: 'b2c3d4e5f678901234567890123456789012abcdef1234567890abcdef123457',
    from: DEMO_WALLETS.hop1,
    to: DEMO_WALLETS.hop2,
    token: 'USDT',
    amount: '24800',
    amountRaw: '24800000000',
    timestamp: new Date(Date.now() - 2.8 * 24 * 60 * 60 * 1000),
    blockNumber: 65234900,
    transactionStatus: 'SUCCESS',
    contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    dataSource: 'DEMO',
  },
  {
    chain: 'TRON',
    transactionHash: 'c3d4e5f6789012345678901234567890123bcdef1234567890abcdef12345678',
    from: DEMO_WALLETS.hop1,
    to: DEMO_WALLETS.hop3,
    token: 'USDT',
    amount: '24950',
    amountRaw: '24950000000',
    timestamp: new Date(Date.now() - 2.7 * 24 * 60 * 60 * 1000),
    blockNumber: 65235200,
    transactionStatus: 'SUCCESS',
    contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    dataSource: 'DEMO',
  },
  {
    chain: 'TRON',
    transactionHash: 'd4e5f6789012345678901234567890123456cdef1234567890abcdef12345679',
    from: DEMO_WALLETS.hop2,
    to: DEMO_WALLETS.hop4,
    token: 'USDT',
    amount: '24700',
    amountRaw: '24700000000',
    timestamp: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000),
    blockNumber: 65236100,
    transactionStatus: 'SUCCESS',
    contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    dataSource: 'DEMO',
  },
  {
    chain: 'TRON',
    transactionHash: 'e5f678901234567890123456789012345678def1234567890abcdef1234567a0',
    from: DEMO_WALLETS.hop3,
    to: DEMO_WALLETS.hop4,
    token: 'USDT',
    amount: '24900',
    amountRaw: '24900000000',
    timestamp: new Date(Date.now() - 2.4 * 24 * 60 * 60 * 1000),
    blockNumber: 65236500,
    transactionStatus: 'SUCCESS',
    contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    dataSource: 'DEMO',
  },
];

export const DEMO_GRAPH_NODES = [
  {
    id: DEMO_WALLETS.reported,
    label: 'Reported Wallet',
    type: 'REPORTED_SUSPECT',
    riskLevel: 'HIGH',
    chain: 'TRON',
    token: 'USDT',
    balance: '0',
    txCount: 12,
    isOriginal: true,
  },
  {
    id: DEMO_WALLETS.hop1,
    label: 'Intermediary A',
    type: 'INTERMEDIARY',
    riskLevel: 'HIGH',
    chain: 'TRON',
    token: 'USDT',
    balance: '250',
    txCount: 8,
  },
  {
    id: DEMO_WALLETS.hop2,
    label: 'Transit B',
    type: 'MULE',
    riskLevel: 'HIGH',
    chain: 'TRON',
    token: 'USDT',
    balance: '100',
    txCount: 5,
  },
  {
    id: DEMO_WALLETS.hop3,
    label: 'Transit C',
    type: 'MULE',
    riskLevel: 'MEDIUM',
    chain: 'TRON',
    token: 'USDT',
    balance: '50',
    txCount: 4,
  },
  {
    id: DEMO_WALLETS.hop4,
    label: 'Possible VASP',
    type: 'VASP_DEPOSIT',
    riskLevel: 'MEDIUM',
    chain: 'TRON',
    token: 'USDT',
    balance: '49600',
    txCount: 250,
    vaspName: 'Possible Exchange Platform',
    confidence: 'MEDIUM',
  },
];

export const DEMO_FINDINGS = [
  {
    findingType: 'RAPID_MOVEMENT',
    severity: 'HIGH',
    title: 'Rapid Fund Movement Detected',
    explanation: 'Funds moved through 3 wallets within 14 hours of the initial transaction, indicating deliberate rapid layering.',
    evidence: {
      observations: [
        'Initial transaction at T+0h',
        'Splitting to 2 wallets within 2 hours',
        'Consolidation at possible VASP within 14 hours',
      ],
      transactionHashes: [DEMO_TRANSACTIONS[0].transactionHash, DEMO_TRANSACTIONS[1].transactionHash],
      walletAddresses: [DEMO_WALLETS.reported, DEMO_WALLETS.hop1],
      dataSource: 'DEMO',
      analysisRule: 'RAPID_MOVEMENT_DETECTOR_v1',
    },
    confidence: { level: 'HIGH', score: 82, basis: ['Time window', 'Multiple hops', 'Splitting pattern'] },
  },
  {
    findingType: 'SPLITTING',
    severity: 'HIGH',
    title: 'Fund Splitting Pattern (Structuring Indicator)',
    explanation: 'Funds from the intermediary wallet were split into roughly equal portions (~50/50) and forwarded to separate wallets.',
    evidence: {
      observations: [
        'Wallet hop1 received 50,000 USDT',
        'Sent 24,800 USDT to hop2',
        'Sent 24,950 USDT to hop3',
        'Remaining ~250 USDT retained',
      ],
      transactionHashes: [DEMO_TRANSACTIONS[1].transactionHash, DEMO_TRANSACTIONS[2].transactionHash],
      walletAddresses: [DEMO_WALLETS.hop1, DEMO_WALLETS.hop2, DEMO_WALLETS.hop3],
      dataSource: 'DEMO',
      analysisRule: 'SPLITTING_DETECTOR_v1',
    },
    confidence: { level: 'HIGH', score: 88, basis: ['Near-equal split amounts', 'Sequential timing'] },
  },
  {
    findingType: 'VASP_DEPOSIT',
    severity: 'HIGH',
    title: 'Possible VASP Deposit Destination Identified',
    explanation: 'Wallet TKVEtA6... exhibits behavior consistent with a VASP deposit address: multiple unrelated incoming wallets, high transaction velocity, and consolidation patterns.',
    evidence: {
      observations: [
        '250+ transactions associated with this address',
        'Receives from multiple unrelated counterparties',
        'Consistent consolidation/sweep behavior',
        'Transaction amounts match exchange deposit patterns',
      ],
      transactionHashes: [DEMO_TRANSACTIONS[3].transactionHash, DEMO_TRANSACTIONS[4].transactionHash],
      walletAddresses: [DEMO_WALLETS.hop4],
      dataSource: 'DEMO',
      analysisRule: 'VASP_ATTRIBUTION_v1',
      limitations: 'Attribution is analytical, not confirmed. Direct VASP confirmation requires LEA coordination.',
    },
    confidence: { level: 'MEDIUM', score: 67, basis: ['Transaction velocity', 'Multiple counterparties', 'Consolidation pattern'] },
  },
];

export const DEMO_VASP_INTEL = [
  {
    vaspName: 'DemoExchange Platform',
    blockchain: 'TRON',
    addresses: [
      { address: DEMO_WALLETS.hop4, addressType: 'DEPOSIT', verified: false },
    ],
    source: 'DEMO_INTEL',
    confidence: 'MEDIUM',
    notes: 'DEMO: Analytical attribution based on behavioral patterns. Not confirmed.',
    isDemo: true,
  },
];

export function getDemoCase(userId) {
  return {
    caseName: 'Demo Investigation — TRC-20 USDT Fraud',
    description: 'Demonstration case: Victim reported losing 50,000 USDT via a phishing transaction. Investigation traces funds through multiple intermediary wallets to a possible VASP destination.',
    status: 'ACTIVE',
    priority: 'HIGH',
    victimInfo: {
      reportedWallet: DEMO_WALLETS.reported,
      blockchain: 'TRON',
      asset: 'USDT (TRC-20)',
      reportDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      ncrbComplaintNumber: 'DEMO-NCRP-2026-001',
      victimDescription: 'DEMO: Victim transferred 50,000 USDT after receiving fraudulent investment advisory.',
      estimatedLoss: '50000',
      currency: 'USDT',
    },
    createdBy: userId,
    isDemo: true,
    tags: ['DEMO', 'TRC-20', 'USDT', 'FRAUD'],
  };
}
