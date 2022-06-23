import { EndpointBackend, ExecptionFilter, Interceptor, InterceptorInst, MiddlewareInst, Protocol, TransportContext, TransportServer } from '@tsdi/core';
import { InvocationContext, Token } from '@tsdi/ioc';
import { Subscription } from 'rxjs';

export class MQTTServer extends TransportServer<any, any> {

    getExecptionsToken(): Token<ExecptionFilter[]> {
        throw new Error('Method not implemented.');
    }
    start(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    protected getInterceptorsToken(): Token<InterceptorInst<any, any>[]> {
        throw new Error('Method not implemented.');
    }
    protected getMiddlewaresToken(): Token<MiddlewareInst<TransportContext<any, any>>[]> {
        throw new Error('Method not implemented.');
    }
    protected getBackend(): EndpointBackend<any, any> {
        throw new Error('Method not implemented.');
    }
    protected createContext(request: any, response: any): TransportContext<any, any> {
        throw new Error('Method not implemented.');
    }
    protected bindEvent(ctx: TransportContext<any, any>, cancel: Subscription): void {
        throw new Error('Method not implemented.');
    }
    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    
}
