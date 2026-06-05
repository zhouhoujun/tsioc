import { RequestContext, RestfulRequestAdapter, StatusMessageAdapter } from '@tsdi/common';

export function getStatusAdapter(ctx: RequestContext): StatusMessageAdapter {
    return ctx.get(StatusMessageAdapter);
}

export function getRestfulAdapter(ctx: RequestContext): RestfulRequestAdapter {
    return ctx.get(RestfulRequestAdapter);
}
