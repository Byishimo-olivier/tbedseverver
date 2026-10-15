const fs = require('fs');
const path = require('path');
const juice = require('juice');

const templatesDir = path.join(__dirname, '..', 'templates');

function walk(dir, cb) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, cb);
    else if (e.isFile() && p.endsWith('.html')) cb(p);
  }
}

walk(templatesDir, (file) => {
  try {
    const html = fs.readFileSync(file, 'utf8');
    // keep a backup
    fs.writeFileSync(file + '.bak', html, 'utf8');
    const inlined = juice(html, { preserveStyleTags: false });
    fs.writeFileSync(file, inlined, 'utf8');
    console.log('Inlined:', file);
  } catch (err) {
    console.error('Failed to process', file, err);
  }
});