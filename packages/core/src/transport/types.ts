import { Abstract } from '@tsdi/ioc';

/**
 * transport type.
 */
export type TransportType = 'tcp' | 'grpc' | 'rmq' | 'kafka' | 'redis'
    | 'amqp' | 'msg' | 'wss' | 'ws' | 'mqtt' | 'mqtts' | 'ssl' | 'wx' | 'wxs';



/**
 * transport option.
 */
@Abstract()
export abstract class TransportOption {
    /**
     * transport type.
     */
    abstract get transport(): TransportType;
    /**
     * options setting of the transport.
     */
    abstract get options(): Record<string, any>;
}
