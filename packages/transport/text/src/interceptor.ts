import { Injectable } from '@tsdi/ioc';
import { RequestContext, StreamAdapter } from '@tsdi/common';
import { MessageType, TextMessage, createTextMessage } from '@tsdi/common';
import { Observable, from, map, mergeMap } from 'rxjs';

/**
 * TextInterceptor - Text请求拦截器
 * 处理文本数据的序列化和反序列化
 */
@Injectable()
export class TextInterceptor {

    /**
     * 拦截处理
     * @param input 输入数据(string或Buffer)
     * @param next 下一个处理器
     * @param context 请求上下文
     * @returns Observable<TextMessage>
     */
    intercept(input: string | Buffer, next: (msg: TextMessage) => Observable<TextMessage>, context: RequestContext): Observable<TextMessage> {
        return from(this.processInput(input, context))
            .pipe(
                mergeMap(msg => next(msg)),
                map(res => this.processOutput(res, context))
            );
    }

    /**
     * 处理输入数据
     */
    protected async processInput(input: string | Buffer, context: RequestContext): Promise<TextMessage> {
        const streamAdapter = context.get(StreamAdapter);

        if (typeof input === 'string') {
            return createTextMessage(input, 'utf8');
        }

        if (Buffer.isBuffer(input)) {
            return createTextMessage(input.toString('utf8'), 'utf8');
        }

        if (streamAdapter.isReadable(input)) {
            const text = await streamAdapter.rawbody(input, { encoding: 'utf8' });
            return createTextMessage(text, 'utf8');
        }

        throw new Error('Invalid input type for TextInterceptor');
    }

    /**
     * 处理输出数据
     */
    protected processOutput(res: any, context: RequestContext): TextMessage {
        if (res && res.type === MessageType.TEXT) {
            return res as TextMessage;
        }

        const text = typeof res === 'string' ? res : JSON.stringify(res);
        return createTextMessage(text, 'utf8');
    }
}