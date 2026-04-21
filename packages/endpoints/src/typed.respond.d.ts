import { TypedRespond } from '@tsdi/core';
import { Incoming } from '@tsdi/common';
import { AbstractRequestContext } from './AbstractRequestContext';
export declare class EndpointTypedRespond extends TypedRespond {
    respond(incoming: Incoming, value: any, response: 'body' | 'header' | 'response', context: AbstractRequestContext): void;
}
