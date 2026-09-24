import fs from 'fs';
import readline from 'readline';

const fileStream = fs.createReadStream('C:/Users/yashk/.gemini/antigravity-ide/brain/7c748938-4275-4128-945d-9aa9a170b8b7/.system_generated/logs/transcript.jsonl');
const rl = readline.createInterface({ input: fileStream });

const inputs = [];
rl.on('line', (line) => {
  if (line.includes('"type":"USER_INPUT"')) {
    try {
      const obj = JSON.parse(line);
      inputs.push(obj.content);
    } catch (e) {}
  }
});

rl.on('close', () => {
  console.log('--- RECENT 20 USER INPUTS ---');
  inputs.slice(-20).forEach((inp, idx) => {
    console.log(`[${idx + 1}] ${inp.replace(/\n/g, ' ').slice(0, 160)}`);
  });
});
