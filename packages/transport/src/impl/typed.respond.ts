import { ExecptionTypedRespond, TransportExecption, AssetContext, States } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';

@Injectable({ static: true })
export class TranspotExecptionTypedRespond extends ExecptionTypedRespond {
    respond<T>(ctx: AssetContext, response: 'body' | 'header' | 'response', value: T): void {
        if (response === 'body') {
            ctx.body = value
        } else if (response === 'header') {
            ctx.setHeader(value as Record<string, any>);
        } else if (response === 'response') {
            if (value instanceof TransportExecption) {
                ctx.status.code = value.statusCode;
                ctx.status.message = value.message
            } else {
                ctx.status.state = States.InternalServerError;
                ctx.status.message = String(value)
            }
        }
    }
}
