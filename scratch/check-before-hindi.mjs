import fs from 'fs';
import readline from 'readline';

const fileStream = fs.createReadStream('C:/Users/yashk/.gemini/antigravity-ide/brain/7c748938-4275-4128-945d-9aa9a170b8b7/.system_generated/logs/transcript.jsonl');
const rl = readline.createInterface({ input: fileStream });

let buffer = [];
rl.on('line', (line) => {
  if (line.includes('in the msgs in hindi what were they')) {
    console.log('Found "in the msgs in hindi"');
    buffer.slice(-10).forEach((b) => console.log(b));
  }
  try {
    const obj = JSON.parse(line);
    if (obj.content && obj.content.length > 20) {
      buffer.push(`[${obj.type}] ${obj.content.slice(0, 150)}`);
      if (buffer.length > 20) buffer.shift();
    }
  } catch (e) {}
});
