const localtunnel = require('localtunnel');

async function startTunnel() {
  try {
    const tunnel = await localtunnel({
      port: 5000,
      subdomain: 'prime-attendance-2380601731',
    });
    console.log('PUBLIC_TUNNEL_ONLINE:', tunnel.url);

    tunnel.on('close', () => {
      console.log('Tunnel closed. Reconnecting in 3 seconds...');
      setTimeout(startTunnel, 3000);
    });

    tunnel.on('error', (err) => {
      console.error('Tunnel error:', err);
      try {
        tunnel.close();
      } catch (_) {}
    });
  } catch (err) {
    console.error('Failed to start tunnel:', err.message);
    setTimeout(startTunnel, 3000);
  }
}

startTunnel();
