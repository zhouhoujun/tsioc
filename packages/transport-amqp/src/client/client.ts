import { EndpointBackend, RequestBase, RequstOption, ResponseBase, TransportClient } from '@tsdi/core';
import { Inject, InvocationContext, Token } from '@tsdi/ioc';
import * as amqp from 'amqplib';

export class AmqpClient extends TransportClient<RequestBase, ResponseBase> {

    constructor(@Inject() context: InvocationContext, options: any) {
        super(context, options)
    }
    protected buildRequest(url: string | RequestBase<any>, options?: RequstOption | undefined): RequestBase<any> {
        throw new Error('Method not implemented.');
    }
    protected connect(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    protected getBackend(): EndpointBackend<RequestBase<any>, ResponseBase<any>> {
        throw new Error('Method not implemented.');
    }

}