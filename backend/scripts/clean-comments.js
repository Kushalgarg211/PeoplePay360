const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (!filePath.includes('node_modules') && !filePath.includes('.git') && !filePath.includes('dist')) {
        results = results.concat(walk(filePath));
      }
    } else {
      if (filePath.endsWith('.ts') || filePath.endsWith('.sql') || filePath.endsWith('.prisma') || filePath.endsWith('.js')) {
        results.push(filePath);
      }
    }
  });
  return results;
}

const files = walk('c:/PeoplePay360/backend');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace: // Some Text or // Some Text
  content = content.replace(/\/\/\s*[─=]+\s*(.*?)\s*[─=]+/g, (match, p1) => {
    if (p1.trim() === '') return ''; 
    return `// ${p1.trim()}`;
  });
  
  // Replace standalone // or //
  content = content.replace(/\/\/\s*[─=]{4,}/g, '');

  // Replace SQL: -- Some Text
  content = content.replace(/--\s*[─=]+\s*(.*?)\s*[─=]+/g, (match, p1) => {
    if (p1.trim() === '') return '';
    return `-- ${p1.trim()}`;
  });
  
  // Replace standalone -- content content.replace(/--\s*[─=]{4,}/g, '');

  // Replace JSDoc block comments // ... with a simple 1 line comment
  content = content.replace(/\/\*\*([\s\S]*?)\*\//g, (match, p1) => {
    let text = p1.replace(/\*/g, '').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
    return `// ${text}`;
  });
  
  // Remove empty comments like // 
  content = content.replace(/^\s*\/\/\s*$/gm, '');

  // Remove triple or more empty lines
  content = content.replace(/\n{3,}/g, '\n\n');

  fs.writeFileSync(file, content, 'utf8');
}
console.log(`Cleaned up comments in ${files.length} files.`);