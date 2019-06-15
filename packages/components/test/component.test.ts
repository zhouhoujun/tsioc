import { DIModule, BootApplication, BootContext, BuilderService, BuildHandleRegisterer } from '@tsdi/boot';
import { Suite, Test, Before } from '@tsdi/unit';
import { Component, Input, ComponentsModule, ElementModule, ComponentBuilder, ElementDecoratorRegisterer, ComponentSelectorHandle } from '../src';
import expect = require('expect');


@Component('selector1')
class Component1 {
    @Input() name: string;

    constructor() {

    }
}


@Component('selector2')
class Component2 extends Component1 {
    @Input() address: string;
}

@DIModule({
    imports: [
        Component1,
        Component2
    ],
    bootstrap: Component2
})
class ComponentTestMd {

}


@Component('comp')
class Components {

    @Input() cmp1: Component1;

    @Input() cmp2: Component2;

}



@Suite('component test')
export class CTest {

    ctx: BootContext;

    @Before()
    async init() {
        this.ctx = await BootApplication.run({ module: ComponentTestMd, template: { name: 'test', address: 'cd' } }, [ComponentsModule, ElementModule]);
    }

    @Test('can bind bootsrap component')
    async test1() {
        expect(this.ctx.getBootTarget() instanceof Component2).toBeTruthy();
        expect(this.ctx.getBootTarget().name).toEqual('test');
        expect(this.ctx.getBootTarget().address).toEqual('cd');
    }

    @Test('can reolve component template')
    async test2() {
        let container = this.ctx.getRaiseContainer();
        let comp1 = await container.get(ComponentBuilder).resolveTemplate({ template: { element: 'selector1', name: 'test1' } });
        let comp11 = await container.get(BuilderService).resolve(Component1, { template: { name: 'test1' } });
        console.log('comp1:', comp1);
        console.log('comp11:', comp11);
        expect(comp1 instanceof Component1).toBeTruthy();

    }
}
