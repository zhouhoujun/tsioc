import { Abstract, EMPTY_OBJ, Inject, Injectable, InvocationContext, Token, tokenId } from '@tsdi/ioc';
import { Client, ConfigableHandler, RequestOptions, TransportRequest } from '@tsdi/core';
import { loadPackageDefinition, load, ServiceDefinition, ProtobufTypeDefinition } from '@grpc/grpc-js';
import { HttpEvent, HttpRequest } from '@tsdi/common';
import * as gload from '@grpc/proto-loader';
import { Observable } from 'rxjs';
import { GRPC_CLIENT_OPTS, GrpcClientOptions } from './options';
import { GrpcHandler } from './handler';


/**
 * grpc client.
 */
@Injectable()
export class GrpcClient extends Client<HttpRequest, HttpEvent> {

    constructor(
        readonly handler: GrpcHandler,
        @Inject(GRPC_CLIENT_OPTS) private options: GrpcClientOptions) {
        super()
    }


    protected connect(): Observable<any> {
        gload.load(this.options.packageDef)
        gload.loadFileDescriptorSetFromObject(this.options.packageDef)
    }

    protected onShutdown(): Promise<void> {
        throw new Error('Method not implemented.');
    }


}
