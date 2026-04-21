export * from './handler';
export * from './interceptor';

import { Injectable, Injector, Abstract } from '@tsdi/ioc';
import { createRequestContext, Pattern } from '@tsdi/common';
import { JsonMessage, createJsonMessage } from '@tsdi/common';
import { Observable, map, catchError, throwError } from 'rxjs';
import { JsonHandler, JsonRequest, JsonResponse } from './handler';

/**
 * JsonClient - JSON客户端
 * 用于结构化JSON数据的发送和接收
 */
@Abstract()
export abstract class JsonClient {
    protected abstract get injector(): Injector;
    protected abstract get handler(): JsonHandler;

    /**
     * 发送JSON数据
     * @param payload JSON数据
     * @returns Observable<T>
     */
    send<T>(payload: T): Observable<T>;

    /**
     * 发送JSON数据到指定模式
     * @param pattern 请求模式
     * @param payload JSON数据
     * @returns Observable<R>
     */
    send<T, R>(pattern: Pattern, payload: T): Observable<R>;

    /**
     * 发送JsonRequest
     * @param request JsonRequest对象
     * @returns Observable<JsonResponse>
     */
    send<T>(request: JsonRequest<T>): Observable<JsonResponse<T>>;

    send<T, R>(first: T | Pattern | JsonRequest<T>, second?: T): Observable<any> {
        let message: JsonMessage<any>;

        if (second === undefined && !(first instanceof JsonRequest)) {
            // send<T>(payload: T)
            message = createJsonMessage(first as object);
        } else if (second !== undefined) {
            // send<T, R>(pattern: Pattern, payload: T)
            message = createJsonMessage(second as object);
        } else if (first instanceof JsonRequest) {
            // send<T>(request: JsonRequest<T>)
            message = first.toMessage();
        } else {
            return throwError(() => new Error('Invalid arguments for JsonClient.send'));
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
 * DefaultJsonClient - 默认客户端实现
 */
@Injectable()
export class DefaultJsonClient extends JsonClient {
    constructor(protected injector: Injector, protected handler: JsonHandler) {
        super();
    }
}