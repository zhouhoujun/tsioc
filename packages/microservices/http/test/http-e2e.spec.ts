import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { provideService, useRouter, Controller, Get, Post, RequestBody, MESSAGE_ROUTERS } from '@tsdi/service';
import { useHttpTransport, HttpFileResult } from '../src/server';
import { withHttpTransport } from '../src/client';
import { provideClient } from '@tsdi/client';
import { HttpClient } from '../src/client/client';
import { HttpRequest } from '../src/client/request';
import { lastValueFrom } from 'rxjs';
import * as http from 'node:http';
import * as http2 from 'node:http2';
import * as path from 'node:path';
import expect = require('expect');

@Controller('/api/test')
class HttpTestController {
    @Get('/info') info() { return { status: 'ok' }; }

    @Get('/download')
    download() {
        return new HttpFileResult(path.resolve(__dirname, 'fixtures/hello.txt'), {
            filename: 'hello.txt',
            disposition: 'attachment'
        });
    }

    @Post('/upload')
    upload(@RequestBody() body: any) {
        const file = body?.files?.file;
        return {
            title: body?.title,
            filename: file?.filename,
            content: file?.buffer?.toString('utf8')
        };
    }
}

const PORTS = { ms: 21200, host: 21201, ctrl: 21202, h2: 21204, h2client: 21205, static: 21206 };

describe('HTTP E2E microservice:true', () => {
    @Module({
        imports: [LoggerModule],
        providers: [
            provideService(useRouter(),
                useHttpTransport({ listenOpts: { port: PORTS.ms, host: '127.0.0.1' }, asDefault: true })),
            provideClient(
                withHttpTransport({ url: `http://127.0.0.1:${PORTS.ms}`, asDefault: true }))
        ]
    })
    class HttpMsModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(HttpMsModule);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap HTTP with microservice:true', () => { expect(ctx).toBeDefined(); });
});

describe('HTTP E2E microservice:false', () => {
    @Module({
        imports: [LoggerModule],
        providers: [
            provideService(useRouter(),
                useHttpTransport({ microservice: false as any, listenOpts: { port: PORTS.host, host: '127.0.0.1' }, asDefault: true })),
            provideClient(
                withHttpTransport({ url: `http://127.0.0.1:${PORTS.host}`, microservice: false, asDefault: true }))
        ]
    })
    class HttpHostModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(HttpHostModule);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap HTTP with microservice:false', () => { expect(ctx).toBeDefined(); });
});

describe('HTTP @Controller', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [HttpTestController],
        providers: [provideService(useRouter(),
            useHttpTransport({ listenOpts: { port: PORTS.ctrl, host: '127.0.0.1' }, asDefault: true }))]
    })
    class HttpCtrlModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(HttpCtrlModule);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap @Controller', () => { expect(ctx).toBeDefined(); });

    it('should register controller route', () => {
        const routers = ctx.get(MESSAGE_ROUTERS);
        expect(routers?.length).toBeGreaterThan(0);
        const patterns = routers[0].getPatterns();
        expect(patterns.routes).toContain('api/test');
    });

    it('should handle GET via http1', async () => {
        const response = await new Promise<{ status: number; body: string }>((resolve, reject) => {
            const req = http.request({
                host: '127.0.0.1',
                port: PORTS.ctrl,
                path: '/api/test/info',
                method: 'GET',
                headers: { 'accept': 'application/json' }
            }, res => {
                let body = '';
                res.setEncoding('utf8');
                res.on('data', chunk => body += chunk);
                res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
            });
            req.on('error', reject);
            req.end();
        });
        expect(response.status).toBe(200);
        expect(JSON.parse(response.body)).toEqual({ status: 'ok' });
    });
});

