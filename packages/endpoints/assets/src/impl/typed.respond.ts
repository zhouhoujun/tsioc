import { TypedRespond } from '@tsdi/core';
import { Injectable, isString } from '@tsdi/ioc';
import { AssetContext } from '@tsdi/transport';

@Injectable({ static: true })
export class TransportTypedRespond extends TypedRespond {
    respond(ctx: AssetContext, value: any, response: 'body' | 'header' | 'response'): void {
        if (response === 'body') {
            ctx.body = value
        } else if (response === 'header') {
            ctx.setHeader(value as Record<string, any>);
        } else if (response === 'response') {
            if (isString(value)) {
                ctx.status = 500;
                ctx.statusMessage = value;
            } else if (value) {
                ctx.status = value.status ?? value.statusCode;
                ctx.statusMessage = value.message;
            }
        }
    }
}
