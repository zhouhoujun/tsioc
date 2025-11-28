import { Injectable } from '@tsdi/ioc';
import { TypedRespond } from '@tsdi/core';
import { OutgoingOpts } from '@tsdi/common/transport';
import { AbstractRequestContext } from './AbstractRequestContext';

@Injectable()
export class EndpointTypedRespond extends TypedRespond {
    respond(ctx: AbstractRequestContext, value: any, response: 'body' | 'header' | 'response'): void {
        if (response === 'body') {
            ctx.body = value
        } else if (response === 'header') {
            ctx.setHeader(value);
        } else if (response === 'response') {
            const { headers, body, payload, statusCode, status, statusMessage, statusText } = (value ?? {}) as OutgoingOpts;
            if (headers) {
                ctx.setHeader(headers);
            }
            if (body ?? payload) {
                ctx.body = body ?? payload;
            }
            if (status ?? statusCode) {
                ctx.status = status ?? statusCode;
            }
            if (statusMessage ?? statusText) {
                ctx.statusMessage = statusMessage ?? statusText!;
            }
        }
    }
}
