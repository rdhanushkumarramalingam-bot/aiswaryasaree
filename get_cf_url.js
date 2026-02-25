const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');

const cf = spawn(path.join(__dirname, 'cf.exe'), ['tunnel', '--url', 'http://localhost:3000']);

cf.stderr.on('data', (data) => {
    const text = data.toString();
    console.log(text); // output to console to see it

    // look for https://something.trycloudflare.com
    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
    if (match) {
        const url = match[0];
        console.log('FOUND URL:', url);

        let envConf = fs.readFileSync(envPath, 'utf8');
        envConf = envConf.replace(/NEXT_PUBLIC_APP_URL=.*/, `NEXT_PUBLIC_APP_URL=${url}`);
        fs.writeFileSync(envPath, envConf);
        console.log('Successfully updated .env.local with new URL');
        // keep process running or exit? exit to move on. wait, we need it running!
        // if we exit, tunnel closes. so we just let it run.
        // we can write it to cf_final.txt to signal completion.
        fs.writeFileSync(path.join(__dirname, 'cf_final.txt'), url);
    }
});

// Also kill existing cf.exe processes before starting?
// I should do that via powershell first.
