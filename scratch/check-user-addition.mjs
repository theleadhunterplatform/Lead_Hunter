import fs from 'fs';
import readline from 'readline';

const fileStream = fs.createReadStream('C:/Users/yashk/.gemini/antigravity-ide/brain/7c748938-4275-4128-945d-9aa9a170b8b7/.system_generated/logs/transcript.jsonl');
const rl = readline.createInterface({ input: fileStream });

let capture = false;
let count = 0;
rl.on('line', (line) => {
  if (line.includes('what have been donw about the user addition thing')) {
    capture = true;
  }
  if (capture && count < 15) {
    try {
      const obj = JSON.parse(line);
      if (obj.type === 'PLANNER_RESPONSE' && obj.content) {
        console.log('--- AGENT RESPONSE ---');
        console.log(obj.content);
      }
      count++;
    } catch (e) {}
  }
});
