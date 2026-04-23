import { Injectable } from '@tsdi/ioc';
import { Pipe, PipeTransform } from '@tsdi/core';
import { Translator } from '../translator';

/**
 * Translate pipe.
 *
 * 翻译管道，用于模板中翻译文本。
 *
 * 使用示例：
 * ```
 * {{ 'hello' | translate }}
 * {{ 'hello' | translate:{name: 'World'} }}
 * {{ 'hello' | translate:'zh-CN' }}
 * ```
 */
@Pipe('translate')
@Injectable()
export class TranslatePipe implements PipeTransform<string> {

    constructor(private translator: Translator) {}

    transform(value: string, ...args: any[]): string {
        if (!value) return '';

        // Parse arguments
        let params: Record<string, any> | undefined;
        let locale: string | undefined;

        if (args.length > 0) {
            if (typeof args[0] === 'object') {
                params = args[0];
            } else if (typeof args[0] === 'string') {
                locale = args[0];
            }
        }

        if (args.length > 1 && typeof args[1] === 'object') {
            params = args[1];
        }

        // Translate
        if (locale) {
            return this.translator.translate(value, locale, params || {});
        }

        return this.translator.translate(value, params || {});
    }
}