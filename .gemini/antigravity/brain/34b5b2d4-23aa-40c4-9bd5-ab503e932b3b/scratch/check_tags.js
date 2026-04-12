const fs = require('fs');
const content = fs.readFileSync('c:/Users/RevayDev/Desktop/Monitores/frontend/src/pages/ModuleForum.jsx', 'utf8');
const lines = content.split('\n');

let openDivs = 0;
let openFrags = 0;

lines.forEach((line, index) => {
  const openingDiv = (line.match(/<div(?![^>]*\/>)/g) || []).length;
  const selfClosingDiv = (line.match(/<div[^>]*\/>/g) || []).length;
  const closingDiv = (line.match(/<\/div>/g) || []).length;
  const openingFrag = (line.match(/<>/g) || []).length;
  const closingFrag = (line.match(/<\/>/g) || []).length;
  
  openDivs += openingDiv - closingDiv;
  openFrags += openingFrag - closingFrag;
  
  if (openDivs < 0 || openFrags < 0) {
    console.log(`Mismatch at line ${index + 1}: Divs=${openDivs}, Frags=${openFrags}`);
  }
});

console.log(`Final check: Divs=${openDivs}, Frags=${openFrags}`);

if (openDivs !== 0) {
  console.log("Dumping state change for divs > 1000:");
  let bal = 0;
  lines.forEach((line, index) => {
    const openingDiv = (line.match(/<div(?![^>]*\/>)/g) || []).length;
    const closingDiv = (line.match(/<\/div>/g) || []).length;
    bal += openingDiv - closingDiv;
    if (index > 1000) {
      console.log(`${index + 1}: [${bal}] ${line.trim()}`);
    }
  });
}

// Final check to see history
let currentDivs = 0;
lines.forEach((line, index) => {
  const openingDiv = (line.match(/<div(?![^>]*\/>)/g) || []).length;
  const closingDiv = (line.match(/<\/div>/g) || []).length;
  currentDivs += openingDiv - closingDiv;
  if (index > 1000) { // Focus on the late part
     // console.log(`Line ${index + 1}: ${currentDivs}`);
  }
});

console.log(`Final check: Divs=${openDivs}, Frags=${openFrags}`);
