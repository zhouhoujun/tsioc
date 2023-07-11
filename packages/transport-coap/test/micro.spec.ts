import { Application, ApplicationContext, Handle, Payload, RequestPath, Subscribe, TransportErrorResponse } from '@tsdi/core';
import { Injectable, Injector, Module, isArray, isString, tokenId } from '@tsdi/ioc';
import { COAP_MICRO_SERV_INTERCEPTORS, CoapClient, CoapClientModule, CoapMicroService, CoapMicroServModule } from '../src';
import { ServerModule } from '@tsdi/platform-server';
import { LoggerModule } from '@tsdi/logs';
import { catchError, lastValueFrom, of } from 'rxjs';
import expect = require('expect');
import { BigFileInterceptor } from './BigFileInterceptor';


const SENSORS = tokenId<string[]>('SENSORS');


@Injectable()
export class CoapService {

    constructor(private client: CoapClient) {

    }


    @Handle({ cmd: 'xxx' })
    async handleMessage(@Payload() message: string) {
        return message;
    }

    @Handle('sensor.message.*', 'coap')
    async handleMessage1(@Payload() message: string) {
        return message;
    }

    @Handle('sensor/message/**', 'coap')
    async handleMessage2(@Payload() message: string) {
        return message;
    }

    @Subscribe('sensor/:id/start', 'coap', {
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
        // CoapClientModule,
        CoapClientModule.withOption({
            clientOpts: {
                transportOpts: {
                    // agent: 
                }
                // timeout: 1000
            }
        }),
        
        CoapMicroServModule
        // CoapMicroServiceModule.withOption({
        //     serverOpts: {
        //         // timeout: 1000,
        //         // connectOpts: {
        //         //     port: 2000
        //         // }
        //     }
        // })
    ],
    declarations: [
        CoapService
    ],
    bootstrap: CoapMicroService
})
export class MicroTestModule {

}



describe('Coap Micro Service', () => {
    let ctx: ApplicationContext;
    let injector: Injector;

    let client: CoapClient;

    before(async () => {
        ctx = await Application.run(MicroTestModule, {
            providers: [
                { provide: COAP_MICRO_SERV_INTERCEPTORS, useClass: BigFileInterceptor, multi: true },
                { provide: SENSORS, useValue: 'sensor01', multi: true },
                { provide: SENSORS, useValue: 'sensor02', multi: true },
            ]
        });
        injector = ctx.injector;
        client = injector.get(CoapClient);
    });


    it('fetch json', async () => {
        const res: any = await lastValueFrom(client.send('/content/510100_full.json')
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));

        expect(res).toBeDefined();
        expect(isArray(res.features)).toBeTruthy();
    })

    it('fetch big json', async () => {
        const res: any = await lastValueFrom(client.send('/content/big.json')
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));

        expect(res).toBeDefined();
        expect(isArray(res.features)).toBeTruthy();
    })

    it('fetch json 2', async () => {
        const res: any = await lastValueFrom(client.send('/content/jsons/data1.json')
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));

        expect(res).toBeDefined();
        expect(res.test).toEqual('ok');
    })

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

    it('sensor.message not found', async () => {
        const a = await lastValueFrom(client.send('sensor.message', {
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
        expect(a.status).toEqual('4.04');
    });

    it('sensor/message/** message', async () => {
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
        expect(a.status).toEqual('4.04');
    });

    it('sensor/message/** message', async () => {
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
        expect(a.status).toEqual('4.04');
    });



    after(() => {
        return ctx.destroy();
    })

});
