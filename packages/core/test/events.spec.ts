import { Injectable } from '@tsdi/ioc';
import expect = require('expect');
import { Application, ApplicationContext, LoggerModule, Module, OnApplicationShutdown, OnApplicationStart, RunnableRef, RunnableRef, Runner } from '../src';


@Injectable()
class TestService implements OnApplicationStart, OnApplicationShutdown {

    
    started = false;
    shutdown = false;

    @Runner()
    runService() {
        console.log('test running.')
    }

    onApplicationShutdown(): void {
        this.shutdown = true;
    }

    onApplicationStart(): void {
        this.started = true;
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
        expect(ctx.runners.bootstraps[0]).not.toBeNull();
        const runner = ctx.runners.bootstraps[0] as RunnableRef<TestService>;
        // console.log(runner.instance);
        expect(runner.instance.started).toBeTruthy();

    });


    it('OnApplicationShutdown called.', async () => {
        const runner = ctx.runners.bootstraps[0] as RunnableRef<TestService>;
        const service = runner.instance as TestService;
        await ctx.destroy();
        expect(service.shutdown).toBeTruthy();
    })


});
