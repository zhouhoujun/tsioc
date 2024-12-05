import { ActionTypes, DecorDefine, Execption, Token, Type, createDecorator, getToken, lang } from '@tsdi/ioc';
import { Filter, Interceptor, InvocationFactoryResolver, InvocationOptions } from '@tsdi/core';
import { CodingsContext } from './context';
import { CodingMappings } from './mappings';
import { CodingsOptions } from './options';

/**
 * codings options.
 */
export interface CodingsMetadata extends InvocationOptions, CodingsOptions { }


export interface EncodingsMetadata extends CodingsMetadata {
    /**
     * codings targe.
     */
    encodings: string | Type;
}


/**
 * SerializeHandler
 */
export interface SerializeHandler {

    /**
     * Serialize handle. use to handle encoding of target, in class with decorator {@link SerializeHandler}.
     *
     * @param {string|Type} encodings Serialize target.
     * @param {CodingsMetadata} option Serialize handle invoke option.
     */
    (encodings: string | Type, option?: CodingsMetadata): MethodDecorator;
}

export function getSerializeInterceptorsToken<TInput, TOutput, TContext extends CodingsContext>(encodings: string | Type<TOutput>): Token<Interceptor<TInput, TOutput, TContext>[]> {
    return getToken<Interceptor[]>(encodings, '_ENCODINGS_INTERCEPTORS');
}

export function getSerializeFilterToken<TInput, TOutput, TContext extends CodingsContext>(encodings: string | Type<TOutput>): Token<Filter<TInput, TOutput, TContext>[]> {
    return getToken<Filter[]>(encodings, '_ENCODINGS_FILTERS');
}

/**
 * SerializeHandler decorator. use to define method as Encodings handler.
 * @Encoding
 * 
 * @exports {@link SerializeHandler}
 */
export const SerializeHandler: SerializeHandler = createDecorator<EncodingsMetadata>('SerializeHandler', {
    actionType: [ActionTypes.annoation, ActionTypes.runnable],
    props: (encodings: string | Type, option?: InvocationOptions) => {
        const opts = { encodings, ...option };
        if (!opts.interceptorsToken) {
            opts.interceptorsToken = getSerializeInterceptorsToken(encodings);
        }
        if (!opts.filtersToken) {
            opts.filtersToken = getSerializeFilterToken(encodings);
        }
        return opts;
    },
    design: {
        method: (ctx, next) => {

            const defines = ctx.class.methodDefs.get(ctx.currDecor.toString()) as DecorDefine<EncodingsMetadata>[];
            if (!defines || !defines.length) return next();

            const injector = ctx.injector;

            const factory = injector.get(InvocationFactoryResolver).resolve(ctx.class);

            const codes = injector.get(CodingMappings);
            if (!codes) throw new Execption(lang.getClassName(CodingMappings) + 'has not registered!');

            defines.forEach(def => {
                const { encodings, order, ...options } = def.metadata;

                const mappings = codes.getEncodings(options);

                const handler = factory.create(def.propertyKey, options);

                mappings.addHandler(encodings, handler, order);

                factory.onDestroy(() => mappings.removeHandler(encodings, handler))

            });

            return next();
        }
    }
});



export interface DecodingMetadata extends CodingsMetadata {
    /**
     * decodings target.
     */
    decodings: string | Type;
}


export interface DeserializeHandler {

    /**
     * Deserialize handle. use to handle decoding of target, in class with decorator {@link DeserializeHandler}.
     *
     * @param {string|Type} decodings Serialize target.
     * @param {CodingsMetadata} option Serialize handle invoke option.
     */
    (decodings: string | Type, option?: CodingsMetadata): MethodDecorator;
}

export function getDeserializeInterceptorsToken<TInput, TOutput, TContext extends CodingsContext>(encodings: string | Type<TInput>): Token<Interceptor<TInput, TOutput, TContext>[]> {
    return getToken<Interceptor[]>(encodings, '_DECODINGS_INTERCEPTORS');
}

export function getDeserializeFilterToken<TInput, TOutput, TContext extends CodingsContext>(encodings: string | Type<TInput>): Token<Filter<TInput, TOutput, TContext>[]> {
    return getToken<Filter[]>(encodings, '_DECODINGS_FILTERS');
}


/**
 * DeserializeHandler decorator. use to define method as Decodings handler.
 * @Decoding
 * 
 * @exports {@link DeserializeHandler}
 */
export const DeserializeHandler: DeserializeHandler = createDecorator<DecodingMetadata>('DeserializeHandler', {
    actionType: [ActionTypes.annoation, ActionTypes.runnable],
    props: (encodings: string | Type, option?: InvocationOptions) => {
        const opts = { decodings: encodings, ...option } as DecodingMetadata;
        if (!opts.interceptorsToken) {
            opts.interceptorsToken = getDeserializeInterceptorsToken(encodings);
        }
        if (!opts.filtersToken) {
            opts.filtersToken = getDeserializeFilterToken(encodings);
        }
        return opts;
    },
    design: {
        method: (ctx, next) => {

            const defines = ctx.class.methodDefs.get(ctx.currDecor.toString()) as DecorDefine<DecodingMetadata>[];
            if (!defines || !defines.length) return next();

            const injector = ctx.injector;

            const factory = injector.get(InvocationFactoryResolver).resolve(ctx.class);

            const codes = injector.get(CodingMappings);
            if (!codes) throw new Execption(lang.getClassName(CodingMappings) + 'has not registered!');

            defines.forEach(def => {
                const { decodings, order, ...options } = def.metadata;

                const mappings = codes.getDecodings(options);

                const handler = factory.create(def.propertyKey, options);

                mappings.addHandler(decodings, handler, order);

                factory.onDestroy(() => mappings.removeHandler(decodings, handler))

            });

            return next();
        }
    }
});

