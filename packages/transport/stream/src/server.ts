export * from './handler';
export * from './codec';

import { Injectable, Injector, Abstract } from '@tsdi/ioc';
import { RequestContext, Pattern, IReadable, StreamAdapter } from '@tsdi/common';
import { HeaderStream, createHeaderStream, PacketHeader, MessageType } from '@tsdi/common';
import { Observable, of, map, catchError } from 'rxjs';
import { StreamHandler, StreamResponse } from './handler';
import { HeaderStreamCodec } from './codec';

/**
 * StreamServer - 带HTTP-like Headers的流数据服务端
 */
@Abstract()
export abstract class StreamServer {
    protected abstract get injector(): Injector;
    protected abstract get handler(): StreamHandler;
    protected abstract get codec(): HeaderStreamCodec;
    protected abstract get streamAdapter(): StreamAdapter;

    /**
     * 处理HeaderStream消息
     */
    handleMessage(input: HeaderStream, context: RequestContext): Observable<StreamResponse> {
        return this.handler.handle(input, context)
            .pipe(
                catchError(err => {
                    const emptyStream = this.streamAdapter.createPassThrough() as IReadable;
                    const errorPacket = createHeaderStream(
                        '',
                        emptyStream,
                        { error: err.message || 'Internal Server Error' },
                        0
                    );
                    return of(new StreamResponse(errorPacket, 500, 'Internal Server Error'));
                })
            );
    }

    /**
     * 注册处理路由
     */
    abstract register(pattern: Pattern, handler: (stream: HeaderStream, context: RequestContext) => Observable<IReadable | HeaderStream>): void;
}

/**
 * DefaultStreamServer - 默认服务端实现
 */
@Injectable()
export class DefaultStreamServer extends StreamServer {
    private routes: Map<string, (stream: HeaderStream, context: RequestContext) => Observable<any>> = new Map();

    constructor(
        protected injector: Injector,
        protected handler: StreamHandler,
        protected codec: HeaderStreamCodec,
        protected streamAdapter: StreamAdapter
    ) {
        super();
    }

    register(pattern: Pattern, handler: (stream: HeaderStream, context: RequestContext) => Observable<IReadable | HeaderStream>): void {
        const patternKey = typeof pattern === 'string' ? pattern : JSON.stringify(pattern);
        this.routes.set(patternKey, handler);
    }

    handleMessage(input: HeaderStream, context: RequestContext): Observable<StreamResponse> {
        // 检查是否有匹配的路由
        const pattern = input.headers?.['pattern'] as string;
        if (pattern && this.routes.has(pattern)) {
            const routeHandler = this.routes.get(pattern)!;
            return routeHandler(input, context)
                .pipe(
                    map(result => {
                        if (result && result.type === MessageType.STREAM) {
                            return new StreamResponse(result as HeaderStream);
                        }
                        const responseStream = createHeaderStream(
                            input.id ?? '',
                            result as IReadable,
                            {}
                        );
                        return new StreamResponse(responseStream);
                    }),
                    catchError(err => {
                        const emptyStream = this.streamAdapter.createPassThrough() as IReadable;
                        const errorPacket = createHeaderStream(
                            '',
                            emptyStream,
                            { error: err.message || 'Internal Server Error' },
                            0
                        );
                        return of(new StreamResponse(errorPacket, 500, 'Internal Server Error'));
                    })
                );
        }

        return super.handleMessage(input, context);
    }
}