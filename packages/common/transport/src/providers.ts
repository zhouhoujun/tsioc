import { AbstractOutgoing, AbstractRequest, PacketIdGenerator, PatternFormatter, RequestContext, RequestInterceptorFn, TransferInterceptorFactory, TransferOptions, TransferSide, useSimpleJson } from '@tsdi/common';
import { delimiterPacket, delimiterUnpacket, packetIdMessage, socketMessage } from './interceptors';
import { ProvdierOf, toProvider } from '@tsdi/ioc';
import { PacketNumberIdGenerator } from './PacketId';

const defaultOptions = {
    delimiter: '\r\n',
    idSize: 2,
    packetId: PacketNumberIdGenerator
} as PacketOptions;

export interface PacketOptions extends TransferOptions {
    /**
     * packet id generator.
     */
    packetId?: ProvdierOf<PacketIdGenerator>
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
        return req.toJson({ formatter: context.get(PatternFormatter) })
    }
    return req;
}
const outgoingMapping = (res: any, context: RequestContext) => {
    if (res instanceof AbstractOutgoing) {
        return res.toJson()
    }
    return res;
}

export function useJsonPacket(options: PacketOptions = {}): TransferInterceptorFactory {
    return (config) => {
        options = { ...defaultOptions, ...config.transfer, ...options };

        const isClient = config.side == TransferSide.client
        if (!options.mapping) {
            options.mapping = isClient ? requestMapping : outgoingMapping
        }
        if (isClient) {
            if (!config.providers) {
                config.providers = [];
            }
            config.providers.push(toProvider(PacketIdGenerator, options.packetId))
        }

        return isClient ? [
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