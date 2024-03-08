import { ArgumentExecption, Injectable, InvocationContext, isPlainObject, isString, MissingParameterExecption, Module, ReflectiveRef } from '@tsdi/ioc';
import expect = require('expect');
import { catchError, lastValueFrom, Observable, of } from 'rxjs';
import { Application, ApplicationArguments, ApplicationContext, Dispose, GuardHandler, HandlerContext, EventHandler, Filter, Interceptor, Payload, PayloadApplicationEvent, Runner, Shutdown, Start } from '../src';

@Injectable()
export class StringFilter implements Filter  {
    intercept(context: HandlerContext<PayloadApplicationEvent>, next: GuardHandler<any, any>): Observable<any> {
        if(isString(context.args.payload)){
            return next.handle(context);
        }
        return of(context);
    }
}

@Injectable()
export class JsonFilter implements Filter  {

    intercept(context: HandlerContext<PayloadApplicationEvent>, next: GuardHandler<any, any>): Observable<any> {
        if(isPlainObject(context.args.payload)){
            return next.handle(context);
        }
        return of(context);
    }

}



@Injectable()
export class PayloadInterceptor implements Interceptor {
    intercept(context: InvocationContext<PayloadApplicationEvent>, next: GuardHandler<any, any>): Observable<any> {
        if (isString(context.args.payload)) {
            context.args.payload = 'hi ' + context.args.payload;
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
        expect(testServiceRef).toBeInstanceOf(ReflectiveRef);
        // console.log(runner.instance);
        expect(testServiceRef.getInstance().started).toBeTruthy();

    });

    it('publish payload event', async () => {

        await lastValueFrom(ctx.publishEvent('payload message'));
        const testServiceRef = ctx.runners.getRef(TestService)!;
        expect(testServiceRef).not.toBeNull();
        expect(testServiceRef.getInstance().payload).toBeInstanceOf(PayloadApplicationEvent);
        
        expect(testServiceRef.getInstance().message).toEqual('hi payload message');
        expect(testServiceRef.getInstance().payload.payload).toEqual('hi hi payload message');

    });


    it('payload filed transport parameter arguments', async () => {

        await lastValueFrom(ctx.publishEvent({name: 'name', age: 20}));
        const testServiceRef = ctx.runners.getRef(TestService);
        expect(testServiceRef).not.toBeNull();
        
        expect(testServiceRef?.getInstance().name).toEqual('name');
        expect(testServiceRef?.getInstance().age).toEqual(20);
    })

    it('payload filed transport parameter missing arguments execption', async () => {

        const result = await lastValueFrom(ctx.publishEvent({ name: 'zhansan' }).pipe(catchError(err=> of(err))));
        expect(result).toBeInstanceOf(MissingParameterExecption);

        expect((result as MissingParameterExecption).message.indexOf('name: "age"')).toBeGreaterThan(1);

        const testServiceRef = ctx.runners.getRef(TestService);
        expect(testServiceRef).not.toBeNull();
        expect(testServiceRef?.getInstance().name).toEqual('name');
        expect(testServiceRef?.getInstance().age).toEqual(20);
    })

    it('payload filed transport parameter arguments execption', async () => {

        const result = await lastValueFrom(ctx.publishEvent({ name: 'zhansan1', age: 'zzz' }).pipe(catchError(err=> of(err))));
        expect(result).toBeInstanceOf(ArgumentExecption);

        expect(result.message).toEqual(`InvalidPipeArgument: 'zzz' for pipe 'number'`);
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
