import { TypedRespond } from '@tsdi/core';
import { Injectable, isString } from '@tsdi/ioc';
import { TransportContext } from '@tsdi/endpoints';

@Injectable({ static: true })
export class JsonTransportTypedRespond extends TypedRespond {
    respond(ctx: TransportContext, value: any, response: 'body' | 'header' | 'response'): void {
        if (response === 'body') {
            ctx.response.payload = value
        } else if (response === 'header') {
            ctx.response.headers = value;
        } else if (response === 'response') {
            ctx.response = value;
        }
    }
}
