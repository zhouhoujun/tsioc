import { Injectable } from '@tsdi/ioc';
import { TypedRespond } from '@tsdi/core';
import { RequestContext } from './RequestContext';

@Injectable()
export class EndpointTypedRespond extends TypedRespond {
    respond(ctx: RequestContext, value: any, response: 'body' | 'header' | 'response'): void {
        if (response === 'body') {
            ctx.body = value
        } else if (response === 'header') {
            ctx.setHeader(value);
        } else if (response === 'response') {
            ctx.setResponse(value);
        }
    }
}