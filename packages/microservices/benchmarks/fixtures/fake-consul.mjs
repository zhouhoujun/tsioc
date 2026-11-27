/**
 * Minimal fake Consul HTTP API used by benchmarks/registry-chaos.ts.
 *
 * Serves a single healthy service instance so the real ConsulServiceDiscovery
 * client can be exercised while the registry process is killed and restarted.
 */
import * as http from 'node:http';

const port = Number(process.env.FAKE_CONSUL_PORT);
const endpoint = process.env.FAKE_CONSUL_ENDPOINT ?? '127.0.0.1:9001';
const serviceName = process.env.FAKE_CONSUL_SERVICE ?? 'chaos-svc';

const [host, rawPort] = endpoint.split(':');
let requests = 0;

const server = http.createServer((request, response) => {
    requests += 1;
    const url = new URL(request.url, 'http://127.0.0.1');
    response.setHeader('content-type', 'application/json');
    if (url.pathname.startsWith('/v1/health/service/')) {
        const name = decodeURIComponent(url.pathname.split('/').pop() ?? serviceName);
        response.end(JSON.stringify([{
            Node: { Address: host },
            Service: {
                ID: `${name}-${rawPort}`,
                Service: name,
                Address: host,
                Port: Number(rawPort),
                Tags: ['chaos'],
                Meta: { protocol: 'http', version: 'v1' }
            },
            Checks: [{ Status: 'passing' }]
        }]));
        return;
    }
    if (url.pathname === '/__stats') {
        response.end(JSON.stringify({ requests, endpoint, service: serviceName }));
        return;
    }
    if (url.pathname.startsWith('/v1/agent/')) {
        response.end('{}');
        return;
    }
    response.statusCode = 404;
    response.end('{}');
});

server.listen(port, '127.0.0.1', () => {
    console.log(`FAKE_CONSUL_READY:${port}`);
});

for (const signal of ['SIGTERM', 'SIGINT']) {
    process.once(signal, () => {
        server.close(() => process.exit(0));
    });
}
