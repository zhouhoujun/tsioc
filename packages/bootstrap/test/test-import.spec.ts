
import 'mocha';
import { expect } from 'chai';
import { ModuleA, ModuleB, ClassSevice } from './demo';
import { DefaultApplicationBuilder, AnyModuleBuilder } from '../src';

describe('di module', () => {

    let builder: AnyModuleBuilder;
    beforeEach(async () => {
        builder = DefaultApplicationBuilder.create();
    });

    it('should has no bootstrap', async () => {
        let md = await builder.build(ModuleA);
        expect(md).to.not.null
        expect(md.bootstrap).to.undefined;
        expect(md.container).to.not.undefined;
        expect(md.container.has('mark')).to.true;
        expect(md.container.get('mark')).eq('marked');
    });

    it('should has bootstrap and import provider', async () => {
        let md = await builder.build(ModuleB);
        expect(md).to.not.null
        expect(md.bootstrap).to.eq(ClassSevice);
        expect(md.container).to.not.undefined;
        expect(md.container.has('mark')).to.true;
        expect(md.container.get('mark')).eq('marked');
    });

    it('should has bootstrap, and auto wrid mark via inject.', async () => {
        let md = await builder.bootstrap(ModuleB);
        expect(md).to.not.null
        expect(md.bootstrap).to.eq(ClassSevice);
        expect(md.container).to.not.undefined;
        expect(md.container.has('mark')).to.true;
        expect(md.instance.mark).eq('marked');
    });

});

