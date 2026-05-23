import { Injectable } from '@tsdi/ioc';
import { TypedRespond } from '@tsdi/core';
import { Incoming, OutgoingOpts, RequestContext } from '@tsdi/common';
import { AbstractRequestContext } from './AbstractRequestContext';

@Injectable()
export class EndpointTypedRespond extends TypedRespond {
    respond(incoming: Incoming, value: any, response: 'body' | 'header' | 'response', context: AbstractRequestContext): void {
        if (response === 'body') {
            context.body = value
        } else if (response === 'header') {
            context.setHeader(value);
        } else if (response === 'response') {
            const { headers, body, payload, statusCode, status, statusMessage, statusText } = (value ?? {}) as OutgoingOpts;
            if (headers) {
                context.setHeader(headers);
            }
            if (body ?? payload) {
                context.body = body ?? payload;
            }
            if (status ?? statusCode) {
                context.status = status ?? statusCode;
            }
            if (statusMessage ?? statusText) {
                context.statusMessage = statusMessage ?? statusText!;
            }
        }
    }
}
