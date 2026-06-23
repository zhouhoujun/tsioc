import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { BadRequestException, ErrorResponse, Response } from '@tsdi/common';
import { LoggerModule } from '@tsdi/logger';
import { provideClient } from '@tsdi/client';
import { Controller, Get, Post, RedirectResult, RequestBody, RequestParam, RequestPath, provideService, useRouter } from '@tsdi/service';
import { catchError, lastValueFrom, of } from 'rxjs';
import expect = require('expect');
import { HttpClient, withHttpTransport } from '@tsdi/microservices/http/src/client';
import { useHttpTransport } from '@tsdi/microservices/http/src/server';

const PORT = 21310;
type HttpResult<T = any> = Response<T> | ErrorResponse;

function assertResponse<T>(result: HttpResult<T>): asserts result is Response<T> {
    expect('body' in result).toBeTruthy();
}

@Controller()
class HttpRootController {
    @Get('/510100_full.json')
    fullJson() {
        return { features: [{ id: '1' }, { id: '2' }] };
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
class DeviceController {
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
}

@Module({
    imports: [LoggerModule],
    declarations: [HttpRootController, DeviceController],
    providers: [
        provideService(
            useRouter(),
            useRouter({ microservice: true }),
            useHttpTransport({
                listenOpts: {
                    port: PORT,
                    host: '127.0.0.1'
                },
                asDefault: true
            })
        ),
        provideClient(
            withHttpTransport({
                url: `http://127.0.0.1:${PORT}`,
                asDefault: true
            })
        )
    ]
})
class MainApp { }

describe('HttpClient', () => {
    let ctx: ApplicationContext;
    let client: HttpClient;

    before(async () => {
        ctx = await Application.run(MainApp);
        client = ctx.get(HttpClient);
    });

    after(async () => {
        await ctx?.close();
    });

    it('fetch json', async () => {
        const res = await lastValueFrom(client.get<{ features: any[] }>('/510100_full.json'));
        expect(res).toBeDefined();
        expect(Array.isArray(res.features)).toBeTruthy();
    });

    it('msg work', async () => {
        const rep = await lastValueFrom(
            client.post<Record<string, string>>('/hdevice', { type: 'startup' }, { observe: 'response' }).pipe(
                catchError(err => {
                    ctx.getLogger().error(err);
                    return of(err as HttpResult<Record<string, string>>);
                })
            )
        ) as HttpResult<Record<string, string>>;
        assertResponse(rep);
        const body = rep.body!;

        expect(body.device).toBe('device next');
        expect(body.deviceA_state).toBe('startuped');
        expect(body.deviceB_state).toBe('startuped');
    });

    it('post not found', async () => {
        const response = await lastValueFrom(
            client.post('/device/init5', null, { observe: 'response', params: { name: 'test' } }).pipe(
                catchError(err => of(err as HttpResult))
            )
        ) as HttpResult;
        expect(response.status).toEqual(404);
    });

    it('bad request', async () => {
        const response = await lastValueFrom(
            client.get('/device/-1/used', { observe: 'response', params: { age: '20' } }).pipe(
                catchError(err => of(err as HttpResult))
            )
        ) as HttpResult;
        expect(response.status).toEqual(400);
    });

    it('post route response object', async () => {
        const response = await lastValueFrom(
            client.post<{ name: string }>('/device/init', null, { observe: 'response', params: { name: 'test' } })
        ) as Response<{ name: string }>;
        const body = response.body!;
        expect(response.status).toEqual(200);
        expect(response.ok).toBeTruthy();
        expect(body.name).toEqual('test');
    });

    it('post route response string', async () => {
        const response = await lastValueFrom(
            client.post('/device/update', null, { observe: 'response', responseType: 'text', params: { version: '1.0.0' } }).pipe(
                catchError(err => {
                    ctx.getLogger().error(err);
                    return of(err as HttpResult<string>);
                })
            )
        ) as HttpResult<string>;
        assertResponse(response);
        expect(response.status).toEqual(200);
        expect(response.ok).toBeTruthy();
        expect(response.body).toEqual('1.0.0');
    });

    it('route with request body pipe', async () => {
        const response = await lastValueFrom(
            client.post<{ year: number; createAt: string }>('/device/usage', { id: 'test1', age: '50', createAt: '2021-10-01' }, { observe: 'response' })
        ) as Response<{ year: number; createAt: string }>;
        const body = response.body!;
        expect(response.status).toEqual(200);
        expect(response.ok).toBeTruthy();
        expect(body.year).toStrictEqual(50);
        expect(new Date(body.createAt)).toEqual(new Date('2021-10-01'));
    });

    it('route with request body pipe throw missing argument err', async () => {
        const response = await lastValueFrom(
            client.post('/device/usage', {}, { observe: 'response' }).pipe(
                catchError(err => {
                    ctx.getLogger().error(err);
                    return of(err as HttpResult);
                })
            )
        ) as HttpResult;
        expect(response.status).toEqual(400);
    });

    it('route with request body pipe throw argument err', async () => {
        const response = await lastValueFrom(
            client.post('/device/usage', { id: 'test1', age: 'test', createAt: '2021-10-01' }, { observe: 'response' }).pipe(
                catchError(err => {
                    ctx.getLogger().error(err);
                    return of(err as HttpResult);
                })
            )
        ) as HttpResult;
        expect(response.status).toEqual(400);
    });

    it('route with request param pipe', async () => {
        const response = await lastValueFrom(
            client.get<number>('/device/usege/find', { observe: 'response', params: { age: '20' } })
        ) as Response<number>;
        expect(response.status).toEqual(200);
        expect(response.ok).toBeTruthy();
        expect(response.body).toStrictEqual(20);
    });

    it('route with request param pipe throw missing argument err', async () => {
        const response = await lastValueFrom(
            client.get('/device/usege/find', { observe: 'response' }).pipe(
                catchError(err => {
                    ctx.getLogger().error(err);
                    return of(err as HttpResult);
                })
            )
        ) as HttpResult;
        expect(response.status).toEqual(400);
    });

    it('route with request param pipe throw argument err', async () => {
        const response = await lastValueFrom(
            client.get('/device/usege/find', { observe: 'response', params: { age: 'test' } }).pipe(
                catchError(err => {
                    ctx.getLogger().error(err);
                    return of(err as HttpResult);
                })
            )
        ) as HttpResult;
        expect(response.status).toEqual(400);
    });

    it('route with request restful param pipe', async () => {
        const response = await lastValueFrom(
            client.get<number>('/device/30/used', { observe: 'response', params: { age: '20' } })
        ) as Response<number>;
        expect(response.status).toEqual(200);
        expect(response.ok).toBeTruthy();
        expect(response.body).toStrictEqual(30);
    });

    it('route with request restful param pipe throw missing argument err', async () => {
        const response = await lastValueFrom(
            client.get('/device//used', { observe: 'response', params: { age: '20' } }).pipe(
                catchError(err => {
                    ctx.getLogger().error(err);
                    return of(err as HttpResult);
                })
            )
        ) as HttpResult;
        expect(response.status).toEqual(404);
    });

    it('route with request restful param pipe throw argument err', async () => {
        const response = await lastValueFrom(
            client.get('/device/age1/used', { observe: 'response', params: { age: '20' } }).pipe(
                catchError(err => {
                    ctx.getLogger().error(err);
                    return of(err as HttpResult);
                })
            )
        ) as HttpResult;
        expect(response.status).toEqual(400);
    });

    it('response with Observable', async () => {
        const response = await lastValueFrom(
            client.get('/device/status', { observe: 'response', responseType: 'text' }).pipe(
                catchError(err => {
                    ctx.getLogger().error(err);
                    return of(err as HttpResult<string>);
                })
            )
        ) as HttpResult<string>;
        assertResponse(response);
        expect(response.status).toEqual(200);
        expect(response.body).toEqual('working');
    });

    it('redirect', async () => {
        const response = await lastValueFrom(
            client.get('/device/status', { observe: 'response', params: { redirect: 'reload' }, responseType: 'text' }).pipe(
                catchError(err => {
                    ctx.getLogger().error(err);
                    return of(err as HttpResult<string>);
                })
            )
        ) as HttpResult<string>;
        expect(response.status).toEqual(302);
        expect((response.headers as any)?.location).toEqual('/device/reload');
    });
});
