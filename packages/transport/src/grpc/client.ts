import { EMPTY_OBJ, Inject, Injectable, InvocationContext } from '@tsdi/ioc';
import { Endpoint, RequestBase, ResponseBase, TransportClient } from '@tsdi/core';
import * as grpc from '@grpc/grpc-js';
import * as gload from '@grpc/proto-loader';

@Injectable()
export class GrpcClient extends TransportClient<RequestBase, ResponseBase> {

    constructor(
        @Inject() private context: InvocationContext,
        @Inject({ defaultValue: EMPTY_OBJ }) private options: HttpSessionOptions) {
        super()
    }
    
    async connect(): Promise<any> {
        grpc.loadPackageDefinition()
    }
    protected buildRequest(req: string | RequestBase<any>, options?: any): RequestBase<any> | Promise<RequestBase<any>> {
        throw new Error('Method not implemented.');
    }
    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }

}
