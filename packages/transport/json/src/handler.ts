import { Injectable, Abstract } from '@tsdi/ioc';
import { RequestContext, Pattern } from '@tsdi/common';
import { JsonMessage, createJsonMessage } from '@tsdi/common';
import { Observable, of } from 'rxjs';

/**
 * JsonRequestOptions - JSON请求选项
 */
export interface JsonRequestOptions<T = any> {
    /**
     * 请求模式
     */
    pattern?: Pattern;

    /**
     * JSON数据
     */
    payload: T;

    /**
     * 请求头
     */
    headers?: Record<string, string | number>;

    /**
     * JSON解析reviver
     */
    reviver?: (key: string, value: any) => any;

    /**
     * JSON序列化replacer
     */
    replacer?: (key: string, value: any) => any;
}

/**
 * JsonRequest - JSON请求类
 */
export class JsonRequest<T = any> {
    readonly pattern: Pattern | null = null;
    readonly payload: T;
    readonly headers: Record<string, string | number> = {};
    readonly reviver?: (key: string, value: any) => any;
    readonly replacer?: (key: string, value: any) => any;

    constructor(options: JsonRequestOptions<T>) {
        this.pattern = options.pattern ?? null;
        this.payload = options.payload;
        this.headers = options.headers ?? {};
        this.reviver = options.reviver;
        this.replacer = options.replacer;
    }

    /**
     * 转换为JsonMessage
     */
    toMessage(): JsonMessage<T> {
        return createJsonMessage(this.payload as object, this.headers) as JsonMessage<T>;
    }

    /**
     * 获取body(payload别名)
     */
    get body(): T {
        return this.payload;
    }
}

/**
 * JsonResponse - JSON响应类
 */
export class JsonResponse<T = any> {
    readonly message: JsonMessage<T>;
    readonly status: number = 200;
    readonly statusText: string = 'OK';

    constructor(message: JsonMessage<T>, status?: number, statusText?: string) {
        this.message = message;
        this.status = status ?? 200;
        this.statusText = statusText ?? 'OK';
    }

    /**
     * 获取响应体
     */
    get body(): T {
        return this.message.payload;
    }

    /**
     * 是否成功
     */
    get ok(): boolean {
        return this.status >= 200 && this.status < 300;
    }
}

/**
 * JsonHandler - JSON请求处理器接口
 */
@Abstract()
export abstract class JsonHandler {
    abstract handle<T>(input: JsonMessage<T> | JsonRequest<T>, context: RequestContext): Observable<JsonResponse<any>>;
}

/**
 * DefaultJsonHandler - 默认处理器实现
 */
@Injectable()
export class DefaultJsonHandler implements JsonHandler {
    handle<T>(input: JsonMessage<T> | JsonRequest<T>, context: RequestContext): Observable<JsonResponse<any>> {
        const message = input instanceof JsonRequest ? input.toMessage() : input;
        return of(new JsonResponse(message as JsonMessage<any>));
    }
}