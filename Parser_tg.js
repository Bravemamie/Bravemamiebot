const fetch = require('node-fetch');
const WebSocket = require('ws');

const TG_TOKEN = '9145911447:AAE0hK-_ffB5BuJpGdqJC22wTp_EDWZz6HQ';
const TG_CHAT_ID = '5215924562';
const RPC_URL = 'https://mainnet.helius-rpc.com/?api-key=97b4a5b1-62a1-4ce9-a4f6-cb077401b168';
const ws = new WebSocket('wss://mainnet.helius-rpc.com/?api-key=97b4a5b1-62a1-4ce9-a4f6-cb077401b168');

async function sendTG(mint) {
    const text = 'New Pump Token!\n\nMint: ' + mint + '\n\nChart: https://dexscreener.com/solana/' + mint;
    await fetch('https://api.telegram.org/bot' + TG_TOKEN + '/sendMessage?chat_id=' + TG_CHAT_ID + '&text=' + encodeURIComponent(text));
}

ws.on('open', () => {
    console.log('✅ Connected! Sending alerts to Telegram...');
    ws.send(JSON.stringify({jsonrpc:'2.0',id:1,method:'logsSubscribe',params:[{mentions:['6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P']},{commitment:'confirmed'}]}));
});

ws.on('message', async (data) => {
    const msg = JSON.parse(data);
    if (msg.method === 'logsNotification') {
        const logs = msg.params.result.value.logs;
        if (logs.some(l => l.includes('Instruction: Create'))) {
            const sig = msg.params.result.value.signature;
            try {
                const response = await fetch(RPC_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        id: 1,
                        method: 'getTransaction',
                        params: [sig, { maxSupportedTransactionVersion: 0, encoding: 'jsonParsed' }]
                    })
                });
                const txData = await response.json();
                if (txData.result && txData.result.meta && txData.result.meta.postTokenBalances && txData.result.meta.postTokenBalances.length > 0) {
                    const mint = txData.result.meta.postTokenBalances[0].mint;
                    console.log('🎯 Sent to Telegram:', mint);
                    await sendTG(mint);
                }
            } catch (err) {
                console.log('Error fetching tx:', err.message);
            }
        }
    }
});

ws.on('error', (e) => console.log('ERROR:', e.message));
