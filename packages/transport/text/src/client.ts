export * from './handler';
export * from './interceptor';

import { Injectable, Injector, Abstract } from '@tsdi/ioc';
import { RequestContext, createRequestContext, Pattern } from '@tsdi/common';
import { TextMessage } from '@tsdi/common';
import { Observable, defer, mergeMap, map, catchError, throwError } from 'rxjs';
import { TextHandler, TextRequest, TextResponse, DefaultTextHandler } from './handler';

/**
 * TextClient - 简单文本客户端
 */
@Abstract()
export abstract class TextClient {
    protected abstract get injector(): Injector;
    protected abstract get handler(): TextHandler;

    /**
     * 发送文本消息
     * @param text 文本内容
     * @returns Observable<string>
     */
    send(text: string): Observable<string>;

    /**
     * 发送文本消息到指定模式
     * @param pattern 请求模式
     * @param text 文本内容
     * @returns Observable<string>
     */
    send(pattern: Pattern, text: string): Observable<string>;

    /**
     * 发送TextRequest
     * @param request TextRequest对象
     * @returns Observable<TextResponse>
     */
    send(request: TextRequest): Observable<TextResponse>;

    send(first: string | Pattern | TextRequest, second?: string): Observable<any> {
        let message: TextMessage;

        if (typeof first === 'string' && second === undefined) {
            message = new TextRequest({ text: first }).toMessage();
        } else if (typeof second === 'string') {
            message = new TextRequest({ pattern: first as Pattern, text: second }).toMessage();
        } else if (first instanceof TextRequest) {
            message = first.toMessage();
        } else {
            return throwError(() => new Error('Invalid arguments for TextClient.send'));
        }

        const context = createRequestContext(this.injector);

        return this.handler.handle(message, context)
            .pipe(
                map(response => response.body),
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

/**
 * DefaultTextClient - 默认客户端实现
 */
@Injectable()
export class DefaultTextClient extends TextClient {
    constructor(protected injector: Injector, protected handler: TextHandler) {
        super();
    }
}