const { spawn } = require('child_process');
const fs = require('fs');

const cf = spawn('npx.cmd', ['-y', 'cloudflared', 'tunnel', '--url', 'http://localhost:3000'], { stdio: ['ignore', 'pipe', 'pipe'] });

cf.stderr.on('data', (data) => {
    const text = data.toString();
    console.log(text);
    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
    if (match) {
        fs.writeFileSync('cloudflare_url.txt', match[0]);
        console.log("FOUND URL: " + match[0]);
    }
});

cf.stdout.on('data', (data) => {
    console.log(data.toString());
});
