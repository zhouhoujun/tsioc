import { Injectable } from '@tsdi/ioc';
import { RequestContext, StreamAdapter } from '@tsdi/common';
import { MessageType, JsonMessage, createJsonMessage } from '@tsdi/common';
import { Observable, from, map, mergeMap } from 'rxjs';

/**
 * JsonInterceptor - JSON请求拦截器
 * 处理JSON数据的序列化和反序列化
 */
@Injectable()
export class JsonInterceptor {

    /**
     * 拦截处理
     */
    intercept(input: string | Buffer | object, next: (msg: JsonMessage) => Observable<JsonMessage>, context: RequestContext): Observable<JsonMessage> {
        return from(this.processInput(input, context))
            .pipe(
                mergeMap(msg => next(msg)),
                map(res => this.processOutput(res, context))
            );
    }

    /**
     * 处理输入数据
     */
    protected async processInput(input: string | Buffer | object, context: RequestContext): Promise<JsonMessage> {
        const streamAdapter = context.get(StreamAdapter);

        if (typeof input === 'object' && input !== null && !Buffer.isBuffer(input)) {
            if ((input as any).type === MessageType.JSON) {
                return input as JsonMessage;
            }
            return createJsonMessage(input);
        }

        if (typeof input === 'string') {
            try {
                const data = JSON.parse(input);
                return createJsonMessage(data);
            } catch {
                throw new Error('Invalid JSON string');
            }
        }

        if (Buffer.isBuffer(input)) {
            try {
                const data = JSON.parse(input.toString('utf8'));
                return createJsonMessage(data);
            } catch {
                throw new Error('Invalid JSON buffer');
            }
        }

        if (streamAdapter.isReadable(input)) {
            const text = await streamAdapter.rawbody(input, { encoding: 'utf8' });
            try {
                const data = JSON.parse(text);
                return createJsonMessage(data);
            } catch {
                throw new Error('Invalid JSON stream');
            }
        }

        throw new Error('Invalid input type for JsonInterceptor');
    }

    /**
     * 处理输出数据
     */
    protected processOutput(res: any, context: RequestContext): JsonMessage {
        if (res && res.type === MessageType.JSON) {
            return res as JsonMessage;
        }

        return createJsonMessage(res);
    }
}