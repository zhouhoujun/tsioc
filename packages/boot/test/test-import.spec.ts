import { ModuleA, ModuleB, ClassSevice, SubMessageQueue } from './demo';
import { BootApplication, RootMessageQueueToken } from '../src';
import expect = require('expect');


describe('di module', () => {

    it('should has bootstrap, and auto wrid mark via inject.', async () => {
        let ctx = await BootApplication.run(ModuleB);
        expect(ctx.target).not.toBeNull();
        expect(ctx.bootstrap).not.toBeNull();
        // expect(md.bootstrap).to.eq(ClassSevice);
        // expect(md.container).to.not.undefined;
        // expect(md.container.has('mark')).to.true;
        console.log(ctx.bootstrap.mark);
        expect(ctx.bootstrap.mark).toEqual('marked');
        // expect(md.state).eq('started');
    });


    it('message test.', async () => {
        let ctx = await BootApplication.run(ModuleB);
        ctx.getContainer().get(SubMessageQueue).subscribe((ctx, next) => {
            if (ctx.event === 'test') {
                console.log('message queue test: ' + ctx.data);
            }
            return next()
        })
        expect(ctx.getContainer().get(SubMessageQueue)['handles'].length).toEqual(1);
        ctx.getContainer().get(RootMessageQueueToken)
            .send('test', 'hello');
    });


});

