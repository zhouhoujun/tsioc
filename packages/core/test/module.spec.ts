import { Application } from '../src';
import { ClassSevice, LoggerAspect, ModuleA, SharedModule } from './demo';
import expect = require('expect');

describe('Application run with module options', () => {

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
        const serRef = ctx.runners.getRef(ClassSevice);
        expect(serRef).not.toBeNull();
        expect(serRef!.instance.times).toEqual(1);
        // console.log(runner.instance);
        expect(serRef!.instance.mark).toEqual('marked');
        await ctx.close();

    });


})
