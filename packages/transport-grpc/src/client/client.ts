import { EMPTY_OBJ, Inject, Injectable, InvocationContext, Token, tokenId } from '@tsdi/ioc';
import { Endpoint, EndpointBackend, Interceptor, InterceptorInst, RequstOption, TransportClient } from '@tsdi/core';
import { HttpRequest, HttpResponse } from '@tsdi/common';
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

    protected getInterceptorsToken(): Token<InterceptorInst<HttpRequest<any>, HttpResponse<any>>[]> {
        throw new Error('Method not implemented.');
    }
    protected getBackend(): EndpointBackend<HttpRequest<any>, HttpResponse<any>> {
        throw new Error('Method not implemented.');
    }
    protected buildRequest(url: string | HttpRequest<any>, options?: RequstOption): HttpRequest<any> {
        throw new Error('Method not implemented.');
    }
    protected connect(): Promise<void> {
        throw new Error('Method not implemented.');
    }

}
