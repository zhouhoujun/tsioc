import { ExecptionTypedRespond, TransportError, AssetContext } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';

@Injectable({ static: true })
export class TranspotExecptionTypedRespond extends ExecptionTypedRespond {
    respond<T>(ctx: AssetContext, response: 'body' | 'header' | 'response', value: T): void {
        if (response === 'body') {
            ctx.body = value
        } else if (response === 'header') {
            ctx.setHeader(value as Record<string, any>);
        } else if (response === 'response') {
            if (value instanceof TransportError) {
                ctx.status = value.statusCode;
                ctx.statusMessage = value.message
            } else {
                ctx.status = ctx.transport.status.serverError;
                ctx.statusMessage = String(value)
            }
        }
    }
}
