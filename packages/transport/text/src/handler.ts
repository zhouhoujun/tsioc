import { Injectable, Abstract, Injector } from '@tsdi/ioc';
import { RequestContext, createRequestContext, StreamAdapter, Pattern } from '@tsdi/common';
import { TextMessage, createTextMessage } from '@tsdi/common';
import { Observable, defer, mergeMap, map, throwError, catchError, of } from 'rxjs';

/**
 * TextRequest - 文本请求
 */
export interface TextRequestOptions {
    /**
     * 请求模式
     */
    pattern?: Pattern;

    /**
     * 文本内容
     */
    text: string;

    /**
     * 文本编码
     */
    encoding?: BufferEncoding;

    /**
     * 请求头
     */
    headers?: Record<string, string | number>;
}

/**
 * TextRequest类
 */
export class TextRequest {
    readonly pattern: Pattern | null = null;
    readonly text: string;
    readonly encoding: BufferEncoding = 'utf8';
    readonly headers: Record<string, string | number> = {};

    constructor(options: TextRequestOptions) {
        this.pattern = options.pattern ?? null;
        this.text = options.text;
        this.encoding = options.encoding ?? 'utf8';
        this.headers = options.headers ?? {};
    }

    toMessage(): TextMessage {
        return createTextMessage(this.text, this.encoding, this.headers);
    }
}

/**
 * TextResponse类
 */
export class TextResponse {
    readonly message: TextMessage;
    readonly status: number = 200;
    readonly statusText: string = 'OK';

    constructor(message: TextMessage, status?: number, statusText?: string) {
        this.message = message;
        this.status = status ?? 200;
        this.statusText = statusText ?? 'OK';
    }

    get body(): string {
        return this.message.payload;
    }

    get ok(): boolean {
        return this.status >= 200 && this.status < 300;
    }
}

/**
 * TextHandler - 文本请求处理器接口
 */
@Abstract()
export abstract class TextHandler {
    abstract handle(input: TextMessage | TextRequest, context: RequestContext): Observable<TextResponse>;
}

/**
 * DefaultTextHandler - 默认处理器实现
 */
@Injectable()
export class DefaultTextHandler implements TextHandler {
    handle(input: TextMessage | TextRequest, context: RequestContext): Observable<TextResponse> {
        const message = input instanceof TextRequest ? input.toMessage() : input;
        return of(new TextResponse(message));
    }
}

/**
 * TextClient - 文本客户端
 */
@Abstract()
export abstract class TextClient {
    protected abstract get injector(): Injector;
    protected abstract get handler(): TextHandler;

    /**
     * 发送文本
     */
    send(text: string): Observable<string>;
    send(pattern: Pattern, text: string): Observable<string>;
    send(request: TextRequest): Observable<TextResponse>;
    send(first: string | Pattern | TextRequest, second?: string): Observable<any> {
        let request: TextRequest;

        if (typeof first === 'string' && second === undefined) {
            request = new TextRequest({ text: first });
        } else if (typeof second === 'string') {
            request = new TextRequest({ pattern: first as Pattern, text: second });
        } else if (first instanceof TextRequest) {
            request = first;
        } else {
            return throwError(() => new Error('Invalid arguments'));
        }

        const context = createRequestContext(this.injector);
        return this.handler.handle(request.toMessage(), context)
            .pipe(map(res => res.body));
    }
}

/**
 * TextServer - 文本服务端
 */
@Abstract()
export abstract class TextServer {
    protected abstract get injector(): Injector;
    protected abstract get handler(): TextHandler;

    /**
     * 处理消息
     */
    handleMessage(input: TextMessage, context: RequestContext): Observable<TextResponse> {
        return this.handler.handle(input, context);
    }

    /**
     * 注册处理函数
     */
    abstract register(pattern: Pattern, handler: (msg: TextMessage, ctx: RequestContext) => Observable<string | TextMessage>): void;
}