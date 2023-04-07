import { AssetContext, TypedRespond } from '@tsdi/core';
import { Injectable, isString } from '@tsdi/ioc';

@Injectable({ static: true })
export class TranspotTypedRespond extends TypedRespond {
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
