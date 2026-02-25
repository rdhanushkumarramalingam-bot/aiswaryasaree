const fs = require('fs');
const cp = require('child_process');

const content = fs.readFileSync('.env.local', 'utf-8');
const lines = content.split('\n');

for (const line of lines) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const splitIndex = line.indexOf('=');
    const key = line.slice(0, splitIndex).trim();
    const value = line.slice(splitIndex + 1).trim().replace(/^['"]|['"]$/g, '');

    if (key && value) {
        console.log(`Setting ${key}...`);
        try {
            cp.execSync(`npx vercel env add ${key} production preview development --force`, { input: value, stdio: ['pipe', 'inherit', 'inherit'] });
            console.log(`Success: ${key}`);
        } catch (e) {
            console.error(`Error setting ${key}: ${e.message}`);
        }
    }
}
console.log('All variables configured in Vercel. You must trigger a new deploy to apply them.');
