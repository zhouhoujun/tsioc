import { CONTEXT, MappingRoute, MessageContext } from '@tsdi/boot';


/**
 * mapping route for host live view component.
 */
export class HostMappingRoute extends MappingRoute {

    protected getInstance(ctx: MessageContext) {
        // todo get host lived component.
        return this.injector.getInstance(this.reflect.type, ctx.providers, { provide: CONTEXT, useValue: ctx });
    }
}
