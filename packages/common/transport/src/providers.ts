import { RequestContext, RequestInterceptorFn, TransferInterceptorFactory, TransferOptions, TransferSide, useSimpleJson } from '@tsdi/common';
import { delimiterPacket, delimiterUnpacket, socketMessage } from './interceptors';

const defaultOptions = {
    delimiter: '\r\n',
    idSize: 2
}

export interface PacketOptions extends TransferOptions {
    /**
     * parse value to simple mapping json.
     * @param value 
     * @returns 
     */
    mapping?: (value: any, context: RequestContext) => any,
    reviver?: (this: any, key: string, value: any) => any;
    replacer?: ((this: any, key: string, value: any) => any);
    space?: string | number;
}

export function usePacket(options: PacketOptions = {}): TransferInterceptorFactory {
    return (config) => {
        options = { ...defaultOptions, ...config.transfer, ...options };

        return config.side == TransferSide.client ? [
            socketMessage(config, options),
            useSimpleJson(options)(config) as RequestInterceptorFn,
            delimiterUnpacket(config, options),
            delimiterPacket(config, options)
        ] : [
            socketMessage(config, options),
            delimiterUnpacket(config, options),
            delimiterPacket(config, options),
            useSimpleJson(options)(config) as RequestInterceptorFn,
        ]
    }
}