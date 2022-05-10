import { EndpointBackend, Interceptor, MiddlewareSet, Protocol, TransportContext, TransportServer } from '@tsdi/core';
import { InvocationContext } from '@tsdi/ioc';
import { Subscription } from 'rxjs';

export class MQTTServer extends TransportServer<any, any> {
    get context(): InvocationContext<any> {
        throw new Error('Method not implemented.');
    }
    getInterceptors(): Interceptor<any, any>[] {
        throw new Error('Method not implemented.');
    }
    start(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    protected getBackend(): EndpointBackend<any, any> {
        throw new Error('Method not implemented.');
    }
    protected createContext(request: any, response: any): TransportContext<any, any> {
        throw new Error('Method not implemented.');
    }
    protected createMidderwareSet(): MiddlewareSet<TransportContext<any, any>> {
        throw new Error('Method not implemented.');
    }
    protected bindEvent(ctx: TransportContext<any, any>, cancel: Subscription): void {
        throw new Error('Method not implemented.');
    }
    protected respond(res: any, ctx: TransportContext<any, any>): Promise<any> {
        throw new Error('Method not implemented.');
    }
    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }

   

}
