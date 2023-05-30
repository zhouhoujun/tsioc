import { Application, ApplicationContext, Handle, Payload, RequestPath, Subscribe, TransportErrorResponse } from '@tsdi/core';
import { Injectable, Injector, Module, isArray, isString, tokenId } from '@tsdi/ioc';
import { REDIS_CLIENT_OPTS, RedisClient, RedisClientOpts, RedisModule, RedisServer } from '../src';
import { ServerModule } from '@tsdi/platform-server';
import { LoggerModule } from '@tsdi/logs';
import { catchError, lastValueFrom, of } from 'rxjs';
import expect = require('expect');


const SENSORS = tokenId<string[]>('SENSORS');


@Injectable()
export class TcpService {

    constructor(private client: RedisClient) {

    }


    @Handle({ cmd: 'xxx' })
    async handleMessage(@Payload() message: string) {
        return message;
    }

    @Handle('sensor/message/**', 'tcp')
    async handleMessage1(@Payload() message: string) {
        return message;
    }

    @Subscribe('sensor/:id/start', 'tcp', {
        paths: {
            id: SENSORS
        }
    })
    async subsMessage(@RequestPath() id: string, @Payload() message: string) {
        //todo start sensor
        // this.client.send('');
        return message;
    }
}


@Module({
    baseURL: __dirname,
    imports: [
        ServerModule,
        LoggerModule,
        RedisModule.forMicroService({
            clientOpts: {
                // connectOpts: {
                //     port: 6379
                // },
                timeout: 1000
            },
            serverOpts: {
                // timeout: 1000,
                // connectOpts: {
                //     port: 2000
                // }
            }
        })
    ],
    declarations: [
        TcpService
    ],
    bootstrap: RedisServer
})
export class MicroTestModule {

}



describe('Redis Micro Service', () => {
    let ctx: ApplicationContext;
    let injector: Injector;

    let client: RedisClient;

    before(async () => {
        ctx = await Application.run(MicroTestModule, {
            providers: [
                { provide: SENSORS, useValue: 'sensor01', multi: true },
                { provide: SENSORS, useValue: 'sensor02', multi: true },
            ]
        });
        injector = ctx.injector;
        client = injector.get(RedisClient);
    });


    // it('fetch json', async () => {
    //     const res: any = await lastValueFrom(client.send('510100_full.json')
    //         .pipe(
    //             catchError((err, ct) => {
    //                 ctx.getLogger().error(err);
    //                 return of(err);
    //             })));

    //     expect(res).toBeDefined();
    //     expect(isArray(res.features)).toBeTruthy();
    // })

    it('cmd message', async () => {
        const a = await lastValueFrom(client.send({ cmd: 'xxx' }, {
            payload: {
                message: 'ble'
            }
        })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));

        expect(isString(a)).toBeTruthy();
        expect(a).toEqual('ble');
    });

    it('sensor/message not found', async () => {
        const a = await lastValueFrom(client.send('sensor/message', {
            payload: {
                message: 'ble'
            }
        })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));

        expect(a).toBeInstanceOf(TransportErrorResponse);
        expect(a.status).toEqual(404);
    });

    it('sensor/message/# message', async () => {
        const a = await lastValueFrom(client.send('sensor/message/update', {
            payload: {
                message: 'ble'
            }
        })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));

        expect(isString(a)).toBeTruthy();
        expect(a).toEqual('ble');
    });

    it('Subscribe sensor message', async () => {
        const a = await lastValueFrom(client.send('sensor/sensor01/start', {
            payload: {
                message: 'ble'
            }
        })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));

        expect(isString(a)).toBeTruthy();
        expect(a).toEqual('ble');
    });

    it('Subscribe sensor message not found', async () => {
        const a = await lastValueFrom(client.send('sensor/sensor03/start', {
            payload: {
                message: 'ble'
            }
        })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));

        expect(a).toBeInstanceOf(TransportErrorResponse);
        expect(a.status).toEqual(404);
    });



    after(() => {
        return ctx.destroy();
    })

});
