import { Injectable, Inject, PropParamDecorator, createParamDecorator } from '@tsdi/ioc';
import { Translator } from './translator';
import { I18N_LOCALE } from './tokens';

/**
 * Inject current locale.
 *
 * 注入当前语言环境的属性装饰器。
 */
export function Locale(): PropParamDecorator {
    return createParamDecorator('Locale', {
        props: () => ({ locale: I18N_LOCALE })
    })();
}

/**
 * Translate decorator for method.
 *
 * 翻译装饰器，自动翻译方法返回值。
 */
export function Translate(key?: string): MethodDecorator {
    return (target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>) => {
        const originalMethod = descriptor.value;

        descriptor.value = function(...args: any[]) {
            const translator: Translator = (this as any).__translator__;
            const result = originalMethod.apply(this, args);

            if (translator && typeof result === 'string') {
                if (key) {
                    return translator.translate(key, { value: result });
                }
                return translator.translate(result);
            }

            return result;
        };

        return descriptor;
    };
}

/**
 * Localize parameter decorator.
 *
 * 本地化参数装饰器，自动翻译参数值。
 */
export function Localize(key?: string): ParameterDecorator {
    return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
        // Store metadata for localization
        const existingMarkers: Record<number, string | undefined> = (target as any).__localizeMarkers__ || {};
        existingMarkers[parameterIndex] = key;
        (target as any).__localizeMarkers__ = existingMarkers;
    };
}