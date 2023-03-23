import { Injectable, InvocationContext, isString, Module } from '@tsdi/ioc';
import expect = require('expect');
import { lastValueFrom, Observable } from 'rxjs';
import { Application, ApplicationContext, Dispose, Endpoint, EventHandler, Interceptor, PayloadApplicationEvent, Runner, Shutdown, Start } from '../src';



@Injectable()
export class PayloadInterceptor implements Interceptor {
    intercept(input: PayloadApplicationEvent, next: Endpoint<any, any>, context: InvocationContext<any>): Observable<any> {
        if (isString(input.payload)) {
            input.payload = 'hi ' + input.payload;
        }
        return next.handle(input, context);
    }

}


@Injectable()
class TestService {


    started = false;
    shutdown = false;
    dispose = false;
    payload!: PayloadApplicationEvent;
    @Runner()
    runService() {
        console.log('test running.')
    }


    @Start()
    onApplicationStart(): void {
        this.started = true;
    }

    @EventHandler({
        interceptors: [
            PayloadInterceptor
        ]
    })
    async handleEvent(payload: PayloadApplicationEvent) {
        this.payload = payload;
    }

    @Shutdown()
    onApplicationShutdown(): void {
        this.shutdown = true;
    }

    @Dispose()
    onApplicationDispose(): void {
        this.dispose = true;
    }
}

@Module({
    imports: [

    ],
    declarations: [
        TestService
    ],
    bootstrap: [
        TestService
    ]
})
class MainModule {

}



describe('Application Event', () => {

    let ctx: ApplicationContext;
    before(async () => {
        ctx = await Application.run(MainModule);
    })

    it('onApplicationStart called', async () => {

        expect(ctx.instance).not.toBeNull();
        const testServiceRef = ctx.runners.getRef(TestService);
        expect(testServiceRef).not.toBeNull();
        // console.log(runner.instance);
        expect(testServiceRef!.getInstance().started).toBeTruthy();

    });

    it('publish payload event', async () => {

        await lastValueFrom(ctx.publishEvent('payload message'));
        const testServiceRef = ctx.runners.getRef(TestService);
        expect(testServiceRef).not.toBeNull();
        expect(testServiceRef!.getInstance().payload).toBeInstanceOf(PayloadApplicationEvent);
        expect(testServiceRef?.getInstance().payload.payload).toEqual('hi payload message');

    });


    it('OnApplicationShutdown and onApplicationDispose had called.', async () => {
        const runner = ctx.runners.getRef(TestService);
        const service = runner!.getInstance() as TestService;
        await ctx.close();
        expect(service.shutdown).toBeTruthy();
        expect(service.dispose).toBeTruthy();
    })




});
