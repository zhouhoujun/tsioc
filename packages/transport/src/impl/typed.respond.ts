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
            ctx.status = (value as TransportExecption).statusCode ? factory.createByCode((value as TransportExecption).statusCode, (value as Execption).message)
                : factory.create('InternalServerError', (value as Execption).message);
        }
    }
}
