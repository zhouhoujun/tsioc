import { Abstract, EMPTY_OBJ, Inject, Injectable, InvocationContext, Token, tokenId } from '@tsdi/ioc';
import { EndpointBackend, RequestOptions, TransportRequest } from '@tsdi/core';
import { Connection, ConnectionOpts, TransportClient, TransportClientOpts } from '@tsdi/transport';
import { loadPackageDefinition, load, ServiceDefinition, ProtobufTypeDefinition } from '@grpc/grpc-js';
import { Duplex } from 'stream';
import * as gload from '@grpc/proto-loader';
import { Observable } from 'rxjs';


@Abstract()
export abstract class GrpcClientOptions extends TransportClientOpts {
    abstract packageDef: Record<string, ServiceDefinition | ProtobufTypeDefinition>;
}

/**
 * grpc client.
 */
@Injectable()
export class GrpcClient extends TransportClient<RequestOptions, GrpcClientOptions> {
    constructor(@Inject() private options: GrpcClientOptions) {
        super(options)
    }

    protected onConnect(duplex: Duplex, opts?: ConnectionOpts | undefined): Observable<Connection> {
        throw new Error('Method not implemented.');
    }
    
    protected createDuplex(opts: GrpcClientOptions): Duplex {
        throw new Error('Method not implemented.');
    }
}
