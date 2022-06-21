import { Channel, Endpoint, EndpointBackend, Interceptor, InterceptorInst, RequestBase, ResponseBase, Subscriber } from '@tsdi/core';
import { InvocationContext, Token } from '@tsdi/ioc';
import * as amqp from 'amqplib';

export class AmqpSubscriber extends Subscriber<RequestBase, ResponseBase> {

    protected getInterceptorsToken(): Token<InterceptorInst<RequestBase<any>, ResponseBase<any>>[]> {
        throw new Error('Method not implemented.');
    }

    get channel(): Channel {
        throw new Error('Method not implemented.');
    }
    
    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    
    get context(): InvocationContext<any> {
        throw new Error('Method not implemented.');
    }
    getInterceptors(): Interceptor<any, any>[] {
        throw new Error('Method not implemented.');
    }
    protected getBackend(): EndpointBackend<RequestBase<any>, ResponseBase<any>> {
        throw new Error('Method not implemented.');
    }

    protected connect(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    


}