import { Abstract, Injectable, InvocationContext, Token } from '@tsdi/ioc';
import { Http2ServerRequest, Http2ServerResponse } from 'http2';
import { Observable, Subscription } from 'rxjs';
import { ServerCredentials, Server, ChannelOptions } from '@grpc/grpc-js';
import { load } from '@grpc/proto-loader';
import { Connection, ConnectionOpts, TransportServer, TransportServerOpts } from '@tsdi/transport';
import { ListenOpts, RequestOptions } from '@tsdi/core';
import { Duplex } from 'form-data';


@Abstract()
export abstract class GrpcServOptions extends TransportServerOpts {
    channelOptions?: ChannelOptions;
}

@Injectable()
export class GrpcServer extends TransportServer<Server | ServerCredentials, GrpcServOptions>  {

    protected createServer(opts: GrpcServOptions): Server | ServerCredentials {
        new Server()
    }
    protected listen(server: Server | ServerCredentials, opts: ListenOpts): Promise<void> {
        throw new Error('Method not implemented.');
    }
    protected onConnection(server: Server | ServerCredentials, opts?: ConnectionOpts | undefined): Observable<Connection> {
        throw new Error('Method not implemented.');
    }



}