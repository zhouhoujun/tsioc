// import { Interceptor, Filter, Incoming, Outgoing, EndpointContext, TransportSessionOpts, ConfigableEndpointOptions, Backend } from '@tsdi/core';
// import { ClassType, tokenId } from '@tsdi/ioc';
// import { SessionOptions, ContentOptions, MimeSource, ProxyOpts } from '@tsdi/transport';
// import * as net from 'net';
// import * as tls from 'tls';



// /**
//  * TCP Microservice options.
//  */
// export interface TcpMicroServiceOpts extends ConfigableEndpointOptions<EndpointContext, Outgoing> {

//     autoListen?: boolean;
//     maxConnections?: number;
//     proxy?: ProxyOpts;
//     /**
//      * transport session options.
//      */
//     transportOpts?: TransportSessionOpts;
//     /**
//      * socket timeout.
//      */
//     timeout?: number;
//     mimeDb?: Record<string, MimeSource>;
//     content?: boolean | ContentOptions;
//     session?: boolean | SessionOptions;
//     serverOpts?: net.ServerOpts | tls.TlsOptions;
//     listenOpts: net.ListenOptions;
// }

// /**
//  * TCP Microservice opptions.
//  */
// export const TCP_MICRO_SERV_OPTS = tokenId<TcpMicroServiceOpts>('TCP_MICRO_SERV_OPTS');

// /**
//  * Tcp Microservice interceptors.
//  */
// export const TCP_MICRO_SERV_INTERCEPTORS = tokenId<Interceptor<Incoming, Outgoing>[]>('TCP_MICRO_SERV_INTERCEPTORS');

// /**
//  * TCP Microservice filters.
//  */
// export const TCP_MICRO_SERV_FILTERS = tokenId<Filter<Incoming, Outgoing>[]>('TCP_MICRO_SERV_FILTERS');

