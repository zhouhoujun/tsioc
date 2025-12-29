import { AbstractOutgoing, AbstractRequest, PatternFormatter, RequestContext, RequestInterceptorFn, TransferInterceptorFactory, TransferOptions, TransferSide, useSimpleJson } from '@tsdi/common';
import { delimiterPacket, delimiterUnpacket, packetIdMessage, socketMessage } from './interceptors';

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


const requestMapping = (req: any, context: RequestContext) => {
    if (req instanceof AbstractRequest) {
        return req.toJson(context.get(PatternFormatter))
    }
    return req;
}
const outgoingMapping = (res: any, context: RequestContext) => {
    if (res instanceof AbstractOutgoing) {
        return res.toJson()
    }
    return res;
}

export function usePacket(options: PacketOptions = {}): TransferInterceptorFactory {
    return (config) => {
        options = { ...defaultOptions, ...config.transfer, ...options };
        if (!options.mapping) {
            options.mapping = config.side == TransferSide.client ? requestMapping : outgoingMapping
        }

        return config.side == TransferSide.client ? [
            packetIdMessage(config, options),
            useSimpleJson(options)(config) as RequestInterceptorFn,
            delimiterUnpacket(config, options),
            delimiterPacket(config, options),
            socketMessage(config, options)
        ] : [
            socketMessage(config, options),
            delimiterUnpacket(config, options),
            delimiterPacket(config, options),
            useSimpleJson(options)(config) as RequestInterceptorFn,
            packetIdMessage(config, options)
        ]
    }
}