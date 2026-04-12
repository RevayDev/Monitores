const fs = require('fs');
const path = require('path');

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let inAsyncFunction = false;
  let nestingLevel = 0;
  
  // Very simplistic check: look for function keywords and async
  // This is just a heuristic to find obvious ones.
  
  const awaitRegex = /\bawait\b/;
  const asyncFuncRegex = /\basync\b.*?\(/;
  const funcRegex = /\bfunction\b|\)\s*=>\s*\{/; // Arrow or traditional
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (awaitRegex.test(line)) {
      // Find the nearest function definition above this line
      let foundAsync = false;
      for (let j = i; j >= 0; j--) {
        const prevLine = lines[j];
        if (prevLine.includes('function') || prevLine.includes('=>')) {
          if (prevLine.includes('async')) {
            foundAsync = true;
          }
          break;
        }
      }
      if (!foundAsync) {
        // Double check if it's actually in a class method or something
        // We'll just print it as a suspect.
        console.log(`Suspect line ${i+1} in ${filePath}: ${line.trim()}`);
      }
    }
  }
}

const backendDir = 'c:/Users/RevayDev/Desktop/Monitores/backend';
const files = [
  'services/engagement.service.js',
  'services/monitorias.service.js',
  'controllers/engagement.controller.js',
  'controllers/monitorias.controller.js',
  'repositories/mysql/monitorias.repository.js',
  'repositories/mysql/engagement.repository.js'
];

files.forEach(f => {
  const p = path.join(backendDir, f);
  if (fs.existsSync(p)) checkFile(p);
});
