
import { ProvdierOf, tokenId } from '@tsdi/ioc';
import { ConfigableEndpointOptions, Filter, Interceptor } from '@tsdi/core';
import { Http2ServerRequest, Http2ServerResponse } from 'http2';
import { ChannelOptions } from '@grpc/grpc-js';
import { DefinitionLoader } from '../loader';


export interface GrpcServOptions extends ConfigableEndpointOptions<Http2ServerRequest, Http2ServerResponse> {

    channelOptions?: ChannelOptions;
    protoPath: string | string[];
    package: string | string[];
    loader?: ProvdierOf<DefinitionLoader>;

    port?: string;
    /**
     * Optionally override the trusted CA certificates. Default is to trust
     * the well-known CAs curated by Mozilla. Mozilla's CAs are completely
     * replaced when CAs are explicitly specified using this option.
     */
    ca?: string | Buffer | Array<string | Buffer> | undefined;
}



/**
 * http server opptions.
 */
export const GRPC_SERV_OPTS = tokenId<GrpcServOptions>('GRPC_SERVER_OPTS');

export const GRPC_SERV_FILTERS = tokenId<Filter[]>('GRPC_SERV_FILTERS');

/**
 * http server Interceptor tokens for {@link HttpServer}.
 */
export const GRPC_SERV_INTERCEPTORS = tokenId<Interceptor<Http2ServerRequest, Http2ServerResponse>[]>('GRPC_SERV_INTERCEPTORS');