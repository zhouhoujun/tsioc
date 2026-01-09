import { Module, Runtime } from '@tsdi/ioc';
import { ComponentFactory } from './refs/component';
import { ComponentFactoryImpl } from './impl/component';
// import { ReactiveEffect } from './effect';
// import { DefaultReactiveEffect } from './impl/effect';
import { VForDirective } from './directives/for.dir';
import { VElseDirective, VElseIfDirective, VIfDirective } from './directives/if.dir';
import { DirectiveFactory } from './refs/directive';
import { DirectiveFactoryImpl } from './impl/directive';
import { ClassDirective } from './directives/class';
import { StyleDirective } from './directives/style';
import { CaseDirective, SwitchDirective } from './directives/switch-case.dir';
import { TemplateOutletDirective } from './directives/template-outlet.dir';

/**
 * components module.
 *
 * @export
 * @class ComponentsModule
 */
@Module({
    providers: [
        { provide: ComponentFactory, useClass: ComponentFactoryImpl, deps: [Runtime] },
        { provide: DirectiveFactory, useClass: DirectiveFactoryImpl, deps: [Runtime] },
        // { provide: ReactiveEffect, useClass: DefaultReactiveEffect }
    ],
    exports: [
        VForDirective,
        VIfDirective,
        VElseIfDirective,
        VElseDirective,
        ClassDirective,
        StyleDirective,
        SwitchDirective,
        CaseDirective,
        TemplateOutletDirective
    ]
})
export class ComponentsModule {

}
