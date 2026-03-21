const fs = require('fs');
const file = 'public/furnitures/furniture-list.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

data.furnitures.forEach(f => {
  if (f.embedding) {
    f.keyword = f.embedding;
    delete f.embedding;
  }
});

let str = JSON.stringify(data, null, 4);

// Collapse arrays of numbers
str = str.replace(/\[\s+([-.\d,\s]+?)\s+\]/g, (match, p1) => {
    return '[' + p1.replace(/\s+/g, ' ') + ']';
});

fs.writeFileSync(file, str);
console.log("Done");
