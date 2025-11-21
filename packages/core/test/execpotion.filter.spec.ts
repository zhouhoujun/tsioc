import { ArgumentException, Injectable, MissingParameterException, Module } from '@tsdi/ioc';
import expect = require('expect');
// import { catchError, lastValueFrom, of } from 'rxjs';
import { Application, ApplicationContext, RunableContext } from '../src';
import { Dispose, EventHandler, ExceptionHandler, Payload, Runner, Shutdown, Start } from '../src/metadata';


@Injectable({
    static: true
})
export class ExceptionHandlers {

    @ExceptionHandler(MissingParameterException)
    catchMessing(exception: MissingParameterException, context: RunableContext, ctx: ApplicationContext) {
        ctx.runners.getRef(TestService).instance.missingParameterrException = exception;
        return exception;
    }

    @ExceptionHandler(ArgumentException, {
        response: 'body'
    })
    catchArgumentError(exception: ArgumentException, context: RunableContext, ctx: ApplicationContext) {
        ctx.runners.getRef(TestService).instance.argumentException = exception;
        return exception;
    }

}

@Injectable()
class TestService {


    started = false;
    shutdown = false;
    dispose = false;
    message!: string;

    missingParameterrException!: MissingParameterException;
    argumentException!: ArgumentException;

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
    providers:[
        TestService,
        ExceptionHandlers
    ],
    declarations: [
    ],
    bootstrap: [
        TestService
    ]
})
class MainModule {

}


describe('Application Event Exception', () => {

    let ctx: ApplicationContext;
    before(async () => {
        ctx = await Application.run(MainModule);
    })

    it('onApplicationStart called', async () => {

        expect(ctx.instance).not.toBeNull();
        const testServiceRef = ctx.runners.getRef(TestService);
        expect(testServiceRef).not.toBeNull();
        // console.log(runner.instance);
        expect(testServiceRef.instance.started).toBeTruthy();

    });



    it('payload filed transport parameter arguments', async () => {

        await ctx.publishEvent({ name: 'name', age: 20 }).catch(err => err);
        const testServiceRef = ctx.runners.getRef(TestService);
        expect(testServiceRef).not.toBeNull();

        expect(testServiceRef.instance.name).toEqual('name');
        expect(testServiceRef.instance.age).toEqual(20);
    })


    it('payload filed transport parameter arguments message execption', async () => {

        const result = await ctx.publishEvent({ name: 'zhansan' }).catch(err => err);
        expect(result).toBeInstanceOf(MissingParameterException);

        expect((result as MissingParameterException).message.indexOf('name: "age"')).toBeGreaterThan(1);

        const testServiceRef = ctx.runners.getRef(TestService);
        expect(testServiceRef).not.toBeNull();
        expect(testServiceRef?.instance.name).toEqual('name');
        expect(testServiceRef?.instance.age).toEqual(20);
    })

    it('OnApplicationShutdown and onApplicationDispose had called.', async () => {
        const runner = ctx.runners.getRef(TestService);
        const service = runner.instance;
        await ctx.close();
        expect(service.shutdown).toBeTruthy();
        expect(service.dispose).toBeTruthy();
    })




});
