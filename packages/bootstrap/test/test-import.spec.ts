
import 'mocha';
import { expect } from 'chai';
import { ModuleA, ModuleB, ClassSevice } from './demo';
import { DefaultApplicationBuilder, IModuleBuilder, ModuleInstance } from '../src';

describe('di module', () => {

    let builder: IModuleBuilder<any>;
    beforeEach(async () => {
        builder = new DefaultApplicationBuilder();
    });

    it('show has no bootstrap', async () => {
        let md = await builder.build(ModuleA);
        expect(md).to.not.null
        expect(md.bootstrap).to.undefined;
        expect(md.container).to.not.undefined;
        expect(md.container.has('mark')).to.true;
        expect(md.container.get('mark')).eq('marked');
    });

    it('show has bootstrap and import provider', async () => {
        let md = await builder.build(ModuleB);
        expect(md).to.not.null
        expect(md.bootstrap).to.eq(ClassSevice);
        expect(md.container).to.not.undefined;
        expect(md.container.has('mark')).to.true;
        expect(md.container.get('mark')).eq('marked');
    });

    it('show has no bootstrap', async () => {
        let md: ModuleInstance<ModuleB> = await builder.bootstrap(ModuleB);
        expect(md).to.not.null
        expect(md.bootstrap).to.eq(ClassSevice);
        expect(md.container).to.not.undefined;
        expect(md.container.has('mark')).to.true;
        expect(md['instance']['saied']).eq('marked');
    });

});

