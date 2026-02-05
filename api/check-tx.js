// Vercel serverless function to fetch transaction data
// This avoids CORS issues with public APIs

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

  try {
    // Handle BTC via blockchain.info
    if (network === 'btc') {
      const response = await fetch(`https://blockchain.info/rawtx/${txHash}`);
      if (!response.ok) {
        return res.status(200).json({ found: false });
      }
      const data = await response.json();
      const confirmed = data.block_height !== undefined;

      // Extract first input address (sender)
      let from = null;
      if (data.inputs && data.inputs.length > 0 && data.inputs[0].prev_out) {
        from = data.inputs[0].prev_out.addr;
      }

      // Extract outputs (receivers) - get the main one (usually largest non-change)
      let to = null;
      let value = 0;
      if (data.out && data.out.length > 0) {
        // Sum all outputs for total value, get first output address
        for (const out of data.out) {
          value += out.value || 0;
          if (!to && out.addr) {
            to = out.addr;
          }
        }
        // Convert satoshis to BTC
        value = value / 1e8;
      }

      return res.status(200).json({
        found: true,
        confirmed: confirmed,
        success: confirmed,
        blockHeight: data.block_height,
        fee: data.fee,
        size: data.size,
        from: from,
        to: to,
        value: value,
        networkType: 'btc',
      });
    }

    // Handle XRP via XRP Ledger API
    if (network === 'xrp') {
      const response = await fetch('https://s1.ripple.com:51234/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'tx',
          params: [{ transaction: txHash, binary: false }]
        }),
      });

      if (!response.ok) {
        return res.status(200).json({ found: false });
      }

      const data = await response.json();
      if (data.result?.error || !data.result?.validated) {
        if (data.result?.error === 'txnNotFound') {
          return res.status(200).json({ found: false });
        }
      }

      const tx = data.result;
      const confirmed = tx.validated === true;
      const success = tx.meta?.TransactionResult === 'tesSUCCESS';

      // Convert drops to XRP (1 XRP = 1,000,000 drops)
      const amount = tx.Amount ? (typeof tx.Amount === 'string' ? parseInt(tx.Amount) / 1000000 : null) : null;

      return res.status(200).json({
        found: true,
        confirmed: confirmed,
        success: success,
        from: tx.Account,
        to: tx.Destination,
        value: amount,
        blockHeight: tx.ledger_index,
        networkType: 'xrp',
      });
    }

    // Handle Solana via public RPC
    if (network === 'sol') {
      const response = await fetch('https://api.mainnet-beta.solana.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTransaction',
          params: [txHash, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }]
        }),
      });

      if (!response.ok) {
        return res.status(200).json({ found: false });
      }

      const data = await response.json();
      if (!data.result) {
        return res.status(200).json({ found: false });
      }

      const tx = data.result;
      const confirmed = tx.slot !== undefined;
      const success = tx.meta?.err === null;

      // Try to extract transfer info
      let from = null, to = null, value = null;
      const instructions = tx.transaction?.message?.instructions || [];
      for (const ix of instructions) {
        if (ix.parsed?.type === 'transfer' && ix.program === 'system') {
          from = ix.parsed.info.source;
          to = ix.parsed.info.destination;
          value = ix.parsed.info.lamports / 1e9; // Convert lamports to SOL
          break;
        }
      }

      // Fallback to account keys
      if (!from && tx.transaction?.message?.accountKeys?.length > 0) {
        from = tx.transaction.message.accountKeys[0]?.pubkey || tx.transaction.message.accountKeys[0];
      }

      return res.status(200).json({
        found: true,
        confirmed: confirmed,
        success: success,
        from: from,
        to: to,
        value: value,
        blockHeight: tx.slot,
        fee: tx.meta?.fee ? tx.meta.fee / 1e9 : null,
        networkType: 'sol',
      });
    }

    // Handle Tron via TronGrid API
    if (network === 'trx' || network === 'trc20') {
      const response = await fetch(`https://api.trongrid.io/v1/transactions/${txHash}`);

      if (!response.ok) {
        return res.status(200).json({ found: false });
      }

      const data = await response.json();
      if (!data.data || data.data.length === 0) {
        return res.status(200).json({ found: false });
      }

      const tx = data.data[0];
      const confirmed = tx.blockNumber !== undefined;
      const success = tx.ret?.[0]?.contractRet === 'SUCCESS';

      // Extract transfer info
      let from = null, to = null, value = null;
      const contract = tx.raw_data?.contract?.[0];
      if (contract?.type === 'TransferContract') {
        from = contract.parameter?.value?.owner_address;
        to = contract.parameter?.value?.to_address;
        value = contract.parameter?.value?.amount ? contract.parameter.value.amount / 1e6 : null; // Convert sun to TRX
      }

      return res.status(200).json({
        found: true,
        confirmed: confirmed,
        success: success,
        from: from,
        to: to,
        value: value,
        blockHeight: tx.blockNumber,
        networkType: 'trx',
      });
    }

    // Handle TON via TON API
    if (network === 'ton') {
      // TON Center API
      const response = await fetch(`https://toncenter.com/api/v3/transactions?hash=${txHash}&limit=1`);

      if (!response.ok) {
        return res.status(200).json({ found: false });
      }

      const data = await response.json();
      if (!data.transactions || data.transactions.length === 0) {
        return res.status(200).json({ found: false });
      }

      const tx = data.transactions[0];
      const confirmed = true; // If we got it, it's confirmed
      const success = tx.description?.compute_ph?.success !== false;

      return res.status(200).json({
        found: true,
        confirmed: confirmed,
        success: success,
        from: tx.in_msg?.source,
        to: tx.in_msg?.destination,
        value: tx.in_msg?.value ? parseInt(tx.in_msg.value) / 1e9 : null,
        blockHeight: tx.block_ref?.seqno,
        networkType: 'ton',
      });
    }

    // Handle LTC via Blockchair
    if (network === 'ltc') {
      const response = await fetch(`https://api.blockchair.com/litecoin/dashboards/transaction/${txHash}`);

      if (!response.ok) {
        return res.status(200).json({ found: false });
      }

      const data = await response.json();
      if (!data.data || !data.data[txHash]) {
        return res.status(200).json({ found: false });
      }

      const tx = data.data[txHash].transaction;
      const confirmed = tx.block_id !== null && tx.block_id !== -1;

      return res.status(200).json({
        found: true,
        confirmed: confirmed,
        success: confirmed,
        blockHeight: tx.block_id,
        fee: tx.fee,
        value: tx.output_total ? tx.output_total / 1e8 : null,
        networkType: 'ltc',
      });
    }

    // Handle DOGE via Blockchair
    if (network === 'doge') {
      const response = await fetch(`https://api.blockchair.com/dogecoin/dashboards/transaction/${txHash}`);

      if (!response.ok) {
        return res.status(200).json({ found: false });
      }

      const data = await response.json();
      if (!data.data || !data.data[txHash]) {
        return res.status(200).json({ found: false });
      }

      const tx = data.data[txHash].transaction;
      const confirmed = tx.block_id !== null && tx.block_id !== -1;

      return res.status(200).json({
        found: true,
        confirmed: confirmed,
        success: confirmed,
        blockHeight: tx.block_id,
        fee: tx.fee,
        value: tx.output_total ? tx.output_total / 1e8 : null,
        networkType: 'doge',
      });
    }

    // Handle EVM chains
    const rpcUrl = EVM_RPC[network];
    if (rpcUrl) {
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
        networkType: 'evm',
      });
    }

    return res.status(400).json({ error: 'Unsupported network' });

  } catch (err) {
    console.error('Fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch transaction data' });
  }
}
