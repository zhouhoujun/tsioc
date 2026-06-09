import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { provideService, useRouter, Controller, Get, Post, RequestBody, RequestHeader, RequestParam, RequestPath, MESSAGE_ROUTERS, useSender } from '@tsdi/service';
import { useHttpTransport, HttpFileResult } from '../src/server';
import { withHttpTransport } from '../src/client';
import { provideClient, withTimeout, withFeatures } from '@tsdi/client';
import { HttpClient } from '../src/client/client';
import { HttpRequest } from '../src/client/request';
import { catchError, lastValueFrom, of } from 'rxjs';
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

    @Get('/matrix/query')
    queryMatrix(
        @RequestParam('page') page: number = 1,
        @RequestParam('sort') sort: string = 'name',
        @RequestParam('active') active: string | null = null,
        @RequestHeader('accept') accept?: string,
    ) {
        return { page, sort, active, accept };
    }

    @Get('/matrix/path/:id')
    pathMatrix(@RequestPath('id') id: string) {
        return { id };
    }

    @Post('/matrix/body')
    bodyMatrix(
        @RequestBody('name') name: string,
        @RequestBody('age') age: number,
        @RequestBody('enabled') enabled: boolean,
    ) {
        return { name, age, enabled };
    }

    @Get('/matrix/falsy')
    falsyMatrix(@RequestParam('zero') zero: number = 0) {
        return { zero, ok: false, empty: '' };
    }
}

const PORTS = { ms: 3001, host: 3000, ctrl: 3000, h2: 3000, h2client: 3000, static: 3000 };

// describe('HTTP E2E microservice:true', () => {
//     @Module({
//         imports: [LoggerModule],
//         providers: [
//             provideService(useRouter(),
//                 useHttpTransport({ listenOpts: { port: PORTS.ms, host: '127.0.0.1' }, asDefault: true })),
//             provideClient(
//                 withHttpTransport({ url: `http://127.0.0.1:${PORTS.ms}`, asDefault: true }))
//         ]
//     })
//     class HttpMsModule { }

//     let ctx: ApplicationContext;

//     before(async () => {
//         ctx = await Application.run(HttpMsModule);

//     });

//     after(async () => {
//         await ctx?.close();
//     });

//     it('should bootstrap HTTP with microservice:true', () => { expect(ctx).toBeDefined(); });
// });

// describe('HTTP E2E microservice:false', () => {
//     @Module({
//         imports: [LoggerModule],
//         providers: [
//             provideService(useRouter(),
//                 useHttpTransport({ microservice: false as any, listenOpts: { port: PORTS.host, host: '127.0.0.1' }, asDefault: true })),
//             provideClient(
//                 withHttpTransport({ url: `http://127.0.0.1:${PORTS.host}`, microservice: false, asDefault: true }))
//         ]
//     })
//     class HttpHostModule { }

//     let ctx: ApplicationContext;

//     before(async () => {
//         ctx = await Application.run(HttpHostModule);

//     });
//     after(async () => {
//         await ctx?.close();
//     });

//     it('should bootstrap HTTP with microservice:false', () => { expect(ctx).toBeDefined(); });
// });

describe('HTTP @Controller', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [HttpTestController],
        providers: [provideService(
            useRouter(),
            useHttpTransport({ listenOpts: { port: PORTS.ctrl, host: '127.0.0.1' }, asDefault: true }))]
    })
    class HttpCtrlModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(HttpCtrlModule);

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

describe('HTTP parameter coverage matrix', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [HttpTestController],
        providers: [provideService(useRouter(),
            useHttpTransport({ listenOpts: { port: PORTS.ctrl, host: '127.0.0.1' }, microservice: false as any, asDefault: true })),
        provideClient(withHttpTransport({ url: `http://127.0.0.1:${PORTS.ctrl}`, microservice: false, asDefault: true }))]
    })
    class HttpMatrixModule { }

    let ctx: ApplicationContext;
    let client: HttpClient;

    before(async () => {
        ctx = await Application.run(HttpMatrixModule);
        client = ctx.get(HttpClient);
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should resolve query params, header and defaults for partial params', async () => {
        const response: any = await lastValueFrom(client.get('/api/test/matrix/query', {
            observe: 'response' as any,
            params: { page: '2', sort: 'name', active: '' },
            headers: { accept: 'application/json' }
        } as any));
        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({ page: 2, sort: 'name', accept: 'application/json' });
    });

    it('should resolve path params', async () => {
        const response: any = await lastValueFrom(client.get('/api/test/matrix/path/abc', { observe: 'response' as any }));
        expect(response.body).toEqual({ id: 'abc' });
    });

    it('should resolve named body fields', async () => {
        const response: any = await lastValueFrom(client.post('/api/test/matrix/body', { name: 'alice', age: 20, enabled: true }, { observe: 'response' as any }));
        expect(response.body).toEqual({ name: 'alice', age: 20, enabled: true });
    });

    it('should preserve falsy values in response body', async () => {
        const response: any = await lastValueFrom(client.get('/api/test/matrix/falsy', { observe: 'response' as any, params: { zero: '0' } }));
        expect(response.body).toEqual({ zero: 0, ok: false, empty: '' });
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
                listenOpts: { port: PORTS.h2, host: 'localhost' },
                asDefault: true
            }))]
    })
    class Https2Module { }

    let ctx: ApplicationContext;
    let http2Client: http2.ClientHttp2Session;

    before(async () => {
        ctx = await Application.run(Https2Module);

        http2Client = http2.connect(`https://localhost:${PORTS.h2}`, { ca: cert });
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
                port: PORTS.h2,
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

// ----- HTTP client timeout -----
const TIMEOUT_PORT = 21500;

@Controller('/slow')
class SlowController {
    @Get('/delayed')
    delayed() {
        return new Promise(resolve => setTimeout(() => resolve({ done: true }), 200));
    }

    @Get('/very-slow', { timeout: 20 })
    verySlow() {
        return new Promise(resolve => setTimeout(() => resolve({ done: true }), 200));
    }

    @Post('/submit-rate-limited', { rateLimit: { limit: 1, windowMs: 1000 } })
    submitLimited(@RequestBody() body: any) {
        return { received: body };
    }
}

describe('HTTP client timeout via withTimeout()', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [SlowController],
        providers: [
            provideService(useRouter(),
                useHttpTransport({ listenOpts: { port: TIMEOUT_PORT, host: '127.0.0.1' }, asDefault: true })),
            provideClient(
                withTimeout(20),
                withHttpTransport({ url: `http://127.0.0.1:${TIMEOUT_PORT}`, asDefault: true }))
        ]
    })
    class TimeoutModule { }

    let ctx: ApplicationContext;
    let client: HttpClient;

    before(async () => {
        ctx = await Application.run(TimeoutModule);
        client = ctx.get(HttpClient);
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should timeout on slow response', async () => {
        const result: any = await lastValueFrom(
            client.get('/slow/delayed', { observe: 'response' as any })
                .pipe(catchError(err => of({ error: err })))
        );
        expect(result.error).toBeDefined();
    });
});

describe('HTTP client timeout via withTimeout() alias replacement', () => {
    const FEAT_TIMEOUT_PORT = 21501;

    @Module({
        imports: [LoggerModule],
        declarations: [SlowController],
        providers: [
            provideService(useRouter(),
                useHttpTransport({ listenOpts: { port: FEAT_TIMEOUT_PORT, host: '127.0.0.1' }, asDefault: true })),
            provideClient(
                withTimeout(20),
                withHttpTransport({ url: `http://127.0.0.1:${FEAT_TIMEOUT_PORT}`, asDefault: true }))
        ]
    })
    class FeatTimeoutModule { }

    let ctx: ApplicationContext;
    let client: HttpClient;

    before(async () => {
        ctx = await Application.run(FeatTimeoutModule);
        client = ctx.get(HttpClient);
    });
    after(async () => { if (ctx) await ctx.close(); });

    it('should timeout on slow response', async () => {
        const result: any = await lastValueFrom(
            client.get('/slow/delayed', { observe: 'response' as any })
                .pipe(catchError(err => of({ error: err })))
        );
        expect(result.error).toBeDefined();
    });
});

