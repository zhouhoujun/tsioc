import { CONTEXT, MappingRoute, MessageContext } from '@tsdi/boot';
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
            component = this.injector.getInstance(this.reflect.type, ctx.providers, { provide: CONTEXT, useValue: ctx });
            // todo attach appRef and view.
            appRef.attachView(component);
        }
        return component;
    }
}
