import { Application } from '../src';
import { ClassSevice, LoggerAspect, ModuleA, SharedModule } from './demo';
import expect = require('expect');

describe('module metadata', () => {

    it('boot with module metadata.', async () => {
        const v = 1;
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
        expect(ctx.runners.bootstraps[0]).not.toBeNull();
        const runner = ctx.runners.bootstraps[0];
        // console.log(runner.instance);
        expect(runner.instance.mark).toEqual('marked');
        await ctx.destroy();

    });


})