describe('HTTP service route timeout', () => {
    const ROUTE_TIMEOUT_PORT = 21502;

    @Module({
        imports: [LoggerModule],
        declarations: [SlowController],
        providers: [provideService(useRouter(),
            useHttpTransport({ listenOpts: { port: ROUTE_TIMEOUT_PORT, host: '127.0.0.1' }, asDefault: true }))]
    })
    class RouteTimeoutModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(RouteTimeoutModule);
    });
    after(async () => { if (ctx) await ctx.close(); });

    function request(method: string, targetPath: string): Promise<{ status: number; body: string }> {
        return new Promise((resolve, reject) => {
            const req = http.request({
                host: '127.0.0.1',
                port: ROUTE_TIMEOUT_PORT,
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

    it('should return timeout on slow route with route-level timeout', async () => {
        const response = await request('GET', '/slow/very-slow');
        expect(response.status).toBe(504);
        const parsed = JSON.parse(response.body);
        expect(parsed.message).toContain('timeout');
    });
});

describe('HTTP service rate limit', () => {
    const RATE_PORT = 21503;

    @Module({
        imports: [LoggerModule],
        declarations: [SlowController],
        providers: [provideService(useRouter(),
            useHttpTransport({ listenOpts: { port: RATE_PORT, host: '127.0.0.1' }, asDefault: true }))]
    })
    class RateLimitModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(RateLimitModule);
    });
    after(async () => { if (ctx) await ctx.close(); });

    function request(method: string, targetPath: string, body?: string): Promise<{ status: number; body: string }> {
        return new Promise((resolve, reject) => {
            const req = http.request({
                host: '127.0.0.1',
                port: RATE_PORT,
                path: targetPath,
                method,
                headers: { 'content-type': 'application/json', 'accept': 'application/json' }
            }, res => {
                let b = '';
                res.setEncoding('utf8');
                res.on('data', chunk => b += chunk);
                res.on('end', () => resolve({ status: res.statusCode ?? 0, body: b }));
            });
            req.on('error', reject);
            if (body) req.write(body);
            req.end();
        });
    }

    it('should allow first request and reject second request within window', async () => {
        const first = await request('POST', '/slow/submit-rate-limited', JSON.stringify({ test: true }));
        expect(first.status).toBe(200);

        const second = await request('POST', '/slow/submit-rate-limited', JSON.stringify({ test: true }));
        expect(second.status).toBe(429);
    });
});

// ----- HTTP pipe parameter conversion -----
const PIPE_PORT = 21510;

@Controller('/pipes')
class PipeTestController {
    @Get('/convert')
    convert(
        @RequestParam('age', { pipe: 'int' }) age: number,
        @RequestParam('enabled', { pipe: 'boolean' }) enabled: boolean
    ) {
        return { age, enabled, types: { age: typeof age, enabled: typeof enabled } };
    }

    @Get('/defaults')
    defaults(
        @RequestParam('page', { nullable: true, pipe: 'int' }) page: number = 1,
        @RequestParam('size', { nullable: true, pipe: 'int' }) size: number = 20,
        @RequestParam('sort', { nullable: true }) sort: string = 'name'
    ) {
        return { page, size, sort };
    }

    @Get('/int-validate')
    intValidate(@RequestParam('val', { pipe: 'int' }) val: number) {
        return { val, isNumber: typeof val === 'number' };
    }
}

describe('HTTP pipe parameter conversion', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [PipeTestController],
        providers: [provideService(useRouter(),
            useHttpTransport({ listenOpts: { port: PIPE_PORT, host: '127.0.0.1' }, asDefault: true }))]
    })
    class PipeModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(PipeModule);
    });
    after(async () => { if (ctx) await ctx.close(); });

    function request(method: string, targetPath: string): Promise<{ status: number; body: string }> {
        return new Promise((resolve, reject) => {
            const req = http.request({
                host: '127.0.0.1',
                port: PIPE_PORT,
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

    it('should convert query params via pipe: int and boolean', async () => {
        const res = await request('GET', '/pipes/convert?age=25&enabled=true');
        expect(res.status).toBe(200);
        const data = JSON.parse(res.body);
        expect(data.age).toBe(25);
        expect(typeof data.age).toBe('number');
        expect(data.enabled).toBe(true);
        expect(typeof data.enabled).toBe('boolean');
    });

    it('should apply default values when query params omitted', async () => {
        const res = await request('GET', '/pipes/defaults');
        expect(res.status).toBe(200);
        const data = JSON.parse(res.body);
        expect(data.page).toBe(1);
        expect(data.size).toBe(20);
        expect(data.sort).toBe('name');
    });

    it('should handle partial query params with defaults', async () => {
        const res = await request('GET', '/pipes/defaults?page=5&sort=email');
        expect(res.status).toBe(200);
        const data = JSON.parse(res.body);
        expect(data.page).toBe(5);
        expect(data.size).toBe(20);
        expect(data.sort).toBe('email');
    });

    it('should validate int param type', async () => {
        const res = await request('GET', '/pipes/int-validate?val=42');
        expect(res.status).toBe(200);
        const data = JSON.parse(res.body);
        expect(data.val).toBe(42);
        expect(data.isNumber).toBe(true);
    });
});
