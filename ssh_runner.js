const { spawn } = require('child_process');
const fs = require('fs');
const p = spawn('ssh', ['-o', 'StrictHostKeyChecking=accept-new', '-R', '80:localhost:3000', 'nokey@localhost.run']);
p.stdout.on('data', d => { let s = d.toString(); console.log(s); let m = s.match(/([a-zA-Z0-9-]+\.lhr\.life)/); if (m) { fs.writeFileSync('lhr.txt', m[1]); } });
p.stderr.on('data', d => { let s = d.toString(); console.log(s); let m = s.match(/([a-zA-Z0-9-]+\.lhr\.life)/); if (m) { fs.writeFileSync('lhr.txt', m[1]); } });
