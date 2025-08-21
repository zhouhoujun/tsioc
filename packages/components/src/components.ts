import { Module } from '@tsdi/ioc';
import { ComponentFactory } from './refs/component';
import { ComponentFactoryImpl } from './impl/component';
import { TemplateCompiler } from './template/compiler';
import { TemplateCompilerImpl } from './impl/compiler';
import { ReactiveEffect } from './ReactiveEffect';
import { DefaultReactiveEffect } from './impl/effect';


/**
 * components module.
 *
 * @export
 * @class ComponentsModule
 */
@Module({
    providers: [
        { provide: ComponentFactory, useClass: ComponentFactoryImpl },
        { provide: TemplateCompiler, useClass: TemplateCompilerImpl },
        { provide: ReactiveEffect, useClass: DefaultReactiveEffect }
    ],
    exports: [

    ]
})
export class ComponentsModule {

}
