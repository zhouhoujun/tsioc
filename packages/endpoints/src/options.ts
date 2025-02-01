import { CommonProtocols, Protocols } from '@tsdi/common';
import { ModuleType, ProvdierOf, ProviderType, Type } from '@tsdi/ioc';
import { Server, ServerOpts } from './Server';
import { InvocationOptions } from '@tsdi/core';
import { MiddlewareOpts } from './middleware/middleware.endpoint';


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
    transport: 'mqtt';
    serverOpts: ServerOpts<TSerOpts>
}

export interface RedisServiceOpts<TSerOpts = any> extends BasicServiceOpts {
    transport: 'redis';
    serverOpts: ServerOpts<TSerOpts>
}

export interface KafkaServiceOpts<TSerOpts = any> extends BasicServiceOpts {
    transport: 'kafka';
    serverOpts: ServerOpts<TSerOpts>
}

export interface NatsServiceOpts<TSerOpts = any> extends BasicServiceOpts {
    transport: 'nats';
    serverOpts: ServerOpts<TSerOpts>
}

export interface AmqpServiceOpts<TSerOpts = any> extends BasicServiceOpts {
    transport: 'amqp';
    serverOpts: ServerOpts<TSerOpts>
}

export interface WsServiceOpts<TSerOpts = any> extends BasicServiceOpts {
    transport: 'ws' | 'wss';
    serverOpts: ServerOpts<TSerOpts>
}

export interface TcpMicroServiceOpts<TSerOpts = any> extends BasicServiceOpts {
    transport: 'tcp';
    /**
     * microservice or not.
     */
    microservice: true;
    serverOpts: ServerOpts<TSerOpts> & HeybirdOpts
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
    microservice?: false;
    serverOpts: ServerOpts<TSerOpts> & MiddlewareOpts;
}

export interface HttpServiceOpts<TSerOpts = any> extends BasicServiceOpts {
    transport: 'http' | 'https';
    serverOpts: ServerOpts<TSerOpts> & MiddlewareOpts;
}

export interface CoapServiceOpts<TSerOpts = any> extends BasicServiceOpts {
    transport: 'coap';
    serverOpts: ServerOpts<TSerOpts> & MiddlewareOpts;
}

export interface GrpcServiceOpts<TSerOpts = any> extends BasicServiceOpts {
    transport: 'grpc';
    serverOpts: ServerOpts<TSerOpts> & MiddlewareOpts;
}



export type CommonServiceOpts = TcpServiceOpts | HttpServiceOpts | CoapServiceOpts | GrpcServiceOpts;


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
