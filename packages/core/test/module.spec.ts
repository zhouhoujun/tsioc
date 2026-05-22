import { Application, ApplicationContext, Runner } from '../src';
import { Abstract, Injectable, Module } from '@tsdi/ioc';
import { ClassSevice, LoggerAspect, ModuleA, SharedModule } from './demo';
import expect = require('expect');

@Abstract()
abstract class AbstractBootstrapService {
    abstract start(ctx: ApplicationContext): Promise<void>;
}

@Injectable()
class ConcreteBootstrapService extends AbstractBootstrapService {
    calls = 0;
    marker = '';

    @Runner()
    async start(ctx: ApplicationContext): Promise<void> {
        this.calls++;
        this.marker = 'started';
        ctx.setValue('abstract-bootstrap-marker', this.marker);
    }
}

@Module({
    providers: [
        ConcreteBootstrapService,
        { provide: AbstractBootstrapService, useExisting: ConcreteBootstrapService }
    ],
    bootstrap: [AbstractBootstrapService]
})
class AbstractBootstrapModule {
}

describe('Application run with module options', () => {

    it('boot with module metadata.', async () => {
        const ctx = await Application.run({
            module: {
                imports: [
                    SharedModule,
                    ModuleA
                ],
                providers: [
                    LoggerAspect,
                    ClassSevice
                ],
                bootstrap: ClassSevice
            }
        });
        expect(ctx.instance).not.toBeNull();
        const serRef = ctx.runners.getRef(ClassSevice);
        expect(serRef).not.toBeNull();
        expect(serRef!.instance.times).toEqual(1);
        expect(serRef!.instance.mark).toEqual('marked');
        await ctx.close();
    });

    it('bootstraps abstract token using resolved concrete runnable metadata', async () => {
        const ctx = await Application.run(AbstractBootstrapModule);
        expect(ctx.instance).not.toBeNull();
        const ref = ctx.runners.getRef(AbstractBootstrapService);
        expect(ref).not.toBeNull();
        expect(ctx.get('abstract-bootstrap-marker')).toEqual('started');
        expect(ref!.instance).toBeInstanceOf(ConcreteBootstrapService);
        expect((ref!.instance as ConcreteBootstrapService).calls).toEqual(1);
        await ctx.close();
    });

})
