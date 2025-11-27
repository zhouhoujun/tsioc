import { ModuleType, ProvdierOf, Provider, Token, AbstractType } from '@tsdi/ioc';
import { Protocols } from '@tsdi/common';
import { RequestBackend } from './backend';
import { ClientConfig } from './options';
import { AbstractClient } from './AbstractClient';


/**
 * Client module options.
 */
export interface BasicClientOpts {
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
    providers?: Provider[];

}

export interface MqttClientOpts extends BasicClientOpts {
    transport: 'mqtt' | 'mqtts';
    /**
     * client options.
     */
    config?: ClientConfig;
}

export interface RedisClientOpts extends BasicClientOpts {
    transport: 'redis';
    /**
     * client options.
     */
    config?: ClientConfig;
}

export interface KafkaClientOpts extends BasicClientOpts {
    transport: 'kafka';
    /**
     * client options.
     */
    config?: ClientConfig;
}


export interface NatsClientOpts extends BasicClientOpts {
    transport: 'nats';
    /**
     * client options.
     */
    config?: ClientConfig;
}

export interface AmqpClientOpts extends BasicClientOpts {
    transport: 'amqp';
    /**
     * client options.
     */
    config?: ClientConfig;
}

export interface WsClientOpts extends BasicClientOpts {
    transport: 'ws' | 'wss';
    /**
     * client options.
     */
    config?: ClientConfig & {
        enableStream?: boolean;
        // streamTransport?: TransportConfigure;
    };
}

export interface TcpMicroClientOpts extends BasicClientOpts {
    transport: 'tcp';
    /**
     * is microservice client or not.
     */
    microservice: true;
    /**
     * client options.
     */
    config?: ClientConfig;
}

export interface UdpClientOpts extends BasicClientOpts {
    transport: 'udp';
    /**
     * client options.
     */
    config?: ClientConfig;
}


export type MicroClientOpts = MqttClientOpts | RedisClientOpts | KafkaClientOpts | NatsClientOpts | AmqpClientOpts | WsClientOpts | TcpMicroClientOpts | UdpClientOpts;


export interface TcpClientOpts extends BasicClientOpts {
    transport: 'tcp';
    /**
     * is microservice client or not.
     */
    microservice: false;
    /**
     * client options.
     */
    config?: ClientConfig;
}

export interface HttpClientOpts extends BasicClientOpts {
    transport: 'http' | 'https';
    /**
     * client options.
     */
    config?: ClientConfig;

    /**
     * authority base url.
     */
    authority?: string;

}

export interface CoapClientOpts extends BasicClientOpts {
    transport: 'coap';
    /**
     * client options.
     */
    config?: ClientConfig;
}

export interface GrpcClientOpts extends BasicClientOpts {
    transport: 'grpc';
    /**
     * client options.
     */
    config?: ClientConfig;
}


export type ClientOpts = MicroClientOpts | TcpClientOpts | HttpClientOpts | CoapClientOpts | GrpcClientOpts;

export type ClientOptions = ClientOpts & {

    /**
     * client token.
     */
    client?: Token<AbstractClient>;
}

/**
 * Client module options.
 */
export type ClientModuleOpts = ClientOpts & {
    /**
     * client type
     */
    clientType: AbstractType<AbstractClient>;
    /**
     * client provider
     */
    clientProvider?: ProvdierOf<AbstractClient>;
    /**
     * client default options
     */
    defaultConfig?: ClientConfig;
    /**
     * as default client.
     */
    asDefault?: boolean | null;
    /**
     * trnsport backend.
     */
    backend?: ProvdierOf<RequestBackend>;
}

