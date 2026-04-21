import { Injectable } from '@tsdi/ioc';
import { RequestContext, StreamAdapter, IReadable } from '@tsdi/common';
import { MessageType, HeaderStream, createHeaderStream } from '@tsdi/common';
import { Observable, from, map, mergeMap } from 'rxjs';
import { HeaderStreamCodec } from './codec';

/**
 * StreamInterceptor - HeaderStream请求拦截器
 * 处理带HTTP-like Headers的流数据
 */
@Injectable()
export class StreamInterceptor {

    constructor(protected codec: HeaderStreamCodec) {}

    /**
     * 拦截处理
     */
    intercept(input: Buffer, next: (stream: HeaderStream) => Observable<HeaderStream>, context: RequestContext): Observable<HeaderStream> {
        return from(this.processInput(input, context))
            .pipe(
                mergeMap(stream => next(stream)),
                map(res => this.processOutput(res, context))
            );
    }

    /**
     * 处理输入数据 - 解码Buffer为HeaderStream
     */
    protected async processInput(input: Buffer, context: RequestContext): Promise<HeaderStream> {
        return this.codec.decode(input, context);
    }

    /**
     * 处理输出数据
     */
    protected processOutput(stream: HeaderStream, context: RequestContext): HeaderStream {
        if (stream && stream.type === MessageType.STREAM) {
            return stream;
        }

        // 如果不是HeaderStream，尝试转换
        const streamAdapter = context.get(StreamAdapter);
        if (streamAdapter.isReadable(stream)) {
            return createHeaderStream('', stream as IReadable, {}, undefined, 64 * 1024);
        }

        // 其他情况，创建一个空的流
        const emptyStream = streamAdapter.createPassThrough();
        return createHeaderStream('', emptyStream as IReadable, {});
    }
}