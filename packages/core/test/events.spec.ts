import { Injectable, Module } from '@tsdi/ioc';
import expect = require('expect');
import { Application, ApplicationContext, Dispose, Runner, Shutdown, Start } from '../src';


@Injectable()
class TestService  {


    started = false;
    shutdown = false;
    dispose = false;

    @Runner()
    runService() {
        console.log('test running.')
    }


    @Start()
    onApplicationStart(): void {
        this.started = true;
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


    it('OnApplicationShutdown called.', async () => {
        const runner = ctx.runners.getRef(TestService);
        const service = runner!.getInstance() as TestService;
        await ctx.destroy();
        expect(service.shutdown).toBeTruthy();
    })


});
