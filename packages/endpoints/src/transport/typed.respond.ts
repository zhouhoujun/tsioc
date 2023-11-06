import { Injectable } from '@tsdi/ioc';
import { TypedRespond } from '@tsdi/core';
import { TransportContext } from '@tsdi/endpoints';

@Injectable()
export class TransportTypedRespond extends TypedRespond {
    respond(ctx: TransportContext, value: any, response: 'body' | 'header' | 'response'): void {
        if (response === 'body') {
            ctx.body = value
        } else if (response === 'header') {
            ctx.setHeader(value);
        } else if (response === 'response') {
            ctx.setResponse(value);
        }
    }
}
