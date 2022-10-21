import { ExecptionTypedRespond, TransportExecption, AssetContext, StatusFactory } from '@tsdi/core';
import { Execption, Injectable } from '@tsdi/ioc';

@Injectable({ static: true })
export class TranspotExecptionTypedRespond extends ExecptionTypedRespond {
    respond<T>(ctx: AssetContext, response: 'body' | 'header' | 'response', value: T): void {
        if (response === 'body') {
            ctx.body = value
        } else if (response === 'header') {
            ctx.setHeader(value as Record<string, any>);
        } else if (response === 'response') {
            const factory = ctx.get(StatusFactory);
            if (value instanceof TransportExecption) {
                ctx.status = factory.createByCode(value.statusCode, value.message);
            } else {
                ctx.status = factory.create('InternalServerError', String(value));
            }
        }
    }
}
