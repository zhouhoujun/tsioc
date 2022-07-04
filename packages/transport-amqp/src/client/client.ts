import { EndpointBackend, RequstOption, TransportClient } from '@tsdi/core';
import { Inject, InvocationContext, Token } from '@tsdi/ioc';
import * as amqp from 'amqplib';

export class AmqpClient extends TransportClient {
    constructor(@Inject() context: InvocationContext, options: any) {
        super(context, options)
    }
    
    protected buildRequest(url: any, options?: RequstOption | undefined) {
        throw new Error('Method not implemented.');
    }
    protected connect(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    protected getBackend(): EndpointBackend<any, any> {
        throw new Error('Method not implemented.');
    }


}