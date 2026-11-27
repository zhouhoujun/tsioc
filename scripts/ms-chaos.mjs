#!/usr/bin/env node
/**
 * Multi-process gateway chaos:
 *   1. start two gateway replicas sharing Redis state
 *   2. make both serve a cached route
 *   3. SIGKILL one replica
 *   4. assert the survivor still serves (cache HIT)
 */
import { spawn } from 'node:child_process';
import * as http from 'node:http';
import * as net from 'node:net';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const tsNode = require.resolve('ts-node/dist/bin.js');
const root = process.cwd();

function freePort() {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            const port = address && typeof address === 'object' ? address.port : 0;
            server.close(error => error ? reject(error) : resolve(port));
        });
    });
}

function get(port, path) {
    return new Promise((resolve, reject) => {
        const req = http.request({ host: '127.0.0.1', port, path, method: 'GET' }, res => {
            let body = '';
            res.setEncoding('utf8');
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode ?? 0, body, headers: res.headers }));
        });
        req.on('error', reject);
        req.end();
    });
}

async function waitReady(port, child) {
    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline) {
        if (child.exitCode != null) {
            throw new Error(`gateway ${port} exited with ${child.exitCode}`);
        }
        try {
            const response = await get(port, '/api');
            if (response.status === 200) {
                return;
            }
            if (process.env.MS_CHAOS_VERBOSE === '1') console.log('wait status', port, response.status, response.body);
        } catch (error) {
            if (process.env.MS_CHAOS_VERBOSE === '1') console.log('wait error', port, error.message);
        }
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    throw new Error(`gateway ${port} did not become ready`);
}

async function main() {
    const upstreamPort = await freePort();
    const firstPort = await freePort();
    const secondPort = await freePort();
    const prefix = `tsdi:chaos:${Date.now().toString(36)}:`;
    const upstream = http.createServer((_req, res) => {
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ instance: 'upstream' }));
    });
    await new Promise(resolve => upstream.listen(upstreamPort, '127.0.0.1', resolve));

    const spawnGateway = port => spawn(process.execPath, [
        tsNode,
        '-r', 'tsconfig-paths/register',
        'packages/microservices/examples/chaos-gateway.ts'
    ], {
        cwd: root,
        env: {
            ...process.env,
            TS_NODE_TRANSPILE_ONLY: '1',
            CHAOS_GATEWAY_PORT: String(port),
            CHAOS_UPSTREAM_URL: `http://127.0.0.1:${upstreamPort}`,
            CHAOS_REDIS_URL: process.env.CHAOS_REDIS_URL ?? 'redis://127.0.0.1:6379',
            CHAOS_REDIS_PREFIX: prefix
        },
        stdio: ['ignore', 'pipe', 'pipe']
    });
    const logs = [];
    const first = spawnGateway(firstPort);
    const second = spawnGateway(secondPort);
    first.stdout.on('data', chunk => logs.push(String(chunk)));
    second.stdout.on('data', chunk => logs.push(String(chunk)));
    first.stderr.on('data', chunk => logs.push(String(chunk)));
    second.stderr.on('data', chunk => logs.push(String(chunk)));

    try {
        await Promise.all([waitReady(firstPort, first), waitReady(secondPort, second)]);
        const firstResponse = await get(firstPort, '/api');
        const secondResponse = await get(secondPort, '/api');
        if (firstResponse.status !== 200 || secondResponse.status !== 200) {
            throw new Error(`initial requests failed: ${firstResponse.status}/${secondResponse.status}`);
        }

        first.kill('SIGKILL');
        await new Promise(resolve => first.once('exit', resolve));

        const survivor = await get(secondPort, '/api');
        if (survivor.status !== 200) {
            throw new Error(`survivor returned ${survivor.status}`);
        }
        if (survivor.headers['x-gateway-cache'] !== 'HIT') {
            throw new Error(`survivor did not use shared cache: ${JSON.stringify(survivor.headers)}`);
        }
        if (JSON.parse(survivor.body).instance !== 'upstream') {
            throw new Error(`unexpected survivor payload: ${survivor.body}`);
        }
        console.log('chaos ok');
    } finally {
        second.kill('SIGTERM');
        first.kill('SIGKILL');
        await new Promise(resolve => second.once('exit', resolve));
        await new Promise(resolve => upstream.close(() => resolve()));
        if (process.env.MS_CHAOS_VERBOSE === '1') {
            console.log(logs.join(''));
        }
    }
}

main().catch(error => {
    console.error('chaos failed:', error);
    process.exit(1);
});
