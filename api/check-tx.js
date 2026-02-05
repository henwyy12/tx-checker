// Vercel serverless function to fetch EVM transaction data
// This avoids CORS issues with public RPC endpoints

const EVM_RPC = {
  eth: 'https://eth.llamarpc.com',
  bsc: 'https://bsc-dataseed.binance.org',
  bep20: 'https://bsc-dataseed.binance.org',
  erc20: 'https://eth.llamarpc.com',
};

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { txHash, network } = req.query;

  if (!txHash || !network) {
    return res.status(400).json({ error: 'Missing txHash or network parameter' });
  }

  const rpcUrl = EVM_RPC[network];
  if (!rpcUrl) {
    return res.status(400).json({ error: 'Unsupported network' });
  }

  try {
    // Fetch transaction details
    const txResponse = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionByHash',
        params: [txHash],
        id: 1,
      }),
    });
    const txData = await txResponse.json();

    if (!txData.result) {
      return res.status(200).json({ found: false });
    }

    // Fetch receipt for status
    const receiptResponse = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionReceipt',
        params: [txHash],
        id: 2,
      }),
    });
    const receiptData = await receiptResponse.json();

    const tx = txData.result;
    const receipt = receiptData.result;

    // Convert value from hex to decimal (wei to eth)
    const valueWei = BigInt(tx.value || '0x0');
    const valueEth = Number(valueWei) / 1e18;

    return res.status(200).json({
      found: true,
      confirmed: receipt !== null,
      success: receipt ? receipt.status === '0x1' : null,
      from: tx.from,
      to: tx.to,
      value: valueEth,
      blockNumber: receipt ? parseInt(receipt.blockNumber, 16) : null,
      gasUsed: receipt ? parseInt(receipt.gasUsed, 16) : null,
    });
  } catch (err) {
    console.error('RPC fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch transaction data' });
  }
}
