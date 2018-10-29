import 'mocha';
import { expect } from 'chai';
import { DefaultContainerBuilder, IContainer } from '../src';
// import { AnnotationAspect } from './aop/AnnotationAspect';
// import { CheckRightAspect } from './aop/CheckRightAspect';
import * as testModules from './extends-test';
import { Person, Home } from './extends-test';

describe('extends test', () => {
    let container: IContainer;
    before(async () => {
        let builder = new DefaultContainerBuilder();
        container = await builder.build(testModules);
    });

    it('should auto wried base class property', () => {
        expect(container.has(Person)).is.true;
        let instance = container.get(Person);
        expect(instance.home).not.undefined;
        expect(instance.container).not.undefined;
        expect(instance.container.has(Home)).eq(true);
        expect(instance.home instanceof Home).eq(true);
        expect(instance.back()).eq('back home');
    });

});

