import { Abstract, EMPTY_OBJ, Inject, Injectable, InvocationContext, Token, tokenId } from '@tsdi/ioc';
import { ClientOptions, Endpoint, EndpointBackend, Interceptor, InterceptorInst, RequstOption, TransportClient } from '@tsdi/core';
import { HttpRequest, HttpResponse } from '@tsdi/common';
import { loadPackageDefinition, load, ServiceDefinition, ProtobufTypeDefinition } from '@grpc/grpc-js';
import * as gload from '@grpc/proto-loader';


@Abstract()
export abstract class GrpcClientOptions extends ClientOptions<HttpRequest, HttpResponse> {
    abstract packageDef: Record<string, ServiceDefinition | ProtobufTypeDefinition>;
}

/**
 * grpc client.
 */
@Injectable()
export class GrpcClient extends TransportClient<HttpRequest, HttpResponse> {

    constructor(
        @Inject() context: InvocationContext,
        @Inject() private options: GrpcClientOptions) {
        super(context, options)
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
