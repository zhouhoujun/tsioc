import { AbstractRequest, PacketIdGenerator, PatternFormatter, RequestContext, RequestInterceptorFn, TransferInterceptorFactory, TransferOptions, TransferSide, useCatch, useSimpleJson } from '@tsdi/common';
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
        const payloadKey = req.pattern ? 'payload' : 'body';
        const json: Record<string, any> = {};
        if ((req as any).url) {
            json.url = typeof (req as any).getUrlWithParams === 'function' ? (req as any).getUrlWithParams() : (req as any).url;
        }
        if ((req as any).topic) {
            json.topic = (req as any).topic;
        }
        if ((req as any).responseTopic) {
            json.responseTopic = (req as any).responseTopic;
        }
        if ((req as any).id) {
            json.id = (req as any).id;
        }
        if ((req as any).pattern) {
            const formatter = context.get(PatternFormatter);
            json.pattern = formatter ? formatter.format((req as any).pattern) : (req as any).pattern;
        }
        if ((req as any).method) {
            json.method = (req as any).method;
        }
        if ((req as any).params) {
            json.params = (req as any).params;
        }
        if ((req as any).query) {
            json.query = (req as any).query;
        }
        if ((req as any).headers?.size) {
            json.headers = (req as any).headers.getHeaders();
        }
        if ((req as any).body !== undefined && (req as any).body !== null) {
            json[payloadKey] = (req as any).body;
        }
        return json;
    }
    return req;
}

const outgoingMapping = (res: any, context: RequestContext) => {
    const adapter = context.getMessageAdapter() as any;
    if (adapter && (typeof adapter.getStatus === 'function' || typeof adapter.getBody === 'function')) {
        const json: Record<string, any> = {};
        const status = adapter.getStatus?.();
        const statusMessage = adapter.getStatusMessage?.();
        const error = adapter.getError?.();
        const body = adapter.getBody?.();
        const headerNames = adapter.getResponseHeaderNames?.() ?? [];
        if (status !== undefined && status !== null) {
            json.status = status;
            json.statusCode = status;
        }
        if (statusMessage !== undefined && statusMessage !== null) {
            json.statusMessage = statusMessage;
        }
        if (error !== undefined && error !== null) {
            json.error = error;
        }
        if (headerNames.length) {
            json.headers = {};
            headerNames.forEach((name: string) => {
                json.headers[name] = adapter.getResponseHeader?.(name);
            });
        }
        if (body !== undefined) {
            json.body = body;
        } else if (res !== adapter && res !== undefined) {
            json.body = res;
        }
        return json;
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
            useCatch,
            packetIdMessage(config, options),
            useSimpleJson(options)(config) as RequestInterceptorFn,
            delimiterUnpacket(config, options),
            delimiterPacket(config, options),
            socketMessage(config, options)
        ] : [
            useCatch,
            socketMessage(config, options),
            delimiterUnpacket(config, options),
            delimiterPacket(config, options),
            useSimpleJson(options)(config) as RequestInterceptorFn,
            packetIdMessage(config, options)
        ]
    }
}
