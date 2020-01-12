import { DIModule, BootApplication, BootContext, BuilderService } from '@tsdi/boot';
import { Suite, Test, Before } from '@tsdi/unit';
import { Component, Input, ComponentsModule, ElementModule, ComponentBuilder, RefChild, NonSerialize, ElementNode, ComponentRef, ElementRef, TemplateRef } from '../src';
import expect = require('expect');
import { Inject, Injectable, Autorun, IInjector, INJECTOR } from '@tsdi/ioc';
import { IContainer, ContainerToken, ICoreInjector } from '@tsdi/core';


@Component('selector1')
class Component1 {
    @Input() name: string;
    @Input() selector: string;

    constructor() {

    }
}


@Component('selector2')
class Component2 extends Component1 {
    @Input('test', 'default test') defaultTest: string;
    @Input() address: string;
}


@Component({
    selector: 'comp',
    template: [
        {
            element: 'selector1',
            selector: 'comp1',
            name: 'binding=: name'
        },
        {
            element: 'selector2',
            selector: 'cmp2',
            name: 'binding: name',
            address: 'binding: address'
        }
    ]
})
class Components {

    @Input() name: string;

    @NonSerialize()
    @Input()
    address: string;

    @RefChild('comp1') cmp1: Component1;

    @RefChild() cmp2: Component2;

}

@Component('selector3')
class Component3 extends Component1 {
    @Input() address: string;
    @Input() phone: string;
}

@Injectable()
class CustomeService {
    @Inject()
    builder: ComponentBuilder;

    @Inject(INJECTOR)
    injector: ICoreInjector;

    createComponent3() {
        // console.log(this.container.resolve(BuildHandleRegisterer));
        return this.builder.resolveTemplate({ template: { element: 'selector3', name: 'test3', address: 'address3', phone: '+86177000000010' }, injector: this.injector })
    }
}

@DIModule({
    imports: [
        Components,
        Component3,
        CustomeService
    ],
    exports: [
        Component3,
        CustomeService
    ]
})
class SubModule {

}



@Component({
    selector: 'obj-comp',
    template: [
        {
            element: 'selector1',
            selector: 'comp1',
            name: 'binding=: options.name'
        },
        {
            element: 'selector2',
            selector: 'cmp2',
            name: 'binding: options.name',
            address: 'binding: options.address'
        }
    ]
})
class ObjectComponent {

    @Input() options: any;

    @RefChild('comp1') cmp1: Component1;

    @RefChild() cmp2: Component2;

}

@DIModule({
    imports: [
        Component1,
        Component2,
        ObjectComponent,
        SubModule
    ],
    bootstrap: Component2
})
class ComponentTestMd {

}


@DIModule({
    imports: [
        ComponentsModule,
        ElementModule,
        Component1,
        Component2,
        // Component3,
        SubModule
    ],
    exports: [
        SubModule
    ],
    bootstrap: Component3
})
class ComponentTestMd2 {

}


@DIModule({
    imports: [
        ComponentsModule,
        ElementModule,
        Component1,
        Component3,
        CustomeService
    ],
    exports: [
        Component1,
        Component3,
        CustomeService
    ]
})
class SubModule2 {

}

@DIModule({
    imports: [
        SubModule2
    ],
    exports: [
        SubModule2
    ],
    bootstrap: Component1
})
class ComponentTestMd3 {

}



@Component('list')
class ListBox {
    @Input(ElementNode) items: ElementNode[];
}

@Component('columnDef')
class ColumnDef {
    @Input() name: string;
    @Input() field: string;
    @Input() type: string;
}

@Component('columns')
class Columns {
    @Input(ColumnDef) defs: ColumnDef[];
}

@DIModule({
    regIn: 'root',
    imports: [
        ComponentsModule,
        ElementModule,
        ListBox,
        Columns,
        ColumnDef
    ]
})
class ListModule {

}


@Suite('component test')
export class CTest {

    ctx: BootContext;

    @Before()
    async init() {
        this.ctx = await BootApplication.run({ type: ComponentTestMd, template: { name: 'test', address: 'cd' } }, [ComponentsModule, ElementModule]);
    }

    @Test('can bind bootsrap component')
    async test1() {
        expect(this.ctx.getBootTarget() instanceof Component2).toBeTruthy();
        expect(this.ctx.getBootTarget().name).toEqual('test');
        expect(this.ctx.getBootTarget().defaultTest).toEqual('default test');
        expect(this.ctx.getBootTarget().address).toEqual('cd');
    }

    @Test('can resolve component template')
    async test2() {
        let container = this.ctx.getContainer();
        let comp1Ref = await container.get(ComponentBuilder).resolveRef({ template: { element: 'selector1', name: 'test1' }, injector: this.ctx.injector }) as TemplateRef<Component1>;
        let comp11 = await container.get(ComponentBuilder).resolve({ type: Component1, template: { name: 'test1' } });
        // console.log('comp1:', comp1);
        console.log('comp11:', comp11);
        expect(comp1Ref instanceof TemplateRef).toBeTruthy();
        let comp1 = comp1Ref.rootNodes[0] as ElementRef<Component1>;
        expect(comp1.nativeElement.name).toEqual('test1')
        expect(comp11 instanceof Component1).toBeTruthy();
        expect(comp11.name).toEqual('test1');
    }

    @Test('can run component template')
    async testRun() {

        let ctx = await BootApplication.run({
            deps: [ComponentsModule, ElementModule, Component1],
            template: { element: 'selector1', name: 'test1' }
        });

        let comp1 = ctx.getBootTarget() as TemplateRef<Component1>;
        expect(comp1 instanceof TemplateRef).toBeTruthy();
        expect((comp1.rootNodes[0] as ElementRef<Component1>).nativeElement?.name).toEqual('test1');
    }


    @Test('can resolve component template in sub module')
    async test3() {
        let service = this.ctx.injector.get(CustomeService);
        expect(service instanceof CustomeService).toBeTruthy();
        let cmpRef = await service.createComponent3() as TemplateRef;
        let comp3 = cmpRef.rootNodes[0] as ElementRef<Component3>;
        console.log('comp3:', comp3.nativeElement);
        expect(comp3.nativeElement instanceof Component3).toBeTruthy();
        expect(comp3.nativeElement.phone).toEqual('+86177000000010');
    }

    @Test('can resolve component template by sub module')
    async test4() {
        let ctx = await BootApplication.run({ type: ComponentTestMd2, template: { name: 'test', address: 'cd', phone: '17000000000' } });
        expect(ctx.getBootTarget() instanceof Component3).toBeTruthy();
        expect(ctx.getBootTarget().name).toEqual('test');
        expect(ctx.getBootTarget().address).toEqual('cd');
        expect(ctx.getBootTarget().phone).toEqual('17000000000');
    }


    @Test('can resolve component template in sub module by sub module')
    async test5() {
        let ctx = await BootApplication.run({ type: ComponentTestMd2, template: { name: 'test', address: 'cd', phone: '17000000000' } });
        let injector = ctx.injector;
        // console.log(container);
        console.log(ctx.getBootTarget());
        expect(ctx.getBootTarget() instanceof Component3).toBeTruthy();
        expect(ctx.getBootTarget().phone).toEqual('17000000000');
        let service = injector.get(CustomeService);
        expect(service instanceof CustomeService).toBeTruthy();
        let cmpRef = await service.createComponent3() as TemplateRef;
        let comp3 = cmpRef.rootNodes[0] as ElementRef<Component3>;
        console.log('comp3 :', comp3.nativeElement);
        expect(comp3.nativeElement instanceof Component3).toBeTruthy();
        expect(comp3.nativeElement.phone).toEqual('+86177000000010');
        console.log(injector.get(ComponentBuilder).serialize(comp3))
    }

    @Test('can boot sub module component')
    async test6() {
        let ctx = await BootApplication.run({ type: ComponentTestMd3, template: { name: 'test', address: 'cd', phone: '17000000000' } });
        let container = ctx.getContainer();
        // console.log(container);
        console.log(container.get(Component1));
        // console.log(ctx.getBootTarget());
        expect(ctx.getBootTarget() instanceof Component1).toBeTruthy();
        expect(ctx.getBootTarget().name).toEqual('test');
    }

    @Test('can get refchild')
    async test7() {
        let ctx = await BootApplication.run({ type: ComponentTestMd2, template: { name: 'test', address: 'cd', phone: '17000000000' } });
        let injector = ctx.injector;
        expect(ctx.getBootTarget() instanceof Component3).toBeTruthy();
        expect(ctx.getBootTarget().phone).toEqual('17000000000');
        let compRef = await injector.get(ComponentBuilder)
            .resolveTemplate({ template: { element: 'comp', name: 'test111', address: 'cd111' }, injector: ctx.injector }) as TemplateRef;

        expect(compRef instanceof TemplateRef).toBeTruthy();
        let comp = compRef.rootNodes[0] as ComponentRef<Components>;
        console.log('comp:', comp);
        expect(comp.instance instanceof Components).toBeTruthy();
        expect(comp.instance.name).toEqual('test111');
        expect(comp.instance.address).toEqual('cd111');

        expect(comp.instance.cmp1 instanceof Component1).toBeTruthy();
        expect(comp.instance.cmp2 instanceof Component2).toBeTruthy();
        expect(comp.instance.cmp1.name).toEqual('test111');
        expect(comp.instance.cmp2.name).toEqual('test111');
        expect(comp.instance.cmp2.address).toEqual('cd111');
        let json = injector.get(ComponentBuilder).serialize(comp.instance);
        console.log(json);
        expect(json.element).toEqual('comp');
        expect(json.name).toEqual('test111');
        expect(json.address).toBeUndefined();
    }

    @Test('can get refchild, two way binding name')
    async test8() {
        let ctx = await BootApplication.run({ type: ComponentTestMd2, template: { name: 'test', address: 'cd', phone: '17000000000' } });
        let injector = ctx.injector;
        expect(ctx.getBootTarget() instanceof Component3).toBeTruthy();
        expect(ctx.getBootTarget().phone).toEqual('17000000000');
        let compRef = await injector.get(ComponentBuilder)
            .resolveTemplate({ template: { element: 'comp', name: 'test111', address: 'cd111' }, injector: ctx.injector }) as TemplateRef;

        let comp = compRef.rootNodes[0] as ComponentRef<Components>;
        expect(comp.instance instanceof Components).toBeTruthy();
        expect(comp.instance.name).toEqual('test111');
        expect(comp.instance.address).toEqual('cd111');
        console.log('comp:', comp);
        expect(comp.instance.cmp1 instanceof Component1).toBeTruthy();
        expect(comp.instance.cmp2 instanceof Component2).toBeTruthy();
        expect(comp.instance.cmp1.name).toEqual('test111');
        expect(comp.instance.cmp2.name).toEqual('test111');
        expect(comp.instance.cmp2.address).toEqual('cd111');
        comp.instance.cmp1.name = 'twoway-bind';
        expect(comp.instance.name).toEqual('twoway-bind');
        expect(comp.instance.cmp2.name).toEqual('twoway-bind');
        comp.instance.cmp2.name = 'oneway-bind';
        expect(comp.instance.name).toEqual('twoway-bind');
        expect(comp.instance.cmp2.name).toEqual('oneway-bind');
    }

    @Test('can binding sub field')
    async test9() {
        let injector = this.ctx.injector;
        let compRef = await injector.get(ComponentBuilder).resolveTemplate({
            injector: injector,
            template: {
                element: 'obj-comp',
                options: { name: 'testobject', address: 'chengdu' }
            }
        }) as TemplateRef;
        let comp =  compRef.rootNodes[0] as ComponentRef<ObjectComponent>;
        console.log('test9:', comp);
        expect(comp.instance.options.name).toEqual('testobject');
        expect(comp.instance.options.address).toEqual('chengdu');
        // console.log('comp:', comp);
        expect(comp.instance.cmp1 instanceof Component1).toBeTruthy();
        expect(comp.instance.cmp2 instanceof Component2).toBeTruthy();
        expect(comp.instance.cmp1.name).toEqual('testobject');
        expect(comp.instance.cmp2.name).toEqual('testobject');
        expect(comp.instance.cmp2.address).toEqual('chengdu');
        comp.instance.cmp1.name = 'twoway-bind';
        expect(comp.instance.options.name).toEqual('twoway-bind');
        expect(comp.instance.cmp2.name).toEqual('twoway-bind');
        comp.instance.cmp2.name = 'oneway-bind';
        expect(comp.instance.options.name).toEqual('twoway-bind');
        expect(comp.instance.cmp2.name).toEqual('oneway-bind');
    }


    //     @Component('columnDef')
    // class ColumnDef {
    //     @Input() name: string;
    //     @Input() field: string;
    //     @Input() type: string;
    // }
    @Test('can run component template deep arr')
    async test_deep_arr() {

        let ctx = await BootApplication.run({
            deps: [ListModule],
            template: {
                element: 'list',
                items: [
                    {
                        element: 'columns',
                        defs: [
                            {
                                element: 'columnDef',
                                name: 'name',
                                field: 'name',
                                type: 'string'
                            },
                            {
                                element: 'columnDef',
                                name: 'phone',
                                field: 'phone',
                                type: 'string'
                            }
                        ]
                    }
                ]
            }
        });

        let tempRef = ctx.getBootTarget() as TemplateRef;
        expect(tempRef instanceof TemplateRef).toBeTruthy();
        let comp1 = (tempRef.rootNodes[0] as ElementRef<ListBox>).nativeElement;
        expect(comp1 instanceof ListBox).toBeTruthy();
        expect(comp1.items.length).toEqual(1);
        console.log(comp1.items[0]);
    }
}
