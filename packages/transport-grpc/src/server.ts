import { Injectable, InvocationContext } from '@tsdi/ioc';
import { Endpoint, EndpointBackend, Interceptor, MiddlewareSet, TransportContext, TransportServer } from '@tsdi/core';
import { Http2ServerRequest, Http2ServerResponse } from 'http2';
import { Subscription } from 'rxjs';


@Injectable()
export class GrpcServer extends TransportServer<Http2ServerRequest, Http2ServerResponse>  {
    get context(): InvocationContext<any> {
        throw new Error('Method not implemented.');
    }
    getInterceptors(): Interceptor<any, any>[] {
        throw new Error('Method not implemented.');
    }
    start(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    protected getBackend(): EndpointBackend<Http2ServerRequest, Http2ServerResponse> {
        throw new Error('Method not implemented.');
    }
    protected createContext(request: Http2ServerRequest, response: Http2ServerResponse): TransportContext<any, any> {
        throw new Error('Method not implemented.');
    }
    protected createMidderwareSet(): MiddlewareSet<TransportContext<any, any>> {
        throw new Error('Method not implemented.');
    }
    protected bindEvent(ctx: TransportContext<any, any>, cancel: Subscription): void {
        throw new Error('Method not implemented.');
    }
    protected respond(res: Http2ServerResponse, ctx: TransportContext<any, any>): Promise<any> {
        throw new Error('Method not implemented.');
    }
    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }

}