import { MappingRef, Context } from '@tsdi/core';
import { Type } from '@tsdi/ioc';
import { ApplicationRef } from '../refs/app';


/**
 * mapping route for host live view component.
 */
export class HostMappingRoute<T = any> extends MappingRef<T> {

    protected getInstance(ctx: Context) {
        // todo get host lived component.
        const appRef = this.injector.get(ApplicationRef);
        let component = appRef.components.find(c => c instanceof this.reflect.type)?.instance;
        if (!component) {

            component =  appRef.bootstrap(this.reflect.type as Type); // '' renderComponent(this.reflect.type as Type, );
        }
        return component;
    }
}
