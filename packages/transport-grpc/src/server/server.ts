import { Injectable, InvocationContext, Token } from '@tsdi/ioc';
import { EndpointBackend, ExecptionFilter, InterceptorInst, MiddlewareInst, TransportContext, TransportServer } from '@tsdi/core';
import { Http2ServerRequest, Http2ServerResponse } from 'http2';
import { Subscription } from 'rxjs';


@Injectable()
export class GrpcServer extends TransportServer<Http2ServerRequest, Http2ServerResponse>  {

    getExecptionsToken(): Token<ExecptionFilter[]> {
        throw new Error('Method not implemented.');
    }
    start(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    protected getInterceptorsToken(): Token<InterceptorInst<Http2ServerRequest, Http2ServerResponse>[]> {
        throw new Error('Method not implemented.');
    }
    protected getMiddlewaresToken(): Token<MiddlewareInst<TransportContext<any, any>>[]> {
        throw new Error('Method not implemented.');
    }
    protected getBackend(): EndpointBackend<Http2ServerRequest, Http2ServerResponse> {
        throw new Error('Method not implemented.');
    }
    protected createContext(request: Http2ServerRequest, response: Http2ServerResponse): TransportContext<any, any> {
        throw new Error('Method not implemented.');
    }
    protected bindEvent(ctx: TransportContext<any, any>, cancel: Subscription): void {
        throw new Error('Method not implemented.');
    }
    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }

}