import { Injectable, Abstract } from '@tsdi/ioc';
import { RequestContext, Pattern, IReadable, StreamAdapter } from '@tsdi/common';
import { HeaderStream, createHeaderStream, PacketHeader } from '@tsdi/common';
import { Observable, of } from 'rxjs';

/**
 * StreamRequestOptions - Stream请求选项
 */
export interface StreamRequestOptions {
    /**
     * 请求模式
     */
    pattern?: Pattern;

    /**
     * 流数据
     */
    stream: IReadable;

    /**
     * HTTP-like Headers
     */
    headers?: PacketHeader;

    /**
     * 消息ID
     */
    id?: string | number;

    /**
     * 内容长度(可选)
     */
    contentLength?: number;

    /**
     * 分块大小
     */
    chunkSize?: number;
}

/**
 * StreamRequest - Stream请求类
 */
export class StreamRequest {
    readonly pattern: Pattern | null = null;
    readonly stream: IReadable;
    readonly headers: PacketHeader = {};
    readonly id?: string | number;
    readonly contentLength?: number;
    readonly chunkSize?: number;

    constructor(options: StreamRequestOptions) {
        this.pattern = options.pattern ?? null;
        this.stream = options.stream;
        this.headers = options.headers ?? {};
        this.id = options.id;
        this.contentLength = options.contentLength;
        this.chunkSize = options.chunkSize;
    }

    /**
     * 转换为HeaderStream
     */
    toStream(): HeaderStream {
        return createHeaderStream(
            this.id ?? '',
            this.stream,
            this.headers,
            this.contentLength,
            this.chunkSize
        );
    }
}

/**
 * StreamResponse - Stream响应类
 */
export class StreamResponse {
    readonly stream: HeaderStream;
    readonly status: number = 200;
    readonly statusText: string = 'OK';

    constructor(stream: HeaderStream, status?: number, statusText?: string) {
        this.stream = stream;
        this.status = status ?? 200;
        this.statusText = statusText ?? 'OK';
    }

    /**
     * 获取payload流
     */
    get payload(): IReadable {
        return this.stream.payload;
    }

    /**
     * 获取headers
     */
    get headers(): PacketHeader {
        return this.stream.headers ?? {};
    }

    /**
     * 是否成功
     */
    get ok(): boolean {
        return this.status >= 200 && this.status < 300;
    }
}

/**
 * StreamHandler - Stream请求处理器接口
 */
@Abstract()
export abstract class StreamHandler {
    abstract handle(input: HeaderStream | StreamRequest, context: RequestContext): Observable<StreamResponse>;
}

/**
 * DefaultStreamHandler - 默认处理器实现
 */
@Injectable()
export class DefaultStreamHandler implements StreamHandler {
    constructor(protected streamAdapter: StreamAdapter) {}

    handle(input: HeaderStream | StreamRequest, context: RequestContext): Observable<StreamResponse> {
        const stream = input instanceof StreamRequest ? input.toStream() : input;
        return of(new StreamResponse(stream));
    }
}