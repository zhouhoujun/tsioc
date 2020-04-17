import { ModuleA, ModuleB, ClassSevice, SubMessageQueue } from './demo';
import { BootApplication, RootMessageQueueToken } from '../src';
import expect = require('expect');


describe('di module', () => {

    it('should has bootstrap, and auto wrid mark via inject.', async () => {
        let ctx = await BootApplication.run(ModuleB);
        expect(ctx.target).not.toBeNull();
        expect(ctx.boot).not.toBeNull();
        // expect(md.bootstrap).to.eq(ClassSevice);
        // expect(md.container).to.not.undefined;
        // expect(md.container.has('mark')).to.true;
        console.log(ctx.boot.mark);
        expect(ctx.boot.mark).toEqual('marked');
        // expect(md.state).eq('started');
    });


    it('message test.', async () => {
        let ctx = await BootApplication.run(ModuleB);
        ctx.injector.get(SubMessageQueue).subscribe((ctx, next) => {
            if (ctx.event === 'test') {
                console.log('message queue test: ' + ctx.data);
            }
            return next()
        })
        expect(ctx.injector.get(SubMessageQueue)['handles'].length).toEqual(1);
        ctx.getContainer().get(RootMessageQueueToken)
            .send('test', 'hello');
    });

    it('options test.', async () => {
        let ctx = await BootApplication.run({
            type: ModuleB,
            providers: [
                {
                    provide: 'ttk',
                    useValue: 'ccc'
                }
            ]
        });

        expect(ctx.boot).toBeInstanceOf(ClassSevice);
        expect(ctx.providers.get('ttk')).toEqual('ccc');
        expect(ctx.injector.get('ttk')).toEqual('ccc');
    });


});

