import { ContextToken, isDefined, ProvdierOf, Provider } from '@tsdi/ioc';
import { catchError, defer, map, mergeMap, of } from 'rxjs';
import { RequestInterceptorFn, RequestInterceptorLike } from './interceptor';
import { TransportConfig } from './protocols';
import { CONTENT_LENGTH, RequestContext } from './context';
import { Events } from './events';
import { MessageAdapter } from './MessageAdapter';
import { StreamAdapter } from './StreamAdapter';
import { Logger } from '@tsdi/logger';

export enum TransferSide {
    client = 1,
    server,
}

export enum TransferFeatureKind {
    UnPacket,
    Decode,
    Deserialize,
    Serialize,
    Encode,
    Packet
}

export interface TransferOptions {
    eventName?: string;
    delimiter?: string;
    maxSize?: number;
    limitSize?: number;

    idSize?: number;
    /**
     * packet with size.
     */
    size?: number;

}

export interface TransferConfig extends TransportConfig {
    side: TransferSide;
    transfer?: TransferOptions;
    providers?: Provider[];
}


export interface TransferFeature<Kind extends TransferFeatureKind> {
    kind: Kind;
    config?: TransferConfig;
    providers: Provider[];
}

export function makeTransferFeature<T extends TransferFeatureKind>(kind: T, providers: Provider[], config?: TransferConfig): TransferFeature<T> {
    return {
        kind,
        config,
        providers
    }
}


export interface TransferInterceptorFactory {
    (side: TransferConfig): ProvdierOf<RequestInterceptorLike> | ProvdierOf<RequestInterceptorLike>[];
}

export interface StringTransferOptions {
    type: 'string';
    codings?: string;
    /**
     * custom packet unpacket.
     */
    packet?: TransferOptions;
}

export interface JsonTransferOptions {
    type: 'json';
    payloadKey?: 'payload' | 'body';
    /**
     * custom packet unpacket.
     */
    packet?: TransferOptions;
}

export interface StreamTransferOptions {
    type: 'stream';

}


export type TransferFactoryOptions = StringTransferOptions | JsonTransferOptions | StreamTransferOptions | TransferInterceptorFactory[];


export const PAYLOAD_KEY = new ContextToken<string>(() => 'body');


export const useCatch: RequestInterceptorFn = (req, next, context) => {
    return next(req, context)
        .pipe(
            catchError(err => {
                const logger = context.get(Logger);
                logger ? logger.error(err) : console.error(err);
                return of(null);
            })
        )
}


