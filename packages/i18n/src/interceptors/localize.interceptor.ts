import { Handler, Interceptor, nextTick, RunContext } from '@tsdi/ioc';
import { Injectable } from '@tsdi/ioc';
import { Translator } from '../translator';

/**
 * Localize interceptor.
 *
 * 本地化拦截器，自动处理响应消息的翻译。
 */
@Injectable()
export class LocalizeInterceptor<TInput, TOutput> implements Interceptor<TInput, TOutput, RunContext> {
    constructor(private translator: Translator) { }

    intercept(input: TInput, next: Handler<TInput, TOutput, RunContext>, context: RunContext): TOutput {
        return nextTick(() => next.handle(input, context), (result: TOutput) => {

            // Auto-translate if result contains translation key pattern
            if (typeof result === 'string' && result.startsWith('i18n:')) {
                const key = result.substring(5);
                return this.translator.translate(key);
            }

            // Translate object keys that have i18n: prefix
            if (result && typeof result === 'object') {
                return this.translateObject(result);
            }

            return result;
        });
    }

    private translateObject(obj: any): any {
        if (Array.isArray(obj)) {
            return obj.map(item => this.translateObject(item));
        }

        const result: Record<string, any> = {};
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string' && value.startsWith('i18n:')) {
                result[key] = this.translator.translate(value.substring(5));
            } else if (typeof value === 'object') {
                result[key] = this.translateObject(value);
            } else {
                result[key] = value;
            }
        }
        return result;
    }
}