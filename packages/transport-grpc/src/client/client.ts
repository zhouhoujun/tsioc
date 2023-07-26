import { Abstract, EMPTY_OBJ, Inject, Injectable, InvocationContext, Token, tokenId } from '@tsdi/ioc';
import { ConfigableHandler } from '@tsdi/core';
import { Client } from '@tsdi/transport';
import { loadPackageDefinition, ServiceDefinition, ProtobufTypeDefinition } from '@grpc/grpc-js';
import { HttpEvent, HttpRequest } from '@tsdi/common/http';
import { load, loadFileDescriptorSetFromObject } from '@grpc/proto-loader';
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


    protected async connect(): Promise<any> {
        const definition = await load(this.options.filename, this.options.loadOptions)
        loadFileDescriptorSetFromObject(this.options.packageDef)
    }

    protected onShutdown(): Promise<void> {
        throw new Error('Method not implemented.');
    }


    protected initContext(context: InvocationContext<any>): void {
        throw new Error('Method not implemented.');
    }
}
