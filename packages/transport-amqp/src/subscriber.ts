import { Endpoint, EndpointBackend, Interceptor, RequestBase, ResponseBase, TransportClient } from '@tsdi/core';
import { InvocationContext } from '@tsdi/ioc';
import * as amqp from 'amqplib';

export class AmqpSubscriber extends TransportClient<RequestBase, ResponseBase> {
    
    get context(): InvocationContext<any> {
        throw new Error('Method not implemented.');
    }
    getInterceptors(): Interceptor<any, any>[] {
        throw new Error('Method not implemented.');
    }
    protected getBackend(): EndpointBackend<RequestBase<any>, ResponseBase<any>> {
        throw new Error('Method not implemented.');
    }
    protected buildRequest(context: InvocationContext<any>, url: string | RequestBase<any>, options?: any): RequestBase<any> {
        throw new Error('Method not implemented.');
    }
    protected connect(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    


}