// A stand-in for a real service: one page, so the walking skeleton has
// something to open. Your own service takes its place.
import { createServer } from 'node:http';

const port = Number(process.env.PORT ?? 5088);
createServer((_, res) => {
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.end('<!doctype html><title>Example</title><h1>Example service</h1>');
}).listen(port, () => console.log(`listening on http://localhost:${port}`));
