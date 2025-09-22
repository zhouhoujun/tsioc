import { Module } from '@tsdi/ioc';
import { ComponentFactory } from './refs/component';
import { ComponentFactoryImpl } from './impl/component';
import { ReactiveEffect } from './ReactiveEffect';
import { DefaultReactiveEffect } from './impl/effect';
import { VForDirective } from './directives/for.dir';
import { VIfDirective } from './directives/if.dir';
import { VModelDirective } from './directives/model.dir';

/**
 * components module.
 *
 * @export
 * @class ComponentsModule
 */
@Module({
    providers: [
        { provide: ComponentFactory, useClass: ComponentFactoryImpl },
        { provide: ReactiveEffect, useClass: DefaultReactiveEffect }
    ],
    exports:[
        VForDirective,
        VIfDirective,
        VModelDirective
    ]
})
export class ComponentsModule {

}
