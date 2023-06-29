import { tokenId } from '@tsdi/ioc';
import { ConfigableHandlerOptions, Filter, Interceptor } from '@tsdi/core';
import { HttpEvent, HttpRequest } from '@tsdi/common';
import { ServiceDefinition, ProtobufTypeDefinition } from '@grpc/grpc-js';
import { Options } from '@grpc/proto-loader';



export interface GrpcClientOptions extends ConfigableHandlerOptions {
    filename: string | string[];
    loadOptions?: Options
    packageDef: Record<string, ServiceDefinition | ProtobufTypeDefinition>;
}



/**
 * Grpc client opptions.
 */
export const GRPC_CLIENT_OPTS = tokenId<GrpcClientOptions>('GRPC_CLIENT_OPTS');

/**
 * Grpc client interceptors for `Http`.
 */
export const GRPC_CLIENT_INTERCEPTORS = tokenId<Interceptor<HttpRequest, HttpEvent>[]>('GRPC_CLIENT_INTERCEPTORS');
/**
 * Grpc client filters for `Http`.
 */
export const GRPC_CLIENT_FILTERS = tokenId<Filter<HttpRequest, HttpEvent>[]>('GRPC_CLIENT_FILTERS');


