import { ModuleType, ProvdierOf, Provider, Type } from '@tsdi/ioc';
import { InvocationOptions } from '@tsdi/core';
import { CommonProtocols, Protocols } from '@tsdi/common';
import { TransportConfigure } from '@tsdi/common/transport';
import { Http1ServConfig, Http2SecureServConfig, Http2ServConfig, HttpsServConfig, ServiceConfig } from './server.options';
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
    providers?: Provider[];
}

export interface MqttServiceOpts<TSerOpts = any> extends BasicServiceOpts {
    transport: 'mqtt' | 'mqtts';
    config?: ServiceConfig<TSerOpts>
}

export interface RedisServiceOpts<TSerOpts = any> extends BasicServiceOpts {
    transport: 'redis';
    config?: ServiceConfig<TSerOpts>
}

export interface KafkaServiceOpts<TSerOpts = any> extends BasicServiceOpts {
    transport: 'kafka';
    config?: ServiceConfig<TSerOpts>
}

export interface NatsServiceOpts<TSerOpts = any> extends BasicServiceOpts {
    transport: 'nats';
    config?: ServiceConfig<TSerOpts>
}

export interface AmqpServiceOpts<TSerOpts = any> extends BasicServiceOpts {
    transport: 'amqp';
    config?: ServiceConfig<TSerOpts>
}

export interface WsServiceOpts<TSerOpts = any> extends BasicServiceOpts {
    transport: 'ws' | 'wss';
    config?: ServiceConfig<TSerOpts> & HeybirdOpts & {
        enableStream?: boolean;
        streamTransport?: TransportConfigure;
    }
}

export interface TcpMicroServiceOpts<TSerOpts = any> extends BasicServiceOpts {
    transport: 'tcp';
    /**
     * microservice or not.
     */
    microservice: true;
    config?: ServiceConfig<TSerOpts> & HeybirdOpts
}

export interface UdpServiceOpts<TSerOpts = any> extends BasicServiceOpts {
    transport: 'udp';
    config?: ServiceConfig<TSerOpts>
}



/**
 * microservice options.
 */
export type MicroServiceOpts = MqttServiceOpts | RedisServiceOpts | KafkaServiceOpts | NatsServiceOpts | AmqpServiceOpts | WsServiceOpts | TcpMicroServiceOpts | UdpServiceOpts;


export interface TcpServiceOpts<TSerOpts = any> extends BasicServiceOpts {
    transport: 'tcp';
    /**
     * microservice or not.
     */
    microservice: false;
    config?: ServiceConfig<TSerOpts> & MiddlewareOpts;
}

export interface HttpServiceOpts extends BasicServiceOpts {
    transport: 'http'
    config?: Http1ServConfig | Http2ServConfig;
}

export interface HttpsServiceOpts extends BasicServiceOpts {
    transport: 'https';
    config?: HttpsServConfig | Http2SecureServConfig;
}

export interface CoapServiceOpts<TSerOpts = any> extends BasicServiceOpts {
    transport: 'coap';
    config?: ServiceConfig<TSerOpts> & MiddlewareOpts;
}

export interface GrpcServiceOpts<TSerOpts = any> extends BasicServiceOpts {
    transport: 'grpc';
    config?: ServiceConfig<TSerOpts> & MiddlewareOpts;
}



export type CommonServiceOpts = TcpServiceOpts | HttpServiceOpts | HttpsServiceOpts | CoapServiceOpts | GrpcServiceOpts;


export type ServiceOptions = CommonServiceOpts | MicroServiceOpts;


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
     * server default config.
     */
    defaultConfig?: ServiceConfig & MiddlewareOpts;
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
    defaultConfig?: ServiceConfig;
}



export type ServiceModuleOpts = MicroServerModuleOpts | ServerModuleOpts;
