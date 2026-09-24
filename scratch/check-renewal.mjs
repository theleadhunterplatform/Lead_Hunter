import fs from 'fs';
import readline from 'readline';

const fileStream = fs.createReadStream('C:/Users/yashk/.gemini/antigravity-ide/brain/7c748938-4275-4128-945d-9aa9a170b8b7/.system_generated/logs/transcript.jsonl');
const rl = readline.createInterface({ input: fileStream });

let capture = false;
let count = 0;
rl.on('line', (line) => {
  if (line.includes('save renewal settings it is not working')) {
    capture = true;
  }
  if (capture && count < 10) {
    try {
      const obj = JSON.parse(line);
      console.log(`[TYPE: ${obj.type}]`);
      if (obj.content) console.log(obj.content.slice(0, 300));
      count++;
    } catch (e) {}
  }
});
