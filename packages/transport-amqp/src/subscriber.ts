import { Endpoint, RequestBase, ResponseBase, Subscriber } from '@tsdi/core';
import * as amqp from 'amqplib';

export class AmqpSubscriber extends Subscriber<RequestBase, ResponseBase> {
    
    getEndpoint(): Endpoint<RequestBase<any>, ResponseBase<any>> {
        throw new Error('Method not implemented.');
    }

}