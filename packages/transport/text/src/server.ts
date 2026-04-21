export * from './handler';
export * from './interceptor';

import { Injectable, Injector, Abstract } from '@tsdi/ioc';
import { RequestContext, createRequestContext, Pattern } from '@tsdi/common';
import { TextMessage, createTextMessage } from '@tsdi/common';
import { Observable, of, map, catchError } from 'rxjs';
import { TextHandler, TextResponse, DefaultTextHandler } from './handler';

/**
 * TextServer - 简单文本服务端
 */
@Abstract()
export abstract class TextServer {
    protected abstract get injector(): Injector;
    protected abstract get handler(): TextHandler;

    /**
     * 处理文本消息
     */
    handleMessage(input: TextMessage, context: RequestContext): Observable<TextResponse> {
        return this.handler.handle(input, context)
            .pipe(
                catchError(err => {
                    const errorText = err.message || 'Internal Server Error';
                    const errorMsg = createTextMessage(errorText);
                    return of(new TextResponse(errorMsg, 500, 'Internal Server Error'));
                })
            );
    }

    /**
     * 注册处理路由
     */
    abstract register(pattern: Pattern, handler: (message: TextMessage, context: RequestContext) => Observable<string | TextMessage>): void;
}

/**
 * DefaultTextServer - 默认服务端实现
 */
@Injectable()
export class DefaultTextServer extends TextServer {
    private routes: Map<string, (message: TextMessage, context: RequestContext) => Observable<string | TextMessage>> = new Map();

    constructor(protected injector: Injector, protected handler: TextHandler) {
        super();
    }

    register(pattern: Pattern, handler: (message: TextMessage, context: RequestContext) => Observable<string | TextMessage>): void {
        const patternKey = typeof pattern === 'string' ? pattern : JSON.stringify(pattern);
        this.routes.set(patternKey, handler);
    }

    handleMessage(input: TextMessage, context: RequestContext): Observable<TextResponse> {
        // 检查是否有匹配的路由
        const pattern = input.headers?.['pattern'] as string;
        if (pattern && this.routes.has(pattern)) {
            const routeHandler = this.routes.get(pattern)!;
            return routeHandler(input, context)
                .pipe(
                    map(result => {
                        if (typeof result === 'string') {
                            return new TextResponse(createTextMessage(result));
                        }
                        return new TextResponse(result);
                    }),
                    catchError(err => {
                        const errorText = err.message || 'Internal Server Error';
                        const errorMsg = createTextMessage(errorText);
                        return of(new TextResponse(errorMsg, 500, 'Internal Server Error'));
                    })
                );
        }

        // 默认处理
        return super.handleMessage(input, context);
    }
}