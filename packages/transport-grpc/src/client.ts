import { EMPTY_OBJ, Inject, Injectable, InvocationContext, tokenId } from '@tsdi/ioc';
import { Endpoint, TransportClient } from '@tsdi/core';
import { HttpRequest, HttpResponse } from '@tsdi/transport';
import { loadPackageDefinition, load, ServiceDefinition, ProtobufTypeDefinition } from '@grpc/grpc-js';
import * as gload from '@grpc/proto-loader';


export interface GrpcClientOptions {
    packageDef: Record<string, ServiceDefinition | ProtobufTypeDefinition>;

}

export const GRPC_CLIENT_OPTIONS = tokenId<GrpcClientOptions>('GRPC_CLIENT_OPTIONS');

@Injectable()
export class GrpcClient extends TransportClient<HttpRequest, HttpResponse> {


    constructor(
        @Inject() private context: InvocationContext,
        @Inject(GRPC_CLIENT_OPTIONS) private options: GrpcClientOptions) {
        super()
    }
    
    async connect(): Promise<any> {
        loadPackageDefinition(this.options.packageDef);
    }

    getEndpoint(): Endpoint<HttpRequest, HttpResponse> {
        throw new Error('Method not implemented.');
    }

    protected buildRequest(req: string | HttpRequest, options?: any): HttpRequest | Promise<HttpRequest> {
        throw new Error('Method not implemented.');
    }
    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }

}
