import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { BadRequestException } from '@tsdi/common';
import { LoggerModule } from '@tsdi/logger';
import { provideClient } from '@tsdi/client';
import { Controller, Get, Post, RedirectResult, RequestBody, RequestParam, RequestPath, provideService, useRouter } from '@tsdi/service';
import { HttpClient, withHttpTransport } from '../src/client';
import { useHttpTransport } from '../src/server';
import { catchError, lastValueFrom, of } from 'rxjs';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as http2 from 'node:http2';
import expect = require('expect');

const PORT = 21330;
const key = fs.readFileSync(path.join(__dirname, '../../../../cert/localhost-privkey.pem'));
const cert = fs.readFileSync(path.join(__dirname, '../../../../cert/localhost-cert.pem'));

type HttpResponse<T = any> = {
    status: number;
    ok?: boolean;
    body: T;
};

@Controller()
class Https2RootController {
    @Get('/510100_full.json')
    fullJson() {
        return { features: [{ id: '1' }, { id: '2' }] };
    }

    @Get('/content/big.json')
    bigJson() {
        return {
            features: Array.from({ length: 512 }, (_, i) => `feature-${i}`)
        };
    }

    @Post('/hdevice')
    startup(@RequestBody('type') type: string) {
        if (type !== 'startup') {
            throw new BadRequestException();
        }
        return {
            device: 'device next',
            deviceA_state: 'startuped',
            deviceB_state: 'startuped'
        };
    }
}

@Controller('/device')
class Https2DeviceController {
    private readonly devices = [{ name: '1' }, { name: '2' }];

    @Get('/')
    list(@RequestParam('name', { nullable: true }) name?: string) {
        return name ? this.devices.filter(device => device.name === name) : this.devices;
    }

    @Post('/init')
    init(@RequestParam('name') name: string) {
        return { name };
    }

    @Post('/update')
    update(@RequestParam('version') version: string) {
        return version;
    }

    @Post('/usage')
    usage(
        @RequestBody('id') id: string,
        @RequestBody('age', { pipe: 'int' }) year: number,
        @RequestBody('createAt', { pipe: 'date' }) createAt: Date
    ) {
        return { id, year, createAt };
    }

    @Get('/usege/find')
    find(@RequestParam('age', { pipe: 'int' }) limit: number) {
        return limit;
    }

    @Get('/:age/used')
    used(@RequestPath('age', { pipe: 'int' }) age: number) {
        if (age <= 0) {
            throw new BadRequestException();
        }
        return age;
    }

    @Get('/status')
    status(@RequestParam('redirect', { nullable: true }) redirect?: string) {
        if (redirect === 'reload') {
            return new RedirectResult('/device/reload');
        }
        return of('working');
    }

    @Get('/reload')
    reload() {
        return 'reload';
    }

    @Get('/empty')
    empty() {
        return null;
    }
}

@Module({
    imports: [LoggerModule],
    declarations: [Https2RootController, Https2DeviceController],
    providers: [
        provideService(
            useRouter(),
            useRouter({ microservice: true }),
            useHttpTransport({
                majorVersion: 2,
                secure: true,
                serverOpts: { key, cert, allowHTTP1: true } as any,
                listenOpts: {
                    port: PORT,
                    host: 'localhost'
                },
                asDefault: true
            })
        ),
        provideClient(
            withHttpTransport({
                authority: `https://localhost:${PORT}`,
                connectOpts: { ca: cert },
                asDefault: true
            })
        )
    ]
})
class SecureMainApp { }

