export * from './handler';
export * from './interceptor';

import { Injectable, Injector, Abstract } from '@tsdi/ioc';
import { RequestContext, Pattern } from '@tsdi/common';
import { JsonMessage, createJsonMessage, MessageType } from '@tsdi/common';
import { Observable, of, map, catchError } from 'rxjs';
import { JsonHandler, JsonResponse } from './handler';

/**
 * JsonServer - JSON服务端
 * 处理结构化JSON数据的接收和响应
 */
@Abstract()
export abstract class JsonServer {
    protected abstract get injector(): Injector;
    protected abstract get handler(): JsonHandler;

    /**
     * 处理JSON消息
     */
    handleMessage<T>(input: JsonMessage<T>, context: RequestContext): Observable<JsonResponse> {
        return this.handler.handle(input, context)
            .pipe(
                catchError(err => {
                    const errorData = { error: err.message || 'Internal Server Error' };
                    const errorMsg = createJsonMessage(errorData);
                    return of(new JsonResponse(errorMsg, 500, 'Internal Server Error'));
                })
            );
    }

    /**
     * 注册处理路由
     */
    abstract register<T, R>(pattern: Pattern, handler: (message: JsonMessage<T>, context: RequestContext) => Observable<R | JsonMessage<R>>): void;
}

/**
 * DefaultJsonServer - 默认服务端实现
 */
@Injectable()
export class DefaultJsonServer extends JsonServer {
    private routes: Map<string, (message: JsonMessage<any>, context: RequestContext) => Observable<any>> = new Map();

    constructor(protected injector: Injector, protected handler: JsonHandler) {
        super();
    }

    register<T, R>(pattern: Pattern, handler: (message: JsonMessage<T>, context: RequestContext) => Observable<R | JsonMessage<R>>): void {
        const patternKey = typeof pattern === 'string' ? pattern : JSON.stringify(pattern);
        this.routes.set(patternKey, handler);
    }

    handleMessage<T>(input: JsonMessage<T>, context: RequestContext): Observable<JsonResponse> {
        // 检查是否有匹配的路由
        const pattern = input.headers?.['pattern'] as string;
        if (pattern && this.routes.has(pattern)) {
            const routeHandler = this.routes.get(pattern)!;
            return routeHandler(input, context)
                .pipe(
                    map(result => {
                        if (result && result.type === MessageType.JSON) {
                            return new JsonResponse(result as JsonMessage);
                        }
                        return new JsonResponse(createJsonMessage(result));
                    }),
                    catchError(err => {
                        const errorData = { error: err.message || 'Internal Server Error' };
                        const errorMsg = createJsonMessage(errorData);
                        return of(new JsonResponse(errorMsg, 500, 'Internal Server Error'));
                    })
                );
        }

        // 默认处理
        return super.handleMessage(input, context);
    }
}