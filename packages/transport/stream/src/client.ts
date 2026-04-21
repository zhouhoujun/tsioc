export * from './handler';
export * from './codec';

import { Injectable, Injector, Abstract } from '@tsdi/ioc';
import { createRequestContext, Pattern, IReadable, RequestContext, StreamAdapter } from '@tsdi/common';
import { HeaderStream, createHeaderStream, PacketHeader } from '@tsdi/common';
import { Observable, catchError, throwError } from 'rxjs';
import { StreamHandler, StreamRequest, StreamResponse } from './handler';
import { HeaderStreamCodec } from './codec';

/**
 * StreamClient - 带HTTP-like Headers的流数据客户端
 */
@Abstract()
export abstract class StreamClient {
    protected abstract get injector(): Injector;
    protected abstract get handler(): StreamHandler;
    protected abstract get codec(): HeaderStreamCodec;
    protected abstract get streamAdapter(): StreamAdapter;

    /**
     * 发送流数据
     */
    sendStream(stream: IReadable, headers?: PacketHeader): Observable<IReadable>;

    /**
     * 发送流数据到指定模式
     */
    sendStream(pattern: Pattern, stream: IReadable, headers?: PacketHeader): Observable<IReadable>;

    /**
     * 发送StreamRequest
     */
    sendStream(request: StreamRequest): Observable<StreamResponse>;

    sendStream(first: IReadable | Pattern | StreamRequest, second?: IReadable | PacketHeader, third?: PacketHeader): Observable<any> {
        let headerStream: HeaderStream;
        const context = createRequestContext(this.injector);

        if (first instanceof StreamRequest) {
            headerStream = first.toStream();
            return this.handler.handle(headerStream, context)
                .pipe(
                    catchError(err => throwError(() => this.onError(err)))
                );
        } else if (this.streamAdapter.isReadable(first) && second === undefined) {
            // sendStream(stream, headers?)
            const headers = {} as PacketHeader;
            headerStream = createHeaderStream('', first as IReadable, headers);
        } else if (this.streamAdapter.isReadable(first) && second !== undefined && !this.streamAdapter.isReadable(second)) {
            // sendStream(stream, headers)
            headerStream = createHeaderStream('', first as IReadable, second as PacketHeader);
        } else if (typeof first === 'string' || typeof first === 'object' && second !== undefined) {
            // sendStream(pattern, stream, headers?)
            const pattern = first as Pattern;
            const stream = second as IReadable;
            const headers = third ?? {} as PacketHeader;
            if (typeof pattern === 'string') {
                headers['pattern'] = pattern;
            } else {
                headers['pattern'] = JSON.stringify(pattern);
            }
            headerStream = createHeaderStream('', stream, headers);
        } else {
            return throwError(() => new Error('Invalid arguments for StreamClient.sendStream'));
        }

        return this.handler.handle(headerStream, context)
            .pipe(
                map(response => response.payload),
                catchError(err => throwError(() => this.onError(err)))
            );
    }

    /**
     * 错误处理
     */
    protected onError(err: Error): Error {
        return err;
    }
}

import { map } from 'rxjs';

/**
 * DefaultStreamClient - 默认客户端实现
 */
@Injectable()
export class DefaultStreamClient extends StreamClient {
    constructor(
        protected injector: Injector,
        protected handler: StreamHandler,
        protected codec: HeaderStreamCodec,
        protected streamAdapter: StreamAdapter
    ) {
        super();
    }
}