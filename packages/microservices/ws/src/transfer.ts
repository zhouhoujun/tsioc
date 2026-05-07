import { AbstractOutgoing, AbstractRequest, PatternFormatter, RequestContext, RequestInterceptorFn, TransferInterceptorFactory, TransferOptions, TransferSide, useCatch, Events, REQUEST } from '@tsdi/common';
import { Provider } from '@tsdi/ioc';
import { defer, filter, fromEvent, mergeMap, race, take, takeUntil } from 'rxjs';
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

const outgoingMapping = (res: any, context: RequestContext) => {
    if (res instanceof AbstractOutgoing) {
        return res.toJson()
    }
    return res;
}

/**
 * WebSocket message transfer interceptor.
 * WebSocket 消息传输拦截器
 */
function wsMessage(config: any, options: WsPacketOptions): RequestInterceptorFn {
    return config.side === TransferSide.client ? (req, next, context) => {
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
                return fromEvent(socket, options.eventName || Events.MESSAGE)
                    .pipe(
                        takeUntil(race(fromEvent(socket, Events.CLOSE), fromEvent(socket, Events.DISCONNECT)).pipe(take(1))),
                        filter(r => r !== null && r !== undefined),
                        take(1)
                    );
            }),
            mergeMap((data: any) => {
                try {
                    // WebSocket data is Buffer or string
                    const str = Buffer.isBuffer(data) ? data.toString() :
                        ArrayBuffer.isView(data) ? Buffer.from(data as Uint8Array).toString() :
                            String(data);
                    return next(JSON.parse(str), context);
                } catch (e) {
                    return next(data, context);
                }
            })
        );
    } : (socket, next, context) => {
        return fromEvent(socket, options.eventName || Events.MESSAGE).pipe(
            takeUntil(race(fromEvent(socket, Events.CLOSE), fromEvent(socket, Events.DISCONNECT)).pipe(take(1))),
            filter(r => r !== null && r !== undefined),
            mergeMap(data => {
                try {
                    // WebSocket data is Buffer or string
                    const str = Buffer.isBuffer(data) ? data.toString() :
                        ArrayBuffer.isView(data) ? Buffer.from(data as Uint8Array).toString() :
                            String(data);
                    const parsed = JSON.parse(str);
                    context.set(REQUEST, parsed);
                    // Set REQUEST to parsed data for message reader
                    (context as any).request = parsed;
                    return next(parsed, context);
                } catch (e) {
                    // If not JSON, pass as-is
                    context.set(REQUEST, data);
                    (context as any).request = data;
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

        return isClient ? [
            useCatch,
            wsMessage(config, options)
        ] : [
            useCatch,
            wsMessage(config, options)
        ];
    };
}