export function useSimpleJson(options?: {
    /**
     * parse value to simple mapping json.
     * @param value 
     * @returns 
     */
    mapping?: (value: any, context: RequestContext) => any,
    reviver?: (this: any, key: string, value: any) => any;
    replacer?: ((this: any, key: string, value: any) => any);
    space?: string | number;
}): TransferInterceptorFactory {
    return (config) => {
        const interceptor: RequestInterceptorFn = config.side === TransferSide.client ? (req, next, context) => {
            const reqdata = JSON.stringify(options?.mapping ? options.mapping(req, context) : req, options?.replacer, options?.space);
            return next(reqdata, context)
                .pipe(
                    mergeMap(async res => {
                        const streamAdapter = context.get(StreamAdapter);
                        if (streamAdapter.isReadable(res)) {
                            res = await streamAdapter.read(res);
                        }
                        let incoming = res;
                        if (typeof res === 'string' || Buffer.isBuffer(res)) {
                            const raw = res.toString();
                            try {
                                incoming = JSON.parse(raw, options?.reviver);
                            } catch {
                                incoming = raw;
                            }
                        }
                        if (isDefined(incoming?.payload)) {
                            if (typeof incoming.payload === 'string') {
                                try {
                                    incoming.payload = JSON.parse(incoming.payload, options?.reviver);
                                } catch {
                                    // keep raw string payload
                                }
                            }
                            if (!isDefined(incoming?.body)) incoming.body = incoming.payload;
                        }
                        if (isDefined(incoming?.body) && typeof incoming.body === 'string') {
                            try {
                                incoming.body = JSON.parse(incoming.body, options?.reviver);
                            } catch {
                                // keep raw string body
                            }
                        }
                        return incoming;

                    })
                )
        }
            :
            (req, next, context) => {
                return defer(async () => {
                    const streamAdapter = context.get(StreamAdapter);
                    if (streamAdapter.isReadable(req)) {
                        req = await streamAdapter.read(req);
                    }
                    const raw = Buffer.isBuffer(req) ? req.toString() : String(req);
                    const incoming = JSON.parse(raw, options?.reviver);
                    if (isDefined(incoming?.payload)) incoming.body = incoming.payload;
                    return incoming;
                })
                    .pipe(
                        mergeMap(rjson => {
                            context.set(Events.REQUEST, rjson);
                            context.setPayload(rjson);
                            const adapter = context.get(MessageAdapter);
                            if (adapter) {
                                const forked = adapter.forkRequest(rjson);
                                if (forked !== adapter) {
                                    context.setMessageAdapter(forked);
                                } else {
                                    adapter.setRequestData(rjson);
                                }
                            }
                            return next(rjson, context).pipe(
                                mergeMap(async res => {
                                    const streamAdapter = context.get(StreamAdapter);
                                    const mapped = options?.mapping ? options.mapping(res, context) : res;
                                    if (streamAdapter.isReadable(mapped?.payload)) {
                                        const rawPayload = await streamAdapter.read(mapped.payload);
                                        mapped.payload = rawPayload;
                                        mapped.body = rawPayload;
                                    }
                                    if (streamAdapter.isReadable(mapped?.body)) {
                                        const rawBody = await streamAdapter.read(mapped.body);
                                        mapped.body = rawBody;
                                        if (mapped.payload === res || mapped.payload === mapped.body) {
                                            mapped.payload = rawBody;
                                        }
                                    }
                                    const output = JSON.stringify(mapped, options?.replacer, options?.space);
                                    if ((mapped as any)?.id && ((mapped as any)?.url === 'content/big.json' || (mapped as any)?.url === '/content/big.json')) {
                                        console.log('tcp-big-mapped', {
                                            keys: Object.keys(mapped),
                                            payloadType: typeof mapped.payload,
                                            bodyType: typeof mapped.body,
                                            payloadSize: Buffer.isBuffer(mapped.payload) ? mapped.payload.length : (typeof mapped.payload === 'string' ? Buffer.byteLength(mapped.payload) : undefined),
                                            bodySize: Buffer.isBuffer(mapped.body) ? mapped.body.length : (typeof mapped.body === 'string' ? Buffer.byteLength(mapped.body) : undefined),
                                            outputSize: Buffer.byteLength(output)
                                        });
                                    }
                                    if (typeof context.set === 'function') {
                                        context.set(CONTENT_LENGTH, Buffer.byteLength(output));
                                    }
                                    return output;
                                }),
                                catchError(err => {
                                    const adapter = context.get(MessageAdapter, null as any) as any;
                                    if (adapter) {
                                        if (typeof adapter.setPayload === 'function') {
                                            adapter.setPayload(null);
                                        }
                                        if (typeof adapter.setStatus === 'function' && adapter.status == null) {
                                            adapter.setStatus(err?.statusCode ?? err?.status ?? 500, err?.statusMessage ?? err?.message);
                                        }
                                        if (typeof adapter.setError === 'function') {
                                            adapter.setError(err);
                                        }
                                    }
                                    const responseLike = { id: rjson?.id };
                                    return of(JSON.stringify(options?.mapping ? options.mapping(responseLike, context) : responseLike, options?.replacer, options?.space));
                                })
                            )
                        })
                    )
            };

        return interceptor;
    }

}
