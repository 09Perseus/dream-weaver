const fs = require('fs');
const filepath = './public/furnitures/furniture-list.json';
const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));

for (const item of data.furnitures) {
    if (item.embedding) {
        item.keyword = item.embedding;
        delete item.embedding;
    }
}

let jsonStr = JSON.stringify(data, (key, value) => {
    if (key === 'keyword' && Array.isArray(value)) {
        return `__ARRAY_START__[${value.join(', ')}]__ARRAY_END__`;
    }
    return value;
}, 2);

jsonStr = jsonStr.replace(/"__ARRAY_START__\[(.*?)\]__ARRAY_END__"/g, "[$1]");

fs.writeFileSync(filepath, jsonStr, 'utf8');
console.log('Done refactoring furniture-list.json');
