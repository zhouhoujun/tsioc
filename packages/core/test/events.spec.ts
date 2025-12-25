import { ArgumentException, Injectable, isPlainObject, isString, MissingParameterException, Module, Invocation } from '@tsdi/ioc';
import expect = require('expect');
// import { catchError, lastValueFrom, Observable, of } from 'rxjs';
import { Application, ApplicationArguments, ApplicationContext, Dispose, Handler, EventHandler, Filter, Interceptor, Payload, PayloadApplicationEvent, Runner, Shutdown, Start, RunContext } from '../src';

@Injectable()
export class StringFilter implements Filter  {
    doFilter(event: PayloadApplicationEvent, next: Handler<any, any>, context: RunContext) {
        if(isString(event.payload)){
            return next.handle(event, context);
        }
        return event;
    }
}

@Injectable()
export class JsonFilter implements Filter  {

    doFilter(event: PayloadApplicationEvent, next: Handler<any, any>, context: RunContext) {
        if(isPlainObject(event.payload)){
            return next.handle(event, context);
        }
        return event;
    }

}



@Injectable()
export class PayloadInterceptor implements Interceptor {
    intercept(event: PayloadApplicationEvent, next: Handler<any, any>, context: RunContext) {
        if (isString(event.payload)) {
            event.payload = 'hi ' + event.payload;
        }
        return next.handle(event, context);
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
    providers: [
        TestService
    ],
    bootstrap: [
        TestService
    ]
})
class MainModule {

}



describe('Application Event', () => {

    let ctx: ApplicationContext<MainModule>;
    before(async () => {
        ctx = await Application.run(MainModule);
    })

    it('onApplicationStart called', async () => {

        expect(ctx.instance).not.toBeNull();
        const testServiceRef = ctx.runners.getRef(TestService)!;
        expect(testServiceRef).toBeInstanceOf(Invocation);
        // console.log(runner.instance);
        expect(testServiceRef.instance.started).toBeTruthy();

    });

    it('publish payload event', async () => {

        const res = await ctx.publishEvent('payload message').catch(err => err);
        const testServiceRef = ctx.runners.getRef(TestService)!;
        expect(testServiceRef).not.toBeNull();
        expect(testServiceRef.instance.payload).toBeInstanceOf(PayloadApplicationEvent);
        
        expect(testServiceRef.instance.message).toEqual('hi payload message');
        expect(testServiceRef.instance.payload.payload).toEqual('hi hi payload message');

    });


    it('payload filed transport parameter arguments', async () => {

        await ctx.publishEvent({name: 'name', age: 20});
        const testServiceRef = ctx.runners.getRef(TestService);
        expect(testServiceRef).not.toBeNull();
        
        expect(testServiceRef?.instance.name).toEqual('name');
        expect(testServiceRef?.instance.age).toEqual(20);
    })

    it('payload filed transport parameter missing arguments execption', async () => {

        const result = await ctx.publishEvent({ name: 'zhansan' }).catch(err => err);
        expect(result).toBeInstanceOf(MissingParameterException);

        expect((result as MissingParameterException).message.indexOf('name: "age"')).toBeGreaterThan(1);

        const testServiceRef = ctx.runners.getRef(TestService);
        expect(testServiceRef).not.toBeNull();
        expect(testServiceRef?.instance.name).toEqual('name');
        expect(testServiceRef?.instance.age).toEqual(20);
    })

    it('payload filed transport parameter arguments execption', async () => {

        const result = await ctx.publishEvent({ name: 'zhansan1', age: 'zzz' }).catch(err => err);
        expect(result).toBeInstanceOf(ArgumentException);

        expect(result.message).toEqual(`InvalidPipeArgument: 'zzz' for pipe 'number'`);
        const testServiceRef = ctx.runners.getRef(TestService);
        expect(testServiceRef).not.toBeNull();
        expect(testServiceRef?.instance.name).toEqual('name');
        expect(testServiceRef?.instance.age).toEqual(20);
    })

    it('OnApplicationShutdown and onApplicationDispose had called.', async () => {
        const runner = ctx.runners.getRef(TestService);
        const service = runner!.instance as TestService;
        await ctx.close();
        expect(service.shutdown).toBeTruthy();
        expect(service.dispose).toBeTruthy();
    })




});
