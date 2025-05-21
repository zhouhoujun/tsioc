import { Module } from '@tsdi/ioc';
import { ComponentFactory } from './refs/component';
import { ComponentFactoryImpl } from './impl/component';
import { TemplateCompiler } from './template/compiler';
import { TemplateCompilerImpl } from './impl/compiler';
import { ReactiveEffect } from './ReactiveEffect';
import { DefaultReactiveEffect } from './impl/effect';
import { ViewBuilder } from './template/builder';
import { ViewBuilderImpl } from './impl/view_builder';



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
        { provide: ReactiveEffect, useClass: DefaultReactiveEffect },
        { provide: ViewBuilder, useClass: ViewBuilderImpl  }
    ],
    exports: [

    ]
})
export class ComponentsModule {

}
