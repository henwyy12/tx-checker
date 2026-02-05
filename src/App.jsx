import React, { useState, useEffect } from 'react';
import { Search, ExternalLink, CheckCircle, XCircle, Clock, Copy, Check, Loader2, ChevronDown, AlertTriangle } from 'lucide-react';

// CoinGecko IDs for price fetching
const COINGECKO_IDS = {
  btc: 'bitcoin',
  eth: 'ethereum',
  usdt: 'tether',
  usdc: 'usd-coin',
  bnb: 'binancecoin',
  sol: 'solana',
  trx: 'tron',
  ton: 'the-open-network',
  ltc: 'litecoin',
  doge: 'dogecoin',
  xrp: 'ripple',
  dai: 'dai',
};

// Rizzy supported coins and their networks
const COINS = [
  {
    id: 'btc',
    name: 'BTC',
    fullName: 'Bitcoin',
    networks: [
      { id: 'btc', name: 'BTC', explorer: 'https://www.blockchain.com/btc/tx/', type: 'btc' }
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

// Truncate address for display
function truncateAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

// Format USD value
function formatUSD(value) {
  if (value === null || value === undefined) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// Address row component with copy
function AddressRow({ label, address, onCopy, copiedField, fieldName }) {
  if (!address) return null;
  return (
    <div className="flex items-center justify-between py-2 border-b border-zinc-700/50 last:border-0">
      <span className="text-zinc-500 text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-zinc-200 font-mono text-sm">{truncateAddress(address)}</span>
        <button
          onClick={() => onCopy(address, fieldName)}
          className="text-zinc-500 hover:text-white transition-colors p-1"
          title="Copy full address"
        >
          {copiedField === fieldName ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}

// Info row component
function InfoRow({ label, value, subValue, highlight }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="flex items-center justify-between py-2 border-b border-zinc-700/50 last:border-0">
      <span className="text-zinc-500 text-sm">{label}</span>
      <div className="text-right">
        <span className={`text-sm ${highlight ? 'text-emerald-400 font-semibold' : 'text-zinc-200'}`}>{value}</span>
        {subValue && <span className="text-zinc-500 text-sm ml-2">({subValue})</span>}
      </div>
    </div>
  );
}

export default function App() {
  const [selectedCoin, setSelectedCoin] = useState('btc');
  const [selectedNetwork, setSelectedNetwork] = useState('btc');
  const [txid, setTxid] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [prices, setPrices] = useState({});

  const coin = COINS.find(c => c.id === selectedCoin);
  const network = coin?.networks.find(n => n.id === selectedNetwork) || coin?.networks[0];
  const explorerUrl = network && txid ? `${network.explorer}${txid}` : '';
  const hasMultipleNetworks = coin?.networks.length > 1;

  // Fetch prices on mount
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const ids = Object.values(COINGECKO_IDS).join(',');
        const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
        if (response.ok) {
          const data = await response.json();
          const priceMap = {};
          Object.entries(COINGECKO_IDS).forEach(([symbol, geckoId]) => {
            if (data[geckoId]) {
              priceMap[symbol] = data[geckoId].usd;
            }
          });
          setPrices(priceMap);
        }
      } catch (err) {
        console.error('Failed to fetch prices:', err);
      }
    };
    fetchPrices();
    // Refresh prices every 60 seconds
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, []);

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
    } else if (type === 'txid') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setCopiedField(type);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const checkTransaction = async () => {
    if (!txid.trim()) return;

    setLoading(true);
    setStatus(null);

    // Determine which network ID to send to API
    const networkId = network?.id || selectedCoin;
    const networkType = network?.type || selectedCoin;

    try {
      const response = await fetch(`/api/check-tx?txHash=${txid}&network=${networkId}`);

      if (!response.ok) {
        setStatus({ found: null, error: 'API error - check explorer manually' });
        setLoading(false);
        return;
      }

      const result = await response.json();

      if (result.error) {
        setStatus({ found: null, error: result.error + ' - check explorer manually' });
        setLoading(false);
        return;
      }

      if (!result.found) {
        setStatus({ found: false, error: 'Transaction not found on blockchain' });
        setLoading(false);
        return;
      }

      // Build status object based on network type
      const statusObj = {
        found: true,
        confirmed: result.confirmed,
        success: result.success,
        networkType: result.networkType || networkType,
      };

      // Add block info
      if (result.blockHeight) statusObj.blockHeight = result.blockHeight;
      if (result.blockNumber) statusObj.blockNumber = result.blockNumber;

      // Add address info
      if (result.from) statusObj.from = result.from;
      if (result.to) statusObj.to = result.to;

      // Add value info
      if (result.value !== undefined && result.value !== null) {
        statusObj.value = result.value;
      }

      // Add fee info
      if (result.fee) statusObj.fee = result.fee;

      // Add symbol for display
      statusObj.symbol = network?.symbol || coin?.name || selectedCoin.toUpperCase();

      setStatus(statusObj);

    } catch (err) {
      console.error('Check transaction error:', err);
      setStatus({ found: null, error: 'Failed to fetch - check explorer manually' });
    }

    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') checkTransaction();
  };

  // Calculate USD value
  const getUsdValue = () => {
    if (!status?.value || !prices[selectedCoin]) return null;
    return status.value * prices[selectedCoin];
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 sm:p-6">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold mb-1">Transaction Checker</h1>
          <p className="text-zinc-500 text-sm">Verify crypto deposit status</p>
        </div>

        <div className="bg-zinc-900 rounded-xl p-5 space-y-4">
          {/* Coin Selector */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wide">Currency</label>
            <div className="relative">
              <select
                value={selectedCoin}
                onChange={(e) => handleCoinChange(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent cursor-pointer text-sm"
              >
                {COINS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} - {c.fullName}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
            </div>
          </div>

          {/* Network Selector */}
          {hasMultipleNetworks && (
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wide">Network</label>
              <div className="relative">
                <select
                  value={selectedNetwork}
                  onChange={(e) => { setSelectedNetwork(e.target.value); setStatus(null); }}
                  className="w-full bg-zinc-800 border-2 border-emerald-500/50 rounded-lg px-3 py-2.5 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer text-sm"
                >
                  {coin?.networks.map((n) => (
                    <option key={n.id} value={n.id}>{n.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
              </div>
            </div>
          )}

          {/* TXID Input */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wide">Transaction ID</label>
            <div className="relative">
              <input
                type="text"
                value={txid}
                onChange={(e) => setTxid(e.target.value.trim())}
                onKeyPress={handleKeyPress}
                placeholder="Paste TXID here..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 pr-10 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-zinc-600"
              />
              {txid && (
                <button
                  onClick={() => copyToClipboard(txid, 'txid')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                >
                  {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={checkTransaction}
              disabled={!txid.trim() || loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Check Status
            </button>

            <a
              href={txid ? explorerUrl : '#'}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex-1 border font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm ${
                txid
                  ? 'border-zinc-600 text-white hover:bg-zinc-800'
                  : 'border-zinc-700 text-zinc-600 pointer-events-none'
              }`}
            >
              <ExternalLink size={16} />
              Explorer
            </a>
          </div>
        </div>

        {/* Status Display */}
        {status && (
          <div className="mt-4">
            {/* Found Transaction */}
            {status.found === true && (
              <div className="bg-zinc-900 rounded-xl overflow-hidden">
                {/* Status Header */}
                <div className={`px-5 py-4 flex items-center gap-3 ${
                  status.confirmed
                    ? status.success !== false ? 'bg-emerald-500/10' : 'bg-red-500/10'
                    : 'bg-yellow-500/10'
                }`}>
                  {status.confirmed ? (
                    status.success !== false ? (
                      <CheckCircle className="text-emerald-400" size={24} />
                    ) : (
                      <XCircle className="text-red-400" size={24} />
                    )
                  ) : (
                    <Clock className="text-yellow-400" size={24} />
                  )}
                  <div>
                    <p className={`font-semibold text-lg ${
                      status.confirmed
                        ? status.success !== false ? 'text-emerald-400' : 'text-red-400'
                        : 'text-yellow-400'
                    }`}>
                      {!status.confirmed
                        ? 'Pending'
                        : status.success !== false
                          ? 'Confirmed'
                          : 'Failed'}
                    </p>
                    <p className="text-zinc-500 text-sm">
                      {!status.confirmed
                        ? 'Waiting for block confirmation'
                        : status.success !== false
                          ? 'Transaction successful on blockchain'
                          : 'Transaction failed on blockchain'}
                    </p>
                  </div>
                </div>

                {/* Transaction Details */}
                <div className="px-5 py-3">
                  {/* Block Info */}
                  {(status.blockHeight || status.blockNumber) && (
                    <InfoRow
                      label="Block"
                      value={(status.blockHeight || status.blockNumber).toLocaleString()}
                    />
                  )}

                  {/* Fee info for BTC/LTC/DOGE */}
                  {status.fee && (
                    <InfoRow label="Fee" value={`${status.fee.toLocaleString()} sats`} />
                  )}

                  {/* From/To addresses (all networks that have them) */}
                  {status.from && (
                    <AddressRow
                      label="From"
                      address={status.from}
                      onCopy={copyToClipboard}
                      copiedField={copiedField}
                      fieldName="from"
                    />
                  )}
                  {status.to && (
                    <AddressRow
                      label="To"
                      address={status.to}
                      onCopy={copyToClipboard}
                      copiedField={copiedField}
                      fieldName="to"
                    />
                  )}
                  {status.value !== undefined && status.value > 0 && (
                    <InfoRow
                      label="Value"
                      value={`${status.value.toFixed(6)} ${status.symbol}`}
                      subValue={formatUSD(getUsdValue())}
                      highlight
                    />
                  )}
                </div>

                {/* Next Step Warning */}
                {status.confirmed && (
                  <div className="px-5 py-4 bg-amber-500/10 border-t border-amber-500/20">
                    <div className="flex gap-3">
                      <AlertTriangle className="text-amber-400 flex-shrink-0 mt-0.5" size={18} />
                      <div>
                        <p className="text-amber-400 font-medium text-sm">Next Step</p>
                        <p className="text-zinc-400 text-sm mt-0.5">
                          Blockchain confirmed. Now check <span className="text-white">Admin Panel → User Transactions</span> to verify deposit was credited.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Not Found */}
            {status.found === false && (
              <div className="bg-zinc-900 rounded-xl overflow-hidden">
                <div className="px-5 py-4 bg-red-500/10 flex items-center gap-3">
                  <XCircle className="text-red-400" size={24} />
                  <div>
                    <p className="font-semibold text-lg text-red-400">Not Found</p>
                    <p className="text-zinc-500 text-sm">Transaction doesn't exist on this network</p>
                  </div>
                </div>
                <div className="px-5 py-4">
                  <p className="text-zinc-400 text-sm">
                    Double-check the TXID is correct and the selected network matches where the user sent from.
                  </p>
                </div>
              </div>
            )}

            {/* Manual Check Required */}
            {status.found === null && (
              <div className="bg-zinc-900 rounded-xl overflow-hidden">
                <div className="px-5 py-4 bg-zinc-800 flex items-center gap-3">
                  <ExternalLink className="text-zinc-400" size={24} />
                  <div>
                    <p className="font-semibold text-lg text-zinc-300">{status.message || 'Check Explorer'}</p>
                    <p className="text-zinc-500 text-sm">{status.error || 'Click "Explorer" button to verify manually'}</p>
                  </div>
                </div>
                {status.message && (
                  <div className="px-5 py-4 bg-amber-500/10 border-t border-amber-500/20">
                    <div className="flex gap-3">
                      <AlertTriangle className="text-amber-400 flex-shrink-0 mt-0.5" size={18} />
                      <div>
                        <p className="text-amber-400 font-medium text-sm">Reminder</p>
                        <p className="text-zinc-400 text-sm mt-0.5">
                          After confirming on explorer, check <span className="text-white">Admin Panel → User Transactions</span> to verify deposit.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Quick Reference */}
        <div className="mt-4 bg-zinc-900/50 rounded-xl p-4">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle size={12} className="text-emerald-400" />
              <span className="text-zinc-400">Confirmed = On blockchain</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={12} className="text-yellow-400" />
              <span className="text-zinc-400">Pending = Wait for confirms</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle size={12} className="text-red-400" />
              <span className="text-zinc-400">Not found = Wrong TXID/network</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle size={12} className="text-amber-400" />
              <span className="text-zinc-400">Always check Admin Panel</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
