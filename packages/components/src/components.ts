import { Module } from '@tsdi/ioc';
import { ComponenFactory } from './refs/component';
import { ComponentFactoryImpl } from './impl/component';
import { ComponentRunnableFactory } from './refs/runnable';
import { ComponentRunnableFactoryImpl } from './impl/runnable';



/**
 * components module.
 *
 * @export
 * @class ComponentsModule
 */
@Module({
    providers: [
        { provide: ComponenFactory, useClass: ComponentFactoryImpl },
        { provide: ComponentRunnableFactory, useClass: ComponentRunnableFactoryImpl }
    ],
    exports: [

    ]
})
export class ComponentsModule {

}
