import { MappingRoute, MessageContext } from '@tsdi/boot';
import { Type } from '@tsdi/ioc';
import { ApplicationRef } from '../refs/app';


/**
 * mapping route for host live view component.
 */
export class HostMappingRoute extends MappingRoute {

    protected getInstance(ctx: MessageContext) {
        // todo get host lived component.
        const appRef = this.injector.getInstance(ApplicationRef);
        let component = appRef.components.find(c => c instanceof this.reflect.type)?.instance;
        if (!component) {
            component = renderComponent(this.reflect.type as Type, );
        }
        return component;
    }
}
