import { ModuleA, ModuleB, ClassSevice } from './demo';
import { BootApplication } from '../src';
import expect = require('expect');
// import { AopModule } from '@ts-ioc/aop';
// import { LogModule } from '@ts-ioc/logs';


describe('di module', () => {

    // let builder: BootApplication;
    beforeEach(async () => {
        // builder = new BootApplication();
        // builder.use(AopModule).use(LogModule);
    });

    // it('should has no bootstrap', async () => {
    //     let md = await builder.load(ModuleA);
    //     expect(md).not.toBeNull();
    //     expect(md.config.bootstrap).toBeUndefined();
    //     expect(md.container).not.toBeUndefined();
    //     expect(md.container.has('mark')).toBeTruthy();
    //     expect(md.container.get('mark')).toEqual('marked');
    // });

    // it('should has bootstrap and import provider', async () => {
    //     let md = await builder.load(ModuleB);
    //     expect(md).not.toBeNull();
    //     expect(md.config.bootstrap).toEqual(ClassSevice);
    //     expect(md.container).not.toBeUndefined();
    //     expect(md.container.has('mark')).toBeTruthy();
    //     expect(md.container.get('mark')).toEqual('marked');
    // });

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

});

