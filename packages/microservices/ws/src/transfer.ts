import { AbstractOutgoing, AbstractRequest, PatternFormatter, RequestContext, RequestInterceptorFn, TransferInterceptorFactory, TransferOptions, TransferSide, useCatch, Events, REQUEST } from '@tsdi/common';
import { Provider } from '@tsdi/ioc';
import { Observable, defer, filter, mergeMap, race, take, takeUntil } from 'rxjs';
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
        return req.toJson({ formatter: context.get(PatternFormatter) })
    }
    return req;
}

const outgoingMapping = (res: any, _context: RequestContext) => {
    if (res instanceof AbstractOutgoing) {
        return res.toJson()
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
        return defer(async () => {
            const socket = context.get(SOCKET);
            if (!socket) {
                throw new Error('no socket in context');
            }
            const message = typeof req === 'string' ? req : JSON.stringify(req);
            socket.send(message);
            return req;
        }).pipe(
            mergeMap(() => {
                const socket = context.get(SOCKET);
                return wsEvent(socket, eventName)
                    .pipe(
                        takeUntil(race(wsClose(socket)).pipe(take(1))),
                        filter(r => r !== null && r !== undefined),
                        take(1)
                    );
            }),
            mergeMap((data: any) => {
                try {
                    const str = Buffer.isBuffer(data) ? data.toString() :
                        ArrayBuffer.isView(data) ? Buffer.from(data as Uint8Array).toString() :
                            String(data);
                    return next(JSON.parse(str), context);
                } catch {
                    return next(data, context);
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
                    return next(parsed, context);
                } catch {
                    context.set(REQUEST, data);
                    context.setPayload(data as any);
                    return next(data, context);
                }
            }),
            mergeMap(async res => {
                if (!res) return;
                const message = typeof res === 'string' ? res : JSON.stringify(res);
                socket.send(message);
                return res;
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
    };
}