describe('HTTP static/media support', () => {
    @Module({
        imports: [LoggerModule], declarations: [HttpTestController],
        providers: [provideService(useRouter(),
            useHttpTransport({
                listenOpts: { port: PORTS.static, host: '127.0.0.1' },
                static: { root: path.resolve(__dirname, 'fixtures') },
                upload: { limit: '1mb' },
                asDefault: true
            }))]
    })
    class HttpStaticModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(HttpStaticModule);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.close(); });

    function request(method: string, targetPath: string, headers?: Record<string, string>, body?: Buffer | string): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: Buffer }> {
        return new Promise((resolve, reject) => {
            const req = http.request({
                host: '127.0.0.1',
                port: PORTS.static,
                path: targetPath,
                method,
                headers
            }, res => {
                const chunks: Uint8Array[] = [];
                res.on('data', chunk => chunks.push(Uint8Array.from(Buffer.from(chunk))));
                res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks) }));
            });
            req.on('error', reject);
            if (body) {
                req.write(body);
            }
            req.end();
        });
    }

    it('should serve static file', async () => {
        const response = await request('GET', '/hello.txt');
        expect(response.status).toBe(200);
        expect(response.body.toString('utf8')).toBe('hello static world\n');
        expect(String(response.headers['content-type'])).toContain('text/plain');
    });

    it('should serve index file', async () => {
        const response = await request('GET', '/');
        expect(response.status).toBe(200);
        expect(response.body.toString('utf8')).toContain('index fixture');
        expect(String(response.headers['content-type'])).toContain('text/html');
    });

    it('should handle HEAD without body', async () => {
        const response = await request('HEAD', '/hello.txt');
        expect(response.status).toBe(200);
        expect(response.body.length).toBe(0);
        expect(String(response.headers['content-length'])).toBe(String(Buffer.byteLength('hello static world\n')));
    });

    it('should infer media mime types', async () => {
        const response = await request('GET', '/sample.mp4');
        expect(response.status).toBe(200);
        expect(String(response.headers['content-type'])).toContain('video/mp4');
    });

    it('should return attachment response', async () => {
        const response = await request('GET', '/api/test/download');
        expect(response.status).toBe(200);
        expect(String(response.headers['content-disposition'])).toContain('attachment;');
        expect(response.body.toString('utf8')).toBe('hello static world\n');
    });

    it('should support range requests', async () => {
        const response = await request('GET', '/range.txt', { range: 'bytes=0-4' });
        expect(response.status).toBe(206);
        expect(String(response.headers['content-range'])).toBe('bytes 0-4/37');
        expect(response.body.toString('utf8')).toBe('01234');
    });

    it('should reject invalid ranges', async () => {
        const response = await request('GET', '/range.txt', { range: 'bytes=999-1000' });
        expect(response.status).toBe(416);
        expect(String(response.headers['content-range'])).toBe('bytes */37');
    });

    it('should reject path traversal', async () => {
        const response = await request('GET', '/%2e%2e/package.json');
        expect([400, 403, 404]).toContain(response.status);
    });

    it('should parse multipart upload', async () => {
        const boundary = '----tsiocBoundary';
        const body = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="title"\r\n\r\nhello\r\n--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="upload.txt"\r\nContent-Type: text/plain\r\n\r\nworld\r\n--${boundary}--\r\n`);
        const response = await request('POST', '/api/test/upload', {
            'content-type': `multipart/form-data; boundary=${boundary}`,
            'content-length': String(body.length)
        }, body);
        expect(response.status).toBe(200);
        expect(JSON.parse(response.body.toString('utf8'))).toEqual({ title: 'hello', filename: 'upload.txt', content: 'world' });
    });
});

describe('HTTP/2 over h2c (plaintext)', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [HttpTestController],
        providers: [provideService(useRouter(),
            useHttpTransport({ majorVersion: 2, listenOpts: { port: PORTS.h2, host: '127.0.0.1' }, asDefault: true }))]
    })
    class Http2Module { }

    let ctx: ApplicationContext;
    let http2Client: http2.ClientHttp2Session;

    before(async () => {
        ctx = await Application.run(Http2Module);
        await new Promise(r => setTimeout(r, 500));
        http2Client = http2.connect(`http://127.0.0.1:${PORTS.h2}`);
    });
    after(async () => {
        try { http2Client?.close(); } catch { /* ignore */ }
        if (ctx) await ctx.close();
    });

    function http2Request(method: string, path: string): Promise<{ status: number; body: string }> {
        return new Promise((resolve, reject) => {
            const req = http2Client.request({
                ':method': method,
                ':path': path,
                'accept': 'application/json'
            });
            const chunks: Uint8Array[] = [];
            const responseHeaders: http2.IncomingHttpHeaders = {};
            req.on('response', headers => { Object.assign(responseHeaders, headers); });
            req.on('data', chunk => chunks.push(Uint8Array.from(Buffer.from(chunk))));
            req.on('end', () => {
                resolve({
                    status: Number(responseHeaders[':status'] ?? 0),
                    body: Buffer.concat(chunks).toString('utf8')
                });
            });
            req.on('error', reject);
            req.end();
        });
    }

    it('should handle GET over http2', async () => {
        const response = await http2Request('GET', '/api/test/info');
        expect(response.status).toBe(200);
        expect(JSON.parse(response.body)).toEqual({ status: 'ok' });
    });
});

describe('HTTP/2 via microservice client pipeline', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [HttpTestController],
        providers: [
            provideService(useRouter(),
                useHttpTransport({ majorVersion: 2, listenOpts: { port: PORTS.h2client, host: '127.0.0.1' }, asDefault: true })),
            provideClient(
                withHttpTransport({ authority: `http://127.0.0.1:${PORTS.h2client}`, asDefault: true }))
        ]
    })
    class Http2ClientModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(Http2ClientModule);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should bootstrap HTTP/2 with client', () => { expect(ctx).toBeDefined(); });

    it('should send GET over HTTP/2 via microservice client', async () => {
        const client = ctx.get(HttpClient);
        const response: any = await lastValueFrom(client.send(
            new HttpRequest('/api/test/info', null, {
                method: 'GET',
                observe: 'response',
                responseType: 'json',
                headers: { 'accept': 'application/json' }
            })
        ));
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'ok' });
    });
});

describe('HTTP/2 over TLS (HTTPS/2)', () => {
    const key = require('fs').readFileSync(path.join(__dirname, '../../../../cert/localhost-privkey.pem'));
    const cert = require('fs').readFileSync(path.join(__dirname, '../../../../cert/localhost-cert.pem'));

    @Module({
        imports: [LoggerModule],
        declarations: [HttpTestController],
        providers: [provideService(useRouter(),
            useHttpTransport({
                majorVersion: 2,
                secure: true,
                serverOpts: { key, cert, allowHTTP1: true } as any,
                listenOpts: { port: PORTS.h2 + 10, host: 'localhost' },
                asDefault: true
            }))]
    })
    class Https2Module { }

    let ctx: ApplicationContext;
    let http2Client: http2.ClientHttp2Session;

    before(async () => {
        ctx = await Application.run(Https2Module);
        await new Promise(r => setTimeout(r, 500));
        http2Client = http2.connect(`https://localhost:${PORTS.h2 + 10}`, { ca: cert });
    });
    after(async () => {
        try { http2Client?.close(); } catch { /* ignore */ }
        if (ctx) await ctx.close();
    });

    function https2Request(method: string, path: string, headers?: Record<string, string>): Promise<{ status: number; body: string; headers: http2.IncomingHttpHeaders }> {
        return new Promise((resolve, reject) => {
            const req = http2Client.request({
                ':method': method,
                ':path': path,
                'accept': 'application/json',
                ...headers
            });
            const chunks: Uint8Array[] = [];
            const responseHeaders: http2.IncomingHttpHeaders = {};
            req.on('response', headers => { Object.assign(responseHeaders, headers); });
            req.on('data', chunk => chunks.push(Uint8Array.from(Buffer.from(chunk))));
            req.on('end', () => {
                resolve({
                    status: Number(responseHeaders[':status'] ?? 0),
                    body: Buffer.concat(chunks).toString('utf8'),
                    headers: responseHeaders
                });
            });
            req.on('error', reject);
            req.end();
        });
    }

    it('should handle GET over https2', async () => {
        const response = await https2Request('GET', '/api/test/info');
        expect(response.status).toBe(200);
        expect(JSON.parse(response.body)).toEqual({ status: 'ok' });
    });

    it('should support http1 fallback on http2 server', async () => {
        const response = await new Promise<{ status: number; body: string }>((resolve, reject) => {
            const req = require('https').request({
                host: 'localhost',
                port: PORTS.h2 + 10,
                path: '/api/test/info',
                method: 'GET',
                ca: cert,
                headers: { 'accept': 'application/json' }
            }, (res: http.IncomingMessage) => {
                let body = '';
                res.setEncoding('utf8');
                res.on('data', chunk => body += chunk);
                res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
            });
            req.on('error', reject);
            req.end();
        });
        expect(response.status).toBe(200);
        expect(JSON.parse(response.body)).toEqual({ status: 'ok' });
    });
});

describe('HTTP/2 concurrent streams', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [HttpTestController],
        providers: [provideService(useRouter(),
            useHttpTransport({
                majorVersion: 2,
                listenOpts: { port: PORTS.h2 + 20, host: '127.0.0.1' },
                asDefault: true
            }))]
    })
    class Http2ConcurrentModule { }

    let ctx: ApplicationContext;
    let http2Client: http2.ClientHttp2Session;

    before(async () => {
        ctx = await Application.run(Http2ConcurrentModule);
        await new Promise(r => setTimeout(r, 500));
        http2Client = http2.connect(`http://127.0.0.1:${PORTS.h2 + 20}`);
    });
    after(async () => {
        try { http2Client?.close(); } catch { /* ignore */ }
        if (ctx) await ctx.close();
    });

    it('should handle multiple concurrent streams', async () => {
        const count = 10;
        const requests = Array.from({ length: count }, () =>
            new Promise<{ status: number; body: string }>((resolve, reject) => {
                const req = http2Client.request({
                    ':method': 'GET',
                    ':path': '/api/test/info',
                    'accept': 'application/json'
                });
                const chunks: Uint8Array[] = [];
                const responseHeaders: http2.IncomingHttpHeaders = {};
                req.on('response', headers => { Object.assign(responseHeaders, headers); });
                req.on('data', chunk => chunks.push(Uint8Array.from(Buffer.from(chunk))));
                req.on('end', () => resolve({
                    status: Number(responseHeaders[':status'] ?? 0),
                    body: Buffer.concat(chunks).toString('utf8')
                }));
                req.on('error', reject);
                req.end();
            })
        );
        const results = await Promise.all(requests);
        results.forEach(r => {
            expect(r.status).toBe(200);
            expect(JSON.parse(r.body)).toEqual({ status: 'ok' });
        });
    });
});

describe('HTTP content negotiation', () => {
    @Controller('/negotiate')
    class NegotiateController {
        @Get('/format')
        format() {
            return { data: 'content-negotiation' };
        }
    }

    const NEG_PORT = PORTS.ctrl + 100;

    @Module({
        imports: [LoggerModule],
        declarations: [NegotiateController],
        providers: [provideService(useRouter(),
            useHttpTransport({
                listenOpts: { port: NEG_PORT, host: '127.0.0.1' },
                asDefault: true
            }))]
    })
    class NegotiateModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(NegotiateModule);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.close(); });

    function request(method: string, targetPath: string, headers?: Record<string, string>): Promise<{ status: number; body: string; contentType: string }> {
        return new Promise((resolve, reject) => {
            const req = http.request({
                host: '127.0.0.1',
                port: NEG_PORT,
                path: targetPath,
                method,
                headers: { accept: 'application/json', ...headers }
            }, res => {
                let body = '';
                res.setEncoding('utf8');
                res.on('data', chunk => body += chunk);
                res.on('end', () => resolve({
                    status: res.statusCode ?? 0,
                    body,
                    contentType: res.headers['content-type'] ?? ''
                }));
            });
            req.on('error', reject);
            req.end();
        });
    }

    it('should respond with json by default', async () => {
        const response = await request('GET', '/negotiate/format', { accept: 'application/json' });
        expect(response.status).toBe(200);
        expect(response.contentType).toContain('application/json');
    });

    it('should work with any accept header', async () => {
        const response = await request('GET', '/negotiate/format', { accept: '*/*' });
        expect(response.status).toBe(200);
    });

    it('should work with text accept header', async () => {
        const response = await request('GET', '/negotiate/format', { accept: 'text/plain' });
        expect(response.status).toBe(200);
    });
});

describe('HTTP error handling', () => {
    const ERR_PORT = PORTS.ctrl + 200;

    @Module({
        imports: [LoggerModule],
        declarations: [HttpTestController],
        providers: [provideService(useRouter(),
            useHttpTransport({
                listenOpts: { port: ERR_PORT, host: '127.0.0.1' },
                asDefault: true
            }))]
    })
    class ErrModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(ErrModule);
        await new Promise(r => setTimeout(r, 500));
    });
    after(async () => { if (ctx) await ctx.close(); });

    function request(method: string, targetPath: string): Promise<{ status: number; body: string }> {
        return new Promise((resolve, reject) => {
            const req = http.request({
                host: '127.0.0.1',
                port: ERR_PORT,
                path: targetPath,
                method,
                headers: { accept: 'application/json' }
            }, res => {
                let body = '';
                res.setEncoding('utf8');
                res.on('data', chunk => body += chunk);
                res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
            });
            req.on('error', reject);
            req.end();
        });
    }

    it('should return 404 for unknown route', async () => {
        const response = await request('GET', '/nonexistent');
        expect(response.status).toBe(404);
    });

    it('should return 404 for unknown path on static', async () => {
        const response = await request('GET', '/nonexistent-file.txt');
        expect(response.status).toBe(404);
    });

    it('should return 405 for method mismatch', async () => {
        const response = await request('POST', '/api/test/info');
        expect([404, 405]).toContain(response.status);
    });
});
