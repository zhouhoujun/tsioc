import { AbstractRequest, MessageAdapter, PacketIdGenerator, PatternFormatter, RequestContext, RequestInterceptorFn, StatusMessageAdapter, TransferFilterFactory, TransferOptions, TransferSide, useCatch, Events, REQUEST, parseQueryString } from '@tsdi/common';
import { Provider, toProvider } from '@tsdi/ioc';
import { Observable, defer, filter, mergeMap, race, take, takeUntil, catchError, of, timeout as rxTimeout } from 'rxjs';
import { PacketNumberIdGenerator, packetIdMessage } from '@tsdi/transport';
import { SOCKET } from './context';

export interface WsPacketOptions extends TransferOptions {
    /**
     * packet id generator.
     */
    packetId?: Provider
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

const defaultOptions = {
    eventName: Events.MESSAGE,
    idSize: 2,
    packetId: PacketNumberIdGenerator
} as WsPacketOptions;

const requestMapping = (req: any, context: RequestContext) => {
    if (req instanceof AbstractRequest) {
        const payloadKey = (req as any).pattern ? 'payload' : 'body';
        const json: Record<string, any> = {};
        if ((req as any).url) {
            const fullUrl = typeof (req as any).getUrlWithParams === 'function' ? (req as any).getUrlWithParams() : (req as any).url;
            const [url, rawQuery] = String(fullUrl).split('?', 2);
            json.url = url;
            if (rawQuery) {
                json.query = parseQueryString(rawQuery);
            }
        }
        if ((req as any).topic) {
            json.topic = (req as any).topic;
        }
        if ((req as any).responseTopic) {
            json.responseTopic = (req as any).responseTopic;
        }
        if ((req as any).id !== undefined && (req as any).id !== null) {
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
            const params = (req as any).params;
            json.params = typeof params?.toRecord === 'function' ? params.toRecord() : params;
        }
        if ((req as any).query && !json.query) {
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
    const adapter = context.get(StatusMessageAdapter) as any;
    if (adapter) {
        const json: Record<string, any> = {};
        const status = adapter.getStatus?.();
        const statusMessage = adapter.getStatusMessage?.();
        const error = adapter.getError?.();
        const body = adapter.getBody?.();
        const headerNames = adapter.getResponseHeaderNames?.() ?? [];
        const id = res?.id;
        if (id !== undefined && id !== null) {
            json.id = id;
        }
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

function parseWsData(data: any): any {
    const str = Buffer.isBuffer(data) ? data.toString() :
        ArrayBuffer.isView(data) ? Buffer.from(data as Uint8Array).toString() :
            String(data);
    try {
        return JSON.parse(str);
    } catch {
        return str;
    }
}

function wsEvent(socket: any, eventName: string): Observable<any> {
    return new Observable(observer => {
        const handler = (data: any) => observer.next(data);
        const errorHandler = (err: any) => observer.error(err);
        socket.on(eventName, handler);
        socket.on(Events.ERROR, errorHandler);
        return () => {
            socket.off?.(eventName, handler);
            socket.off?.(Events.ERROR, errorHandler);
        };
    });
}

function wsClose(socket: any): Observable<any> {
    return new Observable(observer => {
        const closeHandler = (...args: any[]) => observer.next(args);
        socket.on(Events.CLOSE, closeHandler);
        return () => {
            socket.off?.(Events.CLOSE, closeHandler);
        };
    });
}

/**
 * WebSocket message transfer interceptor.
 * WebSocket 消息传输拦截器
 */
function wsMessage(config: any, options: WsPacketOptions): RequestInterceptorFn {
    const eventName = options.eventName || Events.MESSAGE;
    return config.side === TransferSide.client ? (req: any, next: any, context: any) => {
        return defer(() => {
            const socket = context.get(SOCKET);
            if (!socket) {
                throw new Error('no socket in context');
            }
            const payload = options.mapping ? options.mapping(req, context) : req;
            const message = typeof payload === 'string' ? payload : JSON.stringify(payload, options.replacer, options.space);
            let response$ = wsEvent(socket, eventName).pipe(
                takeUntil(race(wsClose(socket)).pipe(take(1))),
                filter(r => r !== null && r !== undefined),
                mergeMap((data: any) => of(parseWsData(data))),
                filter((res: any) => req?.observe === 'observe' || req?.id == null || (res && typeof res === 'object' && (res as any).id == req.id))
            );
            if (req?.observe !== 'observe') {
                response$ = response$.pipe(take(1));
            }
            if (req?.timeout != null && req.timeout !== Infinity) {
                response$ = response$.pipe(rxTimeout(req.timeout));
            }
            socket.send(message);
            return response$;
        });
    } : (_input: any, next: any, context: any) => {
        const socket = context.get(SOCKET);
        if (!socket) {
            throw new Error('no socket in context');
        }
        return wsEvent(socket, eventName).pipe(
            takeUntil(race(wsClose(socket)).pipe(take(1))),
            filter(r => r !== null && r !== undefined),
            mergeMap(data => {
                try {
                    const parsed = parseWsData(data);
                    if (typeof parsed === 'string') {
                        throw new Error('raw-text');
                    }
                    context.set(REQUEST, parsed);
                    context.setPayload(parsed);
                    const adapter = context.get(MessageAdapter);
                    if (adapter) {
                        const forked = adapter.forkRequest(parsed);
                        if (forked !== adapter) {
                            context.setMessageAdapter(forked);
                        } else {
                            adapter.setRequestData(parsed);
                        }
                    }
                    return defer(() => next(parsed, context)).pipe(
                        catchError(err => {
                            const errorResponse = {
                                id: parsed?.id ?? null,
                                error: true,
                                statusCode: err.statusCode ?? 500,
                                statusMessage: err.statusMessage ?? err.message ?? 'Internal Server Error',
                                message: err.message ?? String(err)
                            };
                            socket.send(JSON.stringify(errorResponse));
                            return of(errorResponse);
                        })
                    );
                } catch {
                    context.set(REQUEST, data);
                    context.setPayload(data as any);
                    return next(data, context);
                }
            }),
            mergeMap(async res => {
                if (!res) return;
                let outgoing = options.mapping ? options.mapping(res, context) : res;
                const request = context.get(REQUEST) as any;
                if (outgoing === null || outgoing === undefined || (typeof outgoing !== 'object' && typeof outgoing !== 'function')) {
                    outgoing = request?.id !== undefined && request?.id !== null ? { id: request.id, payload: outgoing } : { payload: outgoing };
                } else if (request?.id !== undefined && request?.id !== null && ((outgoing as any).id === undefined || (outgoing as any).id === null)) {
                    (outgoing as any).id = request.id;
                }
                const message = JSON.stringify(outgoing);
                socket.send(message);
                return outgoing;
            })
        );
    };
}

/**
 * Use WebSocket packet transfer for microservice.
 * 为微服务使用 WebSocket 数据包传输
 */
export function useWsPacket(options: WsPacketOptions = {}): TransferFilterFactory {
    return (config) => {
        options = { ...defaultOptions, ...config.transfer, ...options };

        const isClient = config.side === TransferSide.client;
        if (!options.mapping) {
            options.mapping = isClient ? requestMapping : outgoingMapping;
        }
        if (isClient) {
            config.providers ??= [];
            config.providers.push(toProvider(PacketIdGenerator, options.packetId));
        }

        return isClient ? [
            useCatch,
            packetIdMessage(config, options),
            wsMessage(config, options)
        ] : [
            useCatch,
            wsMessage(config, options),
            packetIdMessage(config, options)
        ];
    }
}
