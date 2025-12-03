
/**
 * protocol types.
 */
export type Protocols = 'tcp' | 'udp' | 'coap' | 'amqp' | 'mqtt' | 'mqtts' | 'kafka' | 'redis' | 'nats' | 'modbus' | 'http' | 'https' | 'grpc' | 'ws' | 'wss';

/**
 * Common protocol type.
 */
export type CommonProtocols = 'http' | 'https' | 'grpc' | 'tcp' | 'coap';

export interface ProtocolConfig {
    /**
     * protocol type
     */
    protocol: Protocols;
    /**
     * the transport ailas name
     */
    name?: string;
    /**
     * as microservice transport
     */
    microservice?: boolean;
}