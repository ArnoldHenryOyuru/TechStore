const express = require('express');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const ROOT_DIR = __dirname;

// Block access to internal config/source files
app.use((req, res, next) => {
  const blocked = ['/server.js', '/build.js', '/package.json', '/package-lock.json', '/metadata.json', '/.env', '/.env.example', '/.gitignore'];
  if (blocked.includes(req.path) || req.path.startsWith('/.')) {
    return res.status(404).send('Not found');
  }
  next();
});

app.use(express.static(ROOT_DIR, {
  extensions: ['html'],
  index: 'index.html',
}));

app.use((req, res) => {
  res.status(404).sendFile(path.join(ROOT_DIR, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`TechStore server running at http://${HOST}:${PORT}`);
});
