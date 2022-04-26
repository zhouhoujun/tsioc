
import * as http2 from 'http2';
import * as fs from 'fs';

const server = http2.createServer({
  // key: fs.readFileSync('localhost-privkey.pem'),
  // cert: fs.readFileSync('localhost-cert.pem')
});
server.on('error', (err) => console.error(err));

server.on('stream', (stream, headers) => {
  // stream is a Duplex
  stream.respond({
    'content-type': 'text/html; charset=utf-8',
    ':status': 200
  });
  stream.end('<h1>Hello World</h1>');
});

server.listen(3000);