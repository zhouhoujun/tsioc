import { Injectable, InvocationContext, isPlainObject, isString, Module } from '@tsdi/ioc';
import expect = require('expect');
import { lastValueFrom, Observable, of } from 'rxjs';
import { Application, ApplicationArguments, ApplicationContext, Dispose, Endpoint, EndpointContext, EventHandler, Filter, Interceptor, Payload, PayloadApplicationEvent, Runner, Shutdown, Start } from '../src';

@Injectable()
export class StringFilter implements Filter  {
    intercept(context: EndpointContext<PayloadApplicationEvent>, next: Endpoint<any, any>): Observable<any> {
        if(isString(context.payload.payload)){
            return next.handle(context);
        }
        return of(context);
    }
}

@Injectable()
export class JsonFilter implements Filter  {

    intercept(context: EndpointContext<PayloadApplicationEvent>, next: Endpoint<any, any>): Observable<any> {
        if(isPlainObject(context.payload.payload)){
            return next.handle(context);
        }
        return of(context);
    }

}



@Injectable()
export class PayloadInterceptor implements Interceptor {
    intercept(context: InvocationContext<PayloadApplicationEvent>, next: Endpoint<any, any>): Observable<any> {
        if (isString(context.payload.payload)) {
            context.payload.payload = 'hi ' + context.payload.payload;
        }
        return next.handle(context);
    }

}


@Injectable()
class TestService {


    started = false;
    shutdown = false;
    dispose = false;
    payload!: PayloadApplicationEvent;
    message!: string;


    @Runner()
    runService() {
        console.log('test running.')
    }


    @Start()
    onApplicationStart(): void {
        this.started = true;
    }

    @EventHandler({
        filters:[
            StringFilter
        ],
        interceptors: [
            PayloadInterceptor
        ]
    })
    async handleEvent1(@Payload() payload: string) {
        this.message = payload;
    }

    @EventHandler({
        filters:[
            StringFilter
        ],
        interceptors: [
            PayloadInterceptor
        ]
    })
    async handleEvent2(payload: PayloadApplicationEvent) {
        this.payload = payload;
    }

    name?: string;
    age?: number;

    @EventHandler({
        filters: [JsonFilter]
    })
    async jsonFiledMessage(@Payload('name') name: string, @Payload() age: number ) {
        this.name = name;
        this.age = age;
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

    let ctx: ApplicationContext<MainModule, ApplicationArguments>;
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
        
        expect(testServiceRef?.getInstance().message).toEqual('hi payload message');
        expect(testServiceRef?.getInstance().payload.payload).toEqual('hi hi payload message');

    });


    it('payload filed transport parameter arguments', async () => {

        await lastValueFrom(ctx.publishEvent({name: 'name', age: 20}));
        const testServiceRef = ctx.runners.getRef(TestService);
        expect(testServiceRef).not.toBeNull();
        
        expect(testServiceRef?.getInstance().name).toEqual('name');
        expect(testServiceRef?.getInstance().age).toEqual(20);
    })

    it('OnApplicationShutdown and onApplicationDispose had called.', async () => {
        const runner = ctx.runners.getRef(TestService);
        const service = runner!.getInstance() as TestService;
        await ctx.close();
        expect(service.shutdown).toBeTruthy();
        expect(service.dispose).toBeTruthy();
    })




});
