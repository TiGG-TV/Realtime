const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const findFreePort = require('find-free-port');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  findFreePort(3000, (err, freePort) => {
    if (err) {
      console.error('Error finding free port:', err);
      process.exit(1);
    }

    createServer((req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    }).listen(freePort, (err) => {
      if (err) throw err;
      console.log(`> Ready on http://localhost:${freePort}`);
    });
  });
});
