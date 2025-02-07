import { ModuleType, ProvdierOf, ProviderType, Type } from '@tsdi/ioc';
import { InvocationOptions } from '@tsdi/core';
import { CommonProtocols, Protocols } from '@tsdi/common';
import { Http1ServerOpts, Http2SecureServerOpts, Http2ServerOpts, HttpsServerOpts, ServerOpts } from './server.options';
import { Server } from './Server';
import { MiddlewareOpts } from './middleware/middleware';


/**
 * heybird options.
 */
export interface HeybirdOpts {
    /**
    * heybird or not.
    */
    heybird?: boolean | CommonProtocols;
}


/**
 *  basic service options.
 */
export interface BasicServiceOpts {
    /**
     * service transport.
     */
    transport: Protocols;
    /**
     * imports modules
     */
    imports?: ModuleType[];
    /**
     * auto bootstrap or not. default true.
     */
    bootstrap?: boolean;
    /**
     * server provdier.
     */
    server?: ProvdierOf<Server>;
    /**
     * start.
     */
    start?: InvocationOptions;
    /**
     * custom provider with module.
     */
    providers?: ProviderType[];
}

export interface MqttServiceOpts<TSerOpts = any> extends BasicServiceOpts {
    transport: 'mqtt' | 'mqtts';
    serverOpts?: ServerOpts<TSerOpts>
}

export interface RedisServiceOpts<TSerOpts = any> extends BasicServiceOpts {
    transport: 'redis';
    serverOpts?: ServerOpts<TSerOpts>
}

export interface KafkaServiceOpts<TSerOpts = any> extends BasicServiceOpts {
    transport: 'kafka';
    serverOpts?: ServerOpts<TSerOpts>
}

export interface NatsServiceOpts<TSerOpts = any> extends BasicServiceOpts {
    transport: 'nats';
    serverOpts?: ServerOpts<TSerOpts>
}

export interface AmqpServiceOpts<TSerOpts = any> extends BasicServiceOpts {
    transport: 'amqp';
    serverOpts?: ServerOpts<TSerOpts>
}

export interface WsServiceOpts<TSerOpts = any> extends BasicServiceOpts {
    transport: 'ws' | 'wss';
    serverOpts?: ServerOpts<TSerOpts> & HeybirdOpts
}

export interface TcpMicroServiceOpts<TSerOpts = any> extends BasicServiceOpts {
    transport: 'tcp';
    /**
     * microservice or not.
     */
    microservice: true;
    serverOpts?: ServerOpts<TSerOpts> & HeybirdOpts
}


/**
 * microservice options.
 */
export type MicroServiceOpts = MqttServiceOpts | RedisServiceOpts | KafkaServiceOpts | NatsServiceOpts | AmqpServiceOpts | WsServiceOpts | TcpMicroServiceOpts;


export interface TcpServiceOpts<TSerOpts = any> extends BasicServiceOpts {
    transport: 'tcp';
    /**
     * microservice or not.
     */
    microservice: false;
    serverOpts?: ServerOpts<TSerOpts> & MiddlewareOpts;
}

export interface HttpServiceOpts extends BasicServiceOpts {
    transport: 'http'
    serverOpts?: Http1ServerOpts | Http2ServerOpts;
}

export interface HttpsServiceOpts extends BasicServiceOpts {
    transport: 'https';
    serverOpts?: HttpsServerOpts | Http2SecureServerOpts;
}

export interface CoapServiceOpts<TSerOpts = any> extends BasicServiceOpts {
    transport: 'coap';
    serverOpts?: ServerOpts<TSerOpts> & MiddlewareOpts;
}

export interface GrpcServiceOpts<TSerOpts = any> extends BasicServiceOpts {
    transport: 'grpc';
    serverOpts?: ServerOpts<TSerOpts> & MiddlewareOpts;
}



export type CommonServiceOpts = TcpServiceOpts | HttpServiceOpts | HttpsServiceOpts | CoapServiceOpts | GrpcServiceOpts;


export type ServiceOpts = CommonServiceOpts | MicroServiceOpts;


export type ServerModuleOpts = CommonServiceOpts & {
    /**
     * as default service.
     */
    asDefault?: boolean;
    /**
     * server type.
     */
    serverType: Type<Server>;
    /**
     * server default options.
     */
    defaultOpts?: ServerOpts & MiddlewareOpts;
}

export type MicroServerModuleOpts = MicroServiceOpts & {
    /**
     * as default service.
     */
    asDefault?: boolean | null;
    /**
     * server type.
     */
    serverType: Type<Server>;
    /**
     * server default options.
     */
    defaultOpts?: ServerOpts;
}



export type ServiceModuleOpts = MicroServerModuleOpts | ServerModuleOpts;
