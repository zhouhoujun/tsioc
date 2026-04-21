export * from './handler';
export * from './codec';

import { Injectable, Injector, Abstract } from '@tsdi/ioc';
import { RequestContext, Pattern } from '@tsdi/common';
import { HeaderPacket, createHeaderPacket, PacketHeader, MessageType } from '@tsdi/common';
import { Observable, of, map, catchError } from 'rxjs';
import { PacketHandler, PacketResponse } from './handler';
import { HeaderPacketCodec } from './codec';

/**
 * PacketServer - 带HTTP-like Headers的数据包服务端
 */
@Abstract()
export abstract class PacketServer {
    protected abstract get injector(): Injector;
    protected abstract get handler(): PacketHandler;
    protected abstract get codec(): HeaderPacketCodec;

    /**
     * 处理HeaderPacket消息
     */
    handleMessage<T>(input: HeaderPacket<T>, context: RequestContext): Observable<PacketResponse> {
        return this.handler.handle(input, context)
            .pipe(
                catchError(err => {
                    const errorPacket = createHeaderPacket(
                        '',
                        { error: err.message || 'Internal Server Error' },
                        0,
                        { 'content-type': 'application/json' }
                    );
                    return of(new PacketResponse(errorPacket, 500, 'Internal Server Error'));
                })
            );
    }

    /**
     * 注册处理路由
     */
    abstract register<T, R>(pattern: Pattern, handler: (packet: HeaderPacket<T>, context: RequestContext) => Observable<R | HeaderPacket<R>>): void;
}

/**
 * DefaultPacketServer - 默认服务端实现
 */
@Injectable()
export class DefaultPacketServer extends PacketServer {
    private routes: Map<string, (packet: HeaderPacket<any>, context: RequestContext) => Observable<any>> = new Map();

    constructor(
        protected injector: Injector,
        protected handler: PacketHandler,
        protected codec: HeaderPacketCodec
    ) {
        super();
    }

    register<T, R>(pattern: Pattern, handler: (packet: HeaderPacket<T>, context: RequestContext) => Observable<R | HeaderPacket<R>>): void {
        const patternKey = typeof pattern === 'string' ? pattern : JSON.stringify(pattern);
        this.routes.set(patternKey, handler);
    }

    handleMessage<T>(input: HeaderPacket<T>, context: RequestContext): Observable<PacketResponse> {
        // 检查是否有匹配的路由
        const pattern = input.headers?.['pattern'] as string;
        if (pattern && this.routes.has(pattern)) {
            const routeHandler = this.routes.get(pattern)!;
            return routeHandler(input, context)
                .pipe(
                    map(result => {
                        if (result && result.type === MessageType.PACKET) {
                            return new PacketResponse(result as HeaderPacket);
                        }
                        const responsePacket = createHeaderPacket(
                            input.id ?? '',
                            result,
                            Buffer.byteLength(JSON.stringify(result)),
                            {}
                        );
                        return new PacketResponse(responsePacket);
                    }),
                    catchError(err => {
                        const errorPacket = createHeaderPacket(
                            '',
                            { error: err.message || 'Internal Server Error' },
                            0,
                            { 'content-type': 'application/json' }
                        );
                        return of(new PacketResponse(errorPacket, 500, 'Internal Server Error'));
                    })
                );
        }

        return super.handleMessage(input, context);
    }
}