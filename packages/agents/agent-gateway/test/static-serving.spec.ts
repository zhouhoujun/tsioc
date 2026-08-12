import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import { GatewayServer } from '../src/gateway/GatewayServer';
import { AuthMiddleware } from '../src/auth/AuthMiddleware';
import { RateLimiter } from '../src/auth/RateLimiter';

function createTempStaticDir(files: Record<string, string>): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-static-'));
    for (const [relative, content] of Object.entries(files)) {
        const target = path.join(dir, relative);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, content, 'utf-8');
    }
    return dir;
}

async function serveStatic(dir: string, url: string): Promise<{ status: number; body: string; contentType?: string }> {
    const auth = { authenticate: async () => true } as any;
    const rateLimiter = { checkAndRespond: () => true } as any;
    const server = new GatewayServer(auth, rateLimiter, {} as any, {
        host: '127.0.0.1',
        port: 0,
        staticDir: dir
    } as any);
    await server.start();
    const address = server.address()!;
    return new Promise<{ status: number; body: string; contentType?: string }>((resolve, reject) => {
        const request = http.get({
            host: address.host,
            port: address.port,
            path: url
        }, (res) => {
            let body = '';
            res.on('data', chunk => {
                body += chunk.toString();
            });
            res.on('end', () => {
                resolve({
                    status: res.statusCode ?? 0,
                    body,
                    contentType: res.headers['content-type']
                });
            });
        });
        request.on('error', reject);
    }).finally(async () => {
        await server.stop();
    });
}

@Suite('GatewayServer staticDir serving')
export class GatewayStaticServingTest {
    @Test('serves index.html at root path')
    async servesIndexAtRoot() {
        const dir = createTempStaticDir({ 'index.html': '<h1>console</h1>' });
        try {
            const result = await serveStatic(dir, '/');
            expect(result.status).toEqual(200);
            expect(result.body).toEqual('<h1>console</h1>');
            expect(result.contentType).toContain('text/html');
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    }

    @Test('serves nested asset files with mime types')
    async servesNestedAssets() {
        const dir = createTempStaticDir({
            'index.html': '<script src="/assets/app.js"></script>',
            'assets/app.js': 'console.log(1)',
            'style.css': 'body {}'
        });
        try {
            const js = await serveStatic(dir, '/assets/app.js');
            expect(js.status).toEqual(200);
            expect(js.body).toEqual('console.log(1)');
            expect(js.contentType).toContain('javascript');

            const css = await serveStatic(dir, '/style.css');
            expect(css.status).toEqual(200);
            expect(css.body).toEqual('body {}');
            expect(css.contentType).toContain('text/css');
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    }

    @Test('serves directory index.html for directory paths')
    async servesDirectoryIndex() {
        const dir = createTempStaticDir({ 'sub/index.html': 'sub page' });
        try {
            const result = await serveStatic(dir, '/sub/');
            expect(result.status).toEqual(200);
            expect(result.body).toEqual('sub page');
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    }

    @Test('returns 404 for missing files')
    async missingFile404() {
        const dir = createTempStaticDir({ 'index.html': 'x' });
        try {
            const result = await serveStatic(dir, '/nope.js');
            expect(result.status).toEqual(404);
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    }

    @Test('blocks path traversal outside static root')
    async blocksPathTraversal() {
        const dir = createTempStaticDir({ 'index.html': 'x' });
        const sibling = createTempStaticDir({ 'secret.txt': 'top-secret' });
        try {
            const result = await serveStatic(dir, `/../${path.basename(sibling)}/secret.txt`);
            expect(result.status).toEqual(404);
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
            fs.rmSync(sibling, { recursive: true, force: true });
        }
    }

    @Test('does not serve static when staticDir is unset')
    async noStaticWithoutConfig() {
        const auth = { authenticate: async () => true } as any;
        const rateLimiter = { checkAndRespond: () => true } as any;
        const server = new GatewayServer(auth, rateLimiter, {} as any, {} as any);
        await server.start();
        const address = server.address()!;
        const result = await new Promise<{ status: number }>((resolve, reject) => {
            const request = http.get({
                host: address.host,
                port: address.port,
                path: '/'
            }, (res) => {
                res.resume();
                res.on('end', () => resolve({ status: res.statusCode ?? 0 }));
            });
            request.on('error', reject);
        });
        await server.stop();
        expect(result.status).toEqual(404);
    }
}
