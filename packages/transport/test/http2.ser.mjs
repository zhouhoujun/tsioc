// //openssl req -x509 -nodes -newkey rsa:2048 -keyout example.com.key -out example.com.crt
// //openssl req -x509 -newkey rsa:2048 -nodes -sha256 -subj '/CN=localhost' -keyout localhost-privkey.pem -out localhost-cert.pem


// import * as http2 from 'node:http2';
// import * as fs from 'node:fs';


// const server = http2.createSecureServer({
//   key: fs.readFileSync('./localhost-privkey.pem'),
//   cert: fs.readFileSync('./localhost-cert.pem')
// });

// server.on('error', (err) => console.error(err));

// server.on('stream', (stream, headers) => {
//   // stream is a Duplex
//   stream.respond({
//     'content-type': 'text/html; charset=utf-8',
//     ':status': 200
//   });
//   stream.end('<h1>Hello World</h1>');
// });

// server.listen(3000);