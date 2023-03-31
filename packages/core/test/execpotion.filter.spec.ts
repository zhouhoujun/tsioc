import { ArgumentExecption, Inject, Injectable, Injector, MissingParameterExecption, Module } from '@tsdi/ioc';
import expect = require('expect');
import { lastValueFrom } from 'rxjs';
import { Application, ApplicationContext, ExecptionContext, PayloadApplicationEvent } from '../src';
import { Dispose, EventHandler, ExecptionHandler, Payload, Runner, Shutdown, Start } from '../src/metadata';


@Injectable({
    static: true
})
export class ExecptionHandlers {

    @ExecptionHandler(MissingParameterExecption)
    catchMessing(exception: MissingParameterExecption, context: ExecptionContext, ctx: ApplicationContext) {
        ctx.runners.getRef(TestService).getInstance().missingParameterrExecption = exception;
        return exception;
    }

    @ExecptionHandler(ArgumentExecption, {
        response: 'body'
    })
    catchArgumentError(exception: ArgumentExecption, context: ExecptionContext, ctx: ApplicationContext) {
        ctx.runners.getRef(TestService).getInstance().argumentExecption = exception;
        return exception;
    }

}

@Injectable()
class TestService {


    started = false;
    shutdown = false;
    dispose = false;
    message!: string;

    missingParameterrExecption!: MissingParameterExecption;
    argumentExecption!: ArgumentExecption;

    @Runner()
    runService() {
        console.log('test running.')
    }


    @Start()
    onApplicationStart(): void {
        this.started = true;
    }

    name?: string;
    age?: number;

    @EventHandler()
    async jsonFiledMessage(@Payload('name') name: string, @Payload() age: number) {
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
        TestService,
        ExecptionHandlers
    ],
    bootstrap: [
        TestService
    ]
})
class MainModule {

}


describe('Application Event Execption', () => {

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



    it('payload filed transport parameter arguments', async () => {

        await lastValueFrom(ctx.publishEvent({ name: 'name', age: 20 }));
        const testServiceRef = ctx.runners.getRef(TestService);
        expect(testServiceRef).not.toBeNull();

        expect(testServiceRef.getInstance().name).toEqual('name');
        expect(testServiceRef.getInstance().age).toEqual(20);
    })


    it('payload filed transport parameter arguments message execption', async () => {

        const result = await lastValueFrom(ctx.publishEvent({ name: 'zhansan' }));
        expect(result).toBeInstanceOf(MissingParameterExecption);

        expect((result as MissingParameterExecption).message.indexOf('name: "age"')).toBeGreaterThan(1);

        const testServiceRef = ctx.runners.getRef(TestService);
        expect(testServiceRef).not.toBeNull();
        expect(testServiceRef?.getInstance().name).toEqual('name');
        expect(testServiceRef?.getInstance().age).toEqual(20);
    })

    it('OnApplicationShutdown and onApplicationDispose had called.', async () => {
        const runner = ctx.runners.getRef(TestService);
        const service = runner.getInstance() as TestService;
        await ctx.close();
        expect(service.shutdown).toBeTruthy();
        expect(service.dispose).toBeTruthy();
    })




});