describe('http2 Secure server, HttpClient', () => {
    let ctx: ApplicationContext;
    let client: HttpClient;

    async function asResponse<T>(promise: Promise<any>): Promise<HttpResponse<T>> {
        return await promise as HttpResponse<T>;
    }

    function rawH2Get(pathname: string): Promise<{ status: number; headers: http2.IncomingHttpHeaders; body: string }> {
        return new Promise((resolve, reject) => {
            const session = http2.connect(`https://localhost:${PORT}`, { ca: cert });
            const req = session.request({
                ':method': 'GET',
                ':path': pathname,
                accept: 'text/plain'
            });
            let status = 0;
            let headers: http2.IncomingHttpHeaders = {};
            let body = '';
            req.setEncoding('utf8');
            req.on('response', responseHeaders => {
                headers = responseHeaders;
                status = Number(responseHeaders[':status'] ?? 0);
            });
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                session.close();
                resolve({ status, headers, body });
            });
            req.on('error', err => {
                session.destroy();
                reject(err);
            });
            session.on('error', reject);
            req.end();
        });
    }

    before(async () => {
        ctx = await Application.run(SecureMainApp);
        client = ctx.get(HttpClient);
    });

    after(async () => {
        await ctx?.close();
    });

    it('fetch json', async () => {
        const res = await lastValueFrom(client.get('/510100_full.json')) as { features: any[] };
        expect(res).toBeDefined();
        expect(Array.isArray(res.features)).toBeTruthy();
    });

    it('fetch big json', async () => {
        const res = await lastValueFrom(client.get('/content/big.json')) as { features: string[] };
        expect(res).toBeDefined();
        expect(Array.isArray(res.features)).toBeTruthy();
        expect(res.features.length).toBeGreaterThan(100);
    });

    it('msg work', async () => {
        const rep = await asResponse<Record<string, string>>(
            lastValueFrom(
                client.post('/hdevice', { type: 'startup' }, { observe: 'response' }).pipe(
                    catchError(err => {
                        ctx.getLogger().error(err);
                        return of(err);
                    })
                )
            )
        );

        expect(rep).toBeDefined();
        expect(rep.body).toBeDefined();
        expect(rep.body.device).toBe('device next');
        expect(rep.body.deviceA_state).toBe('startuped');
        expect(rep.body.deviceB_state).toBe('startuped');
    });

    it('query all', async () => {
        const items = await lastValueFrom(client.get('/device')) as Array<{ name: string }>;
        expect(Array.isArray(items)).toBeTruthy();
        expect(items.length).toEqual(2);
        expect(items[0].name).toEqual('1');
    });

    it('query with params', async () => {
        const items = await lastValueFrom(client.get('/device', { params: { name: '2' } })) as Array<{ name: string }>;
        expect(Array.isArray(items)).toBeTruthy();
        expect(items.length).toEqual(1);
        expect(items[0].name).toEqual('2');
    });

    it('null response should default to 204', async () => {
        const response = await asResponse(
            lastValueFrom(client.get('/device/empty', { observe: 'response' }))
        );
        expect(response.status).toEqual(204);
        expect(response.body).toBeNull();
    });

    it('post not found', async () => {
        const response = await asResponse(
            lastValueFrom(
                client.post('/device/init5', null, { observe: 'response', params: { name: 'test' } }).pipe(
                    catchError(err => of(err))
                )
            )
        );
        expect(response.status).toEqual(404);
    });

    it('get not found', async () => {
        const response = await asResponse(
            lastValueFrom(
                client.get('/device/init5', { observe: 'response', params: { name: 'test' } }).pipe(
                    catchError(err => of(err))
                )
            )
        );
        expect(response.status).toEqual(404);
    });

    it('bad request', async () => {
        const response = await asResponse(
            lastValueFrom(
                client.get('/device/-1/used', { observe: 'response', params: { age: '20' } }).pipe(
                    catchError(err => of(err))
                )
            )
        );
        expect(response.status).toEqual(400);
    });

    it('post route response object', async () => {
        const response = await asResponse<{ name: string }>(
            lastValueFrom(client.post('/device/init', null, { observe: 'response', params: { name: 'test' } }))
        );
        expect(response.status).toEqual(200);
        expect(response.ok).toBeTruthy();
        expect(response.body).toBeDefined();
        expect(response.body.name).toEqual('test');
    });

    it('post route response string', async () => {
        const response = await asResponse<string>(
            lastValueFrom(
                client.post('/device/update', null, { observe: 'response', responseType: 'text', params: { version: '1.0.0' } }).pipe(
                    catchError(err => {
                        ctx.getLogger().error(err);
                        return of(err);
                    })
                )
            )
        );
        expect(response.status).toEqual(200);
        expect(response.ok).toBeTruthy();
        expect(response.body).toEqual('1.0.0');
    });

    it('route with request body pipe', async () => {
        const response = await asResponse<{ year: number; createAt: string }>(
            lastValueFrom(client.post('/device/usage', { id: 'test1', age: '50', createAt: '2021-10-01' }, { observe: 'response' }))
        );
        expect(response.status).toEqual(200);
        expect(response.ok).toBeTruthy();
        expect(response.body).toBeDefined();
        expect(response.body.year).toStrictEqual(50);
        expect(new Date(response.body.createAt)).toEqual(new Date('2021-10-01'));
    });

    it('route with request body pipe throw missing argument err', async () => {
        const response = await asResponse(
            lastValueFrom(
                client.post('/device/usage', {}, { observe: 'response' }).pipe(
                    catchError(err => {
                        ctx.getLogger().error(err);
                        return of(err);
                    })
                )
            )
        );
        expect(response.status).toEqual(400);
    });

    it('route with request body pipe throw argument err', async () => {
        const response = await asResponse(
            lastValueFrom(
                client.post('/device/usage', { id: 'test1', age: 'test', createAt: '2021-10-01' }, { observe: 'response' }).pipe(
                    catchError(err => {
                        ctx.getLogger().error(err);
                        return of(err);
                    })
                )
            )
        );
        expect(response.status).toEqual(400);
    });

    it('route with request param pipe', async () => {
        const response = await asResponse<number>(
            lastValueFrom(client.get('/device/usege/find', { observe: 'response', params: { age: '20' } }))
        );
        expect(response.status).toEqual(200);
        expect(response.ok).toBeTruthy();
        expect(response.body).toStrictEqual(20);
    });

    it('route with request param pipe throw missing argument err', async () => {
        const response = await asResponse(
            lastValueFrom(
                client.get('/device/usege/find', { observe: 'response' }).pipe(
                    catchError(err => {
                        ctx.getLogger().error(err);
                        return of(err);
                    })
                )
            )
        );
        expect(response.status).toEqual(400);
    });

    it('route with request param pipe throw argument err', async () => {
        const response = await asResponse(
            lastValueFrom(
                client.get('/device/usege/find', { observe: 'response', params: { age: 'test' } }).pipe(
                    catchError(err => {
                        ctx.getLogger().error(err);
                        return of(err);
                    })
                )
            )
        );
        expect(response.status).toEqual(400);
    });

    it('route with request restful param pipe', async () => {
        const response = await asResponse<number>(
            lastValueFrom(client.get('/device/30/used', { observe: 'response', params: { age: '20' } }))
        );
        expect(response.status).toEqual(200);
        expect(response.ok).toBeTruthy();
        expect(response.body).toStrictEqual(30);
    });

    it('route with request restful param pipe throw missing argument err', async () => {
        const response = await asResponse(
            lastValueFrom(
                client.get('/device//used', { observe: 'response', params: { age: '20' } }).pipe(
                    catchError(err => {
                        ctx.getLogger().error(err);
                        return of(err);
                    })
                )
            )
        );
        expect(response.status).toEqual(404);
    });

    it('route with request restful param pipe throw argument err', async () => {
        const response = await asResponse(
            lastValueFrom(
                client.get('/device/age1/used', { observe: 'response', params: { age: '20' } }).pipe(
                    catchError(err => {
                        ctx.getLogger().error(err);
                        return of(err);
                    })
                )
            )
        );
        expect(response.status).toEqual(400);
    });

    it('response with Observable', async () => {
        const response = await asResponse<string>(
            lastValueFrom(
                client.get('/device/status', { observe: 'response', responseType: 'text' }).pipe(
                    catchError(err => {
                        ctx.getLogger().error(err);
                        return of(err);
                    })
                )
            )
        );
        expect(response.status).toEqual(200);
        expect(response.body).toEqual('working');
    });

    it('redirect', async () => {
        const response = await rawH2Get('/device/status?redirect=reload');
        expect(response.status).toEqual(302);
        expect(response.headers.location).toEqual('/device/reload');
    });
});
