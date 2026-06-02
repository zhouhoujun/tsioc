import { AbstractRequest, PatternFormatter, RequestContext, RequestInterceptorFn, TransferInterceptorFactory, TransferOptions, TransferSide, useCatch, Events, REQUEST, parseQueryString } from '@tsdi/common';
import { Provider } from '@tsdi/ioc';
import { Observable, defer, filter, mergeMap, race, take, takeUntil, catchError, throwError } from 'rxjs';
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
} as WsPacketOptions;

const requestMapping = (req: any, context: RequestContext) => {
    if (req instanceof AbstractRequest) {
        const payloadKey = req.pattern ? 'payload' : 'body';
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
            const response$ = wsEvent(socket, eventName).pipe(
                takeUntil(race(wsClose(socket)).pipe(take(1))),
                filter(r => r !== null && r !== undefined),
                take(1)
            );
            const payload = options.mapping ? options.mapping(req, context) : req;
            const message = typeof payload === 'string' ? payload : JSON.stringify(payload, options.replacer, options.space);
            socket.send(message);
            return response$;
        }).pipe(
            mergeMap((data: any) => {
                const str = Buffer.isBuffer(data) ? data.toString() :
                    ArrayBuffer.isView(data) ? Buffer.from(data as Uint8Array).toString() :
                        String(data);
                try {
                    return new Observable(observer => {
                        observer.next(JSON.parse(str));
                        observer.complete();
                    });
                } catch {
                    return new Observable(observer => {
                        observer.next(str);
                        observer.complete();
                    });
                }
            })
        );
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
                    const str = Buffer.isBuffer(data) ? data.toString() :
                        ArrayBuffer.isView(data) ? Buffer.from(data as Uint8Array).toString() :
                            String(data);
                    const parsed = JSON.parse(str);
                    context.set(REQUEST, parsed);
                    context.setPayload(parsed);
                    const adapter = context.getMessageAdapter();
                    if (adapter && typeof (adapter as any).setRequestData === 'function') {
                        (adapter as any).setRequestData(parsed);
                    }
                    return defer(() => next(parsed, context)).pipe(
                        catchError(err => {
                            return throwError(() => err);
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
                    outgoing = request?.id ? { id: request.id, payload: outgoing } : { payload: outgoing };
                } else if (request?.id && !(outgoing as any).id) {
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
export function useWsPacket(options: WsPacketOptions = {}): TransferInterceptorFactory {
    return (config) => {
        options = { ...defaultOptions, ...config.transfer, ...options };

        const isClient = config.side === TransferSide.client;
        if (!options.mapping) {
            options.mapping = isClient ? requestMapping : outgoingMapping;
        }

        return [
            useCatch,
            wsMessage(config, options)
        ];
    }
}
