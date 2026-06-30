import { AbstractRequest, PacketIdGenerator, PatternFormatter, RequestContext, RequestInterceptorFn, StatusMessageAdapter, TransferFilterFactory, TransferOptions, TransferSide, useCatch, useSimpleJson, parseQueryString } from '@tsdi/common';
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

interface MappedRequestLike {
    url?: string;
    topic?: string;
    responseTopic?: string;
    id?: any;
    pattern?: any;
    method?: string;
    params?: { toRecord?: () => any } | Record<string, any>;
    query?: Record<string, any>;
    headers?: { size?: number; getHeaders?: () => Record<string, any> };
    body?: any;
    getUrlWithParams?: () => string;
}

const requestMapping = (req: any, context: RequestContext) => {
    if (req instanceof AbstractRequest) {
        const request = req as AbstractRequest<any> & MappedRequestLike;
        const payloadKey = request.topic || request.pattern ? 'payload' : 'body';
        const json: Record<string, any> = {};
        if (request.url) {
            const fullUrl = typeof request.getUrlWithParams === 'function' ? request.getUrlWithParams() : request.url;
            const [url, rawQuery] = String(fullUrl).split('?', 2);
            json.url = url;
            if (rawQuery) {
                json.query = parseQueryString(rawQuery);
            }
        }
        if (request.topic) {
            json.topic = request.topic;
        }
        if (request.responseTopic) {
            json.responseTopic = request.responseTopic;
        }
        const { id } = request;
        if (id !== undefined && id !== null) {
            json.id = id;
        }
        if (request.pattern) {
            const formatter = context.get(PatternFormatter);
            json.pattern = formatter ? formatter.format(request.pattern) : request.pattern;
        }
        if (request.method) {
            json.method = request.method;
        }
        if ((request as any).observe) {
            json.observe = (request as any).observe;
        }
        if (request.params) {
            const { params } = request;
            json.params = typeof params.toRecord === 'function' ? params.toRecord() : params;
        }
        if (request.query && !json.query) {
            json.query = request.query;
        }
        if (request.headers?.size) {
            json.headers = request.headers.getHeaders?.();
        }
        if (request.body !== undefined && request.body !== null) {
            json[payloadKey] = request.body;
        }
        return json;
    }
    return req;
}

const outgoingMapping = (res: any, context: RequestContext) => {
    const adapter = context.get(StatusMessageAdapter);
    if (adapter) {
        const json: Record<string, any> = {};
        const status = adapter.status;
        const statusMessage = adapter.getStatusMessage?.();
        const error = adapter.error;
        const body = adapter.payload;
        const headerNames = adapter.getResponseHeaderNames?.() ?? [];
        const id = res?.id;
        if (id !== undefined && id !== null) {
            json.id = id;
        }
        if (status !== undefined && status !== null) {
            json.status = status;
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
            json.payload = body;
        } else if (res !== adapter && res !== undefined) {
            const value = res?.payload !== undefined ? res.payload : res;
            json.body = value;
            json.payload = value;
        }
        return json;
    }
    return res;
}

export function useJsonPacket(options: PacketOptions = {}): TransferFilterFactory {
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
            useCatch,
            socketMessage(config, options),
            delimiterUnpacket(config, options),
            delimiterPacket(config, options),
            useSimpleJson(options)(config) as RequestInterceptorFn,
            packetIdMessage(config, options)
        ]
    }
}
