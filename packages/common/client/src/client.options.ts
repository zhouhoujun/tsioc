import { Protocols } from '@tsdi/common';
import { ModuleType, ProvdierOf, ProviderType, Token, Type } from '@tsdi/ioc';
import { ClientBackend } from './backend';
import { ClientOpts } from './options';
import { AbstractClient } from './AbstractClient';


/**
 * Client module config.
 */
export interface BasicClientConfig {
    /**
     * transport
     */
    transport: Protocols;
    /**
     * imports modules
     */
    imports?: ModuleType[];
    /**
     * custom provider with module.
     */
    providers?: ProviderType[];

}

export interface MqttClientConfig extends BasicClientConfig {
    transport: 'mqtt'|'mqtts';
    /**
     * client options.
     */
    clientOpts?: ClientOpts;
}

export interface RedisClientConfig extends BasicClientConfig {
    transport: 'redis';
    /**
     * client options.
     */
    clientOpts?: ClientOpts;
}

export interface KafkaClientConfig extends BasicClientConfig {
    transport: 'kafka';
    /**
     * client options.
     */
    clientOpts?: ClientOpts;
}


export interface NatsClientConfig extends BasicClientConfig {
    transport: 'nats';
    /**
     * client options.
     */
    clientOpts?: ClientOpts;
}

export interface AmqpClientConfig extends BasicClientConfig {
    transport: 'amqp';
    /**
     * client options.
     */
    clientOpts?: ClientOpts;
}

export interface WsClientConfig extends BasicClientConfig {
    transport: 'ws' | 'wss';
    /**
     * client options.
     */
    clientOpts?: ClientOpts;
}

export interface TcpMicroClientConfig extends BasicClientConfig {
    transport: 'tcp';
    /**
     * is microservice client or not.
     */
    microservice: true;
    /**
     * client options.
     */
    clientOpts?: ClientOpts;
}

export interface UdpClientConfig extends BasicClientConfig {
    transport: 'udp';
    /**
     * client options.
     */
    clientOpts?: ClientOpts;
}


export type MicroClientConfig = MqttClientConfig | RedisClientConfig | KafkaClientConfig | NatsClientConfig | AmqpClientConfig | WsClientConfig | TcpMicroClientConfig | UdpClientConfig;


export interface TcpClientConfig extends BasicClientConfig {
    transport: 'tcp';
    /**
     * is microservice client or not.
     */
    microservice: false;
    /**
     * client options.
     */
    clientOpts?: ClientOpts;
}

export interface HttpClientConfig extends BasicClientConfig {
    transport: 'http' | 'https';    
    /**
     * client options.
     */
    clientOpts?: ClientOpts;

    /**
     * authority base url.
     */
    authority?: string;

}

export interface CoapClientConfig extends BasicClientConfig {
    transport: 'coap';    
    /**
     * client options.
     */
    clientOpts?: ClientOpts;
}

export interface GrpcClientConfig extends BasicClientConfig {
    transport: 'grpc';    
    /**
     * client options.
     */
    clientOpts?: ClientOpts;
}


export type ClientConfig = MicroClientConfig | TcpClientConfig | HttpClientConfig | CoapClientConfig | GrpcClientConfig;

export type ClientConfigs =  ClientConfig & {

    /**
     * client token.
     */
    client?: Token<AbstractClient>;
}

/**
 * Client module options.
 */
export type ClientModuleOpts = ClientConfig & {
    /**
     * client type
     */
    clientType: Type<AbstractClient>;
    /**
     * client provider
     */
    clientProvider?: ProvdierOf<AbstractClient>;
    /**
     * client default options
     */
    defaultOpts?: ClientOpts;
    /**
     * as default client.
     */
    asDefault?: boolean | null;
    /**
     * trnsport backend.
     */
    backend?: ProvdierOf<ClientBackend>;
}

