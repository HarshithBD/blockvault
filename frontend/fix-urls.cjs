const fs = require('fs');
const path = require('path');
const dirs = ['./src/pages', './src/components'];

const searchSingleQuote = "'http://localhost:3000/api/";
const replaceSingleQuote = "(import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/";

const searchBacktick = "`http://localhost:3000/api/";
const replaceBacktick = "`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/";

for (const dir of dirs) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file.endsWith('.jsx')) {
      const fullPath = path.join(dir, file);
      let content = fs.readFileSync(fullPath, 'utf8');
      
      let modified = content.split(searchSingleQuote).join(replaceSingleQuote);
      modified = modified.split(searchBacktick).join(replaceBacktick);

      if (content !== modified) {
        fs.writeFileSync(fullPath, modified);
        console.log('Fixed', fullPath);
      }
    }
  }
}
