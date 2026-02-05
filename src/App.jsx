import React, { useState } from 'react';
import { Search, ExternalLink, CheckCircle, XCircle, Clock, Copy, Check, Loader2, ChevronDown } from 'lucide-react';


// Rizzy supported coins and their networks (from deposit options)
const COINS = [
  {
    id: 'btc',
    name: 'BTC',
    fullName: 'Bitcoin',
    networks: [
      { id: 'btc', name: 'BTC', explorer: 'https://mempool.space/tx/', api: 'https://mempool.space/api/tx/', type: 'btc' }
    ]
  },
  {
    id: 'eth',
    name: 'ETH',
    fullName: 'Ethereum',
    networks: [
      { id: 'eth', name: 'ETH', explorer: 'https://etherscan.io/tx/', type: 'evm', decimals: 18, symbol: 'ETH' }
    ]
  },
  {
    id: 'usdt',
    name: 'USDT',
    fullName: 'Tether',
    networks: [
      { id: 'bep20', name: 'BNB Smart Chain (BEP20)', explorer: 'https://bscscan.com/tx/', type: 'evm', decimals: 18, symbol: 'USDT' },
      { id: 'erc20', name: 'Ethereum (ERC20)', explorer: 'https://etherscan.io/tx/', type: 'evm', decimals: 6, symbol: 'USDT' },
      { id: 'sol', name: 'Solana (SOL)', explorer: 'https://solscan.io/tx/', type: 'solana' },
      { id: 'trc20', name: 'Tron (TRC20)', explorer: 'https://tronscan.org/#/transaction/', type: 'tron' },
      { id: 'ton', name: 'The Open Network (TON)', explorer: 'https://tonscan.org/tx/', type: 'ton' },
    ]
  },
  {
    id: 'usdc',
    name: 'USDC',
    fullName: 'USD Coin',
    networks: [
      { id: 'erc20', name: 'Ethereum (ERC20)', explorer: 'https://etherscan.io/tx/', type: 'evm', decimals: 6, symbol: 'USDC' },
      { id: 'sol', name: 'Solana (SOL)', explorer: 'https://solscan.io/tx/', type: 'solana' },
    ]
  },
  {
    id: 'bnb',
    name: 'BNB',
    fullName: 'BNB',
    networks: [
      { id: 'bsc', name: 'BNB', explorer: 'https://bscscan.com/tx/', type: 'evm', decimals: 18, symbol: 'BNB' }
    ]
  },
  {
    id: 'sol',
    name: 'SOL',
    fullName: 'Solana',
    networks: [
      { id: 'sol', name: 'SOL', explorer: 'https://solscan.io/tx/', type: 'solana' }
    ]
  },
  {
    id: 'trx',
    name: 'TRX',
    fullName: 'Tron',
    networks: [
      { id: 'trx', name: 'TRX', explorer: 'https://tronscan.org/#/transaction/', type: 'tron' }
    ]
  },
  {
    id: 'ton',
    name: 'TON',
    fullName: 'Toncoin',
    networks: [
      { id: 'ton', name: 'TON', explorer: 'https://tonscan.org/tx/', type: 'ton' }
    ]
  },
  {
    id: 'ltc',
    name: 'LTC',
    fullName: 'Litecoin',
    networks: [
      { id: 'ltc', name: 'LTC', explorer: 'https://blockchair.com/litecoin/transaction/', type: 'utxo' }
    ]
  },
  {
    id: 'doge',
    name: 'DOGE',
    fullName: 'Dogecoin',
    networks: [
      { id: 'doge', name: 'DOGE', explorer: 'https://blockchair.com/dogecoin/transaction/', type: 'utxo' }
    ]
  },
  {
    id: 'xrp',
    name: 'XRP',
    fullName: 'XRP',
    networks: [
      { id: 'xrp', name: 'XRP', explorer: 'https://xrpscan.com/tx/', type: 'xrp' }
    ]
  },
  {
    id: 'dai',
    name: 'DAI',
    fullName: 'Dai',
    networks: [
      { id: 'erc20', name: 'DAI (ERC20)', explorer: 'https://etherscan.io/tx/', type: 'evm', decimals: 18, symbol: 'DAI' }
    ]
  },
];

// Helper to fetch EVM transaction via serverless API (avoids CORS)
async function fetchEvmTransaction(txHash, networkId) {
  try {
    const response = await fetch(`/api/check-tx?txHash=${txHash}&network=${networkId}`);
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (err) {
    console.error('EVM fetch error:', err);
    return null;
  }
}

export default function App() {
  const [selectedCoin, setSelectedCoin] = useState('btc');
  const [selectedNetwork, setSelectedNetwork] = useState('btc');
  const [txid, setTxid] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const coin = COINS.find(c => c.id === selectedCoin);
  const network = coin?.networks.find(n => n.id === selectedNetwork) || coin?.networks[0];
  const explorerUrl = network && txid ? `${network.explorer}${txid}` : '';
  const hasMultipleNetworks = coin?.networks.length > 1;

  const handleCoinChange = (coinId) => {
    setSelectedCoin(coinId);
    const newCoin = COINS.find(c => c.id === coinId);
    setSelectedNetwork(newCoin?.networks[0]?.id || '');
    setStatus(null);
  };

  const copyToClipboard = async (text, type) => {
    await navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const checkTransaction = async () => {
    if (!txid.trim()) return;

    setLoading(true);
    setStatus(null);

    // For BTC we can fetch from mempool.space API
    if (network?.type === 'btc' && network?.api) {
      try {
        const response = await fetch(`${network.api}${txid}`);
        if (response.ok) {
          const data = await response.json();
          const confirmed = data.status?.confirmed;
          const blockHeight = data.status?.block_height;
          const confirmations = blockHeight ? 'Confirmed in block ' + blockHeight : null;

          setStatus({
            found: true,
            confirmed: confirmed,
            success: confirmed,
            confirmations: confirmations,
            fee: data.fee,
            size: data.size,
            networkType: 'btc',
          });
        } else if (response.status === 404) {
          setStatus({ found: false, error: 'Transaction not found on blockchain' });
        } else {
          setStatus({ found: null, error: 'API error - check explorer manually' });
        }
      } catch (err) {
        setStatus({ found: null, error: 'Failed to fetch - check explorer manually' });
      }
    } else if (network?.type === 'evm') {
      // EVM chains (ETH, BSC, etc.)
      try {
        const result = await fetchEvmTransaction(txid, network.id);
        if (result === null) {
          setStatus({ found: null, error: 'API error - check explorer manually' });
        } else if (!result.found) {
          setStatus({ found: false, error: 'Transaction not found on blockchain' });
        } else {
          setStatus({
            found: true,
            confirmed: result.confirmed,
            success: result.success,
            from: result.from,
            to: result.to,
            value: result.value,
            blockNumber: result.blockNumber,
            symbol: network.symbol || 'ETH',
            networkType: 'evm',
          });
        }
      } catch (err) {
        setStatus({ found: null, error: 'Failed to fetch - check explorer manually' });
      }
    } else {
      // For other networks, just provide the link
      setStatus({ found: null, message: 'Open explorer to check status' });
    }

    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') checkTransaction();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Transaction Checker</h1>
          <p className="text-zinc-400 text-sm">Verify crypto deposit status via blockchain explorer</p>
        </div>

        <div className="bg-zinc-900 rounded-xl p-6 space-y-5">
          {/* Coin Selector */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Currency</label>
            <div className="relative">
              <select
                value={selectedCoin}
                onChange={(e) => handleCoinChange(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent cursor-pointer"
              >
                {COINS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} - {c.fullName}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={18} />
            </div>
          </div>

          {/* Network Selector (only if multiple networks) */}
          {hasMultipleNetworks && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Select Network</label>
              <div className="relative">
                <select
                  value={selectedNetwork}
                  onChange={(e) => { setSelectedNetwork(e.target.value); setStatus(null); }}
                  className="w-full bg-zinc-800 border-2 border-emerald-500 rounded-lg px-4 py-3 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {coin?.networks.map((n) => (
                    <option key={n.id} value={n.id}>{n.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={18} />
              </div>
            </div>
          )}

          {/* TXID Input */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Transaction ID (TXID)</label>
            <div className="relative">
              <input
                type="text"
                value={txid}
                onChange={(e) => setTxid(e.target.value.trim())}
                onKeyPress={handleKeyPress}
                placeholder="Paste transaction hash here..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 pr-12 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-zinc-600"
              />
              {txid && (
                <button
                  onClick={() => copyToClipboard(txid, 'txid')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                >
                  {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={checkTransaction}
              disabled={!txid.trim() || loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Search size={18} />
              )}
              Check Status
            </button>
            
            <a
              href={txid ? explorerUrl : '#'}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex-1 border font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                txid 
                  ? 'border-zinc-600 text-white hover:bg-zinc-800' 
                  : 'border-zinc-700 text-zinc-500 pointer-events-none'
              }`}
            >
              <ExternalLink size={18} />
              Open Explorer
            </a>
          </div>

          {/* Explorer URL Copy */}
          {txid && explorerUrl && (
            <div className="bg-zinc-800 rounded-lg p-3 flex items-center gap-3">
              <span className="text-zinc-500 text-xs flex-shrink-0">Explorer URL:</span>
              <span className="text-zinc-300 text-xs font-mono truncate flex-1">{explorerUrl}</span>
              <button
                onClick={() => copyToClipboard(explorerUrl, 'url')}
                className="text-zinc-400 hover:text-white transition-colors flex-shrink-0"
              >
                {copiedUrl ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
              </button>
            </div>
          )}

          {/* Status Display */}
          {status && (
            <div className={`rounded-lg p-4 ${
              status.found === true 
                ? status.confirmed 
                  ? 'bg-emerald-500/10 border border-emerald-500/30' 
                  : 'bg-yellow-500/10 border border-yellow-500/30'
                : status.found === false
                  ? 'bg-red-500/10 border border-red-500/30'
                  : 'bg-zinc-800 border border-zinc-700'
            }`}>
              <div className="flex items-start gap-3">
                {status.found === true ? (
                  status.confirmed ? (
                    <CheckCircle className="text-emerald-400 mt-0.5" size={20} />
                  ) : (
                    <Clock className="text-yellow-400 mt-0.5" size={20} />
                  )
                ) : status.found === false ? (
                  <XCircle className="text-red-400 mt-0.5" size={20} />
                ) : (
                  <ExternalLink className="text-zinc-400 mt-0.5" size={20} />
                )}
                
                <div className="flex-1">
                  {status.found === true && (
                    <>
                      {/* Status Line */}
                      <div className="flex items-center gap-2">
                        <p className={`font-medium ${
                          status.confirmed
                            ? status.success !== false ? 'text-emerald-400' : 'text-red-400'
                            : 'text-yellow-400'
                        }`}>
                          {!status.confirmed
                            ? 'Pending / Unconfirmed'
                            : status.success !== false
                              ? 'Success ✓'
                              : 'Failed ✗'}
                        </p>
                      </div>

                      {/* BTC specific info */}
                      {status.confirmations && (
                        <p className="text-sm text-zinc-400 mt-1">{status.confirmations}</p>
                      )}
                      {status.fee && (
                        <p className="text-sm text-zinc-400">Fee: {status.fee.toLocaleString()} sats</p>
                      )}

                      {/* EVM specific info - From/To/Value */}
                      {status.networkType === 'evm' && (
                        <div className="mt-2 space-y-1.5">
                          {status.blockNumber && (
                            <p className="text-sm text-zinc-400">Block: {status.blockNumber.toLocaleString()}</p>
                          )}
                          {status.from && (
                            <div className="text-sm">
                              <span className="text-zinc-500">From: </span>
                              <span className="text-zinc-300 font-mono text-xs">{status.from}</span>
                            </div>
                          )}
                          {status.to && (
                            <div className="text-sm">
                              <span className="text-zinc-500">To: </span>
                              <span className="text-zinc-300 font-mono text-xs">{status.to}</span>
                            </div>
                          )}
                          {status.value !== undefined && status.value > 0 && (
                            <div className="text-sm">
                              <span className="text-zinc-500">Value: </span>
                              <span className="text-zinc-300">{status.value.toFixed(6)} {status.symbol}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {status.confirmed && (
                        <div className="mt-3 pt-3 border-t border-zinc-700">
                          <p className="text-sm text-amber-400 font-medium">⚠️ Next Step:</p>
                          <p className="text-sm text-zinc-300 mt-1">Transaction confirmed on blockchain. Check the user's transaction page in Admin Panel to verify deposit was credited.</p>
                        </div>
                      )}
                    </>
                  )}
                  
                  {status.found === false && (
                    <>
                      <p className="text-red-400 font-medium">{status.error}</p>
                      <p className="text-sm text-zinc-500 mt-1">Double-check the TXID and selected network</p>
                    </>
                  )}
                  
                  {status.found === null && (
                    <>
                      <p className="text-zinc-300">{status.message || status.error}</p>
                      <p className="text-sm text-zinc-500 mt-1">Click "Open Explorer" to view full transaction details</p>
                      {status.message && (
                        <div className="mt-3 pt-3 border-t border-zinc-700">
                          <p className="text-sm text-amber-400 font-medium">⚠️ Reminder:</p>
                          <p className="text-sm text-zinc-300 mt-1">After confirming on explorer, check the user's transaction page in Admin Panel to verify deposit was credited.</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Reference */}
        <div className="mt-6 bg-zinc-900/50 rounded-xl p-5">
          <h3 className="text-sm font-medium text-zinc-400 mb-3">Quick Reference</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-400" />
              <span className="text-zinc-300">Confirmed = Deposit OK</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-yellow-400" />
              <span className="text-zinc-300">Pending = Wait for confirms</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle size={14} className="text-red-400" />
              <span className="text-zinc-300">Not found = Wrong TXID/network</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">💡</span>
              <span className="text-zinc-300">Check network matches deposit</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
