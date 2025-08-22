import { Module } from '@tsdi/ioc';
import { ComponentFactory } from './refs/component';
import { ComponentFactoryImpl } from './impl/component';
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
        { provide: ReactiveEffect, useClass: DefaultReactiveEffect }
    ],
})
export class ComponentsModule {

}
