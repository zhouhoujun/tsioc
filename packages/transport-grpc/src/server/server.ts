import { Abstract, Injectable, InvocationContext, Token } from '@tsdi/ioc';
import { EndpointBackend, ExecptionFilter, ServerOptions, TransportContext, TransportServer } from '@tsdi/core';
import { Http2ServerRequest, Http2ServerResponse } from 'http2';
import { Subscription } from 'rxjs';
import { ServerCredentials, Server, ChannelOptions } from '@grpc/grpc-js';
import { load } from '@grpc/proto-loader';


@Abstract()
export abstract class GrpcServOptions extends ServerOptions<Http2ServerRequest, Http2ServerResponse> {
    channelOptions?: ChannelOptions;
}

@Injectable()
export class GrpcServer extends TransportServer<Http2ServerRequest, Http2ServerResponse>  {

    start(): Promise<void> {
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