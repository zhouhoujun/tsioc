import { Module } from '@tsdi/ioc';
import { ComponentFactory } from './refs/component';
import { ComponentFactoryImpl } from './impl/component';



/**
 * components module.
 *
 * @export
 * @class ComponentsModule
 */
@Module({
    providers: [
        { provide: ComponentFactory, useClass: ComponentFactoryImpl }
    ],
    exports: [

    ]
})
export class ComponentsModule {

}
