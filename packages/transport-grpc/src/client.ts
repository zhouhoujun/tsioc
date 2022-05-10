import { EMPTY_OBJ, Inject, Injectable, InvocationContext, tokenId } from '@tsdi/ioc';
import { Endpoint, EndpointBackend, HttpRequest, HttpResponse, Interceptor, TransportClient } from '@tsdi/core';
import { loadPackageDefinition, load, ServiceDefinition, ProtobufTypeDefinition } from '@grpc/grpc-js';
import * as gload from '@grpc/proto-loader';


export interface GrpcClientOptions {
    packageDef: Record<string, ServiceDefinition | ProtobufTypeDefinition>;

}

export const GRPC_CLIENT_OPTIONS = tokenId<GrpcClientOptions>('GRPC_CLIENT_OPTIONS');

/**
 * grpc client.
 */
@Injectable()
export class GrpcClient extends TransportClient<HttpRequest, HttpResponse> {

    constructor(
        readonly context: InvocationContext,
        @Inject(GRPC_CLIENT_OPTIONS) private options: GrpcClientOptions) {
        super()
    }
    
    async connect(): Promise<any> {
        loadPackageDefinition(this.options.packageDef);
    }    
    
    getInterceptors(): Interceptor<any, any>[] {
        throw new Error('Method not implemented.');
    }

    getBackend(): EndpointBackend<HttpRequest, HttpResponse> {
        throw new Error('Method not implemented.');
    }
    
    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    protected buildRequest(context: InvocationContext<any>, url: string | HttpRequest<any>, options?: any): HttpRequest<any> {
        throw new Error('Method not implemented.');
    }

}
