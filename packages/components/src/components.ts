import { Module } from '@tsdi/core';
import { Inject, IocExt, Injector, ROOT_INJECTOR } from '@tsdi/ioc';
import { ComponentFactoryResolver } from './refs/component';
import { HostMappingRoot } from './router';


/**
 * component extend module.
 *
 * @export
 * @class ComponentModule
 */
@Module({
    providers:[
        HostMappingRoot
    ]
})
export class ComponentsModule {

}
