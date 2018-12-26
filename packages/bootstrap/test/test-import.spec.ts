
import 'mocha';
import { expect } from 'chai';
import { ModuleA, ModuleB, ClassSevice } from './demo';
import { ApplicationBuilder, IApplicationBuilder } from '../src';
// import { AopModule } from '@ts-ioc/aop';
// import { LogModule } from '@ts-ioc/logs';


describe('di module', () => {

    let builder: IApplicationBuilder<any>;
    beforeEach(async () => {
        builder = new ApplicationBuilder();
        // builder.use(AopModule).use(LogModule);
    });

    it('should has no bootstrap', async () => {
        let md = await builder.load(ModuleA);
        expect(md).to.not.null
        expect(md.config.bootstrap).to.undefined;
        expect(md.container).to.not.undefined;
        expect(md.container.has('mark')).to.true;
        expect(md.container.get('mark')).eq('marked');
    });

    it('should has bootstrap and import provider', async () => {
        let md = await builder.load(ModuleB);
        expect(md).to.not.null
        expect(md.config.bootstrap).to.eq(ClassSevice);
        expect(md.container).to.not.undefined;
        expect(md.container.has('mark')).to.true;
        expect(md.container.get('mark')).eq('marked');
    });

    it('should has bootstrap, and auto wrid mark via inject.', async () => {
        let md = await builder.bootstrap(ModuleB) as ClassSevice;
        expect(md).to.not.null;
        // expect(md.bootstrap).to.eq(ClassSevice);
        // expect(md.container).to.not.undefined;
        // expect(md.container.has('mark')).to.true;
        expect(md.mark).eq('marked');
        // expect(md.state).eq('started');
    });

});

