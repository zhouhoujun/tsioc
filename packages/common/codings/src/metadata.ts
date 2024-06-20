import { ActionTypes, DecorDefine, Execption, Token, Type, createDecorator, getToken, lang } from '@tsdi/ioc';
import { Filter, Interceptor, InvocationFactoryResolver, InvocationOptions } from '@tsdi/core';
import { CodingsContext } from './context';
import { CodingMappings } from './mappings';
import { CodingsOption } from './options';

/**
 * codings options.
 */
export interface CodingsMetadata extends InvocationOptions, CodingsOption { }


export interface EncodingsMetadata extends CodingsMetadata {
    /**
     * codings targe.
     */
    encodings: string | Type;
}


/**
 * EncodeHandler
 */
export interface EncodeHandler {

    /**
     * encode handle. use to handle encoding of target, in class with decorator {@link EncodeHandler}.
     *
     * @param {string|Type} encodings encode target.
     * @param {CodingsMetadata} option encode handle invoke option.
     */
    (encodings: string | Type, option?: CodingsMetadata): MethodDecorator;
}

const encodingTokens = new Map<string | Type, Token<Interceptor<any, any, CodingsContext>[]>>();
export function getEncodeInterceptorsToken(encodings: string | Type): Token<Interceptor<any, any, CodingsContext>[]> {
    let token = encodingTokens.get(encodings);
    if (!token) {
        token = getToken<Interceptor<any, any, CodingsContext>[]>(encodings, '_ENCODINGS_INTERCEPTORS');
        encodingTokens.set(encodings, token);
    }
    return token;
}

const encodingFilterTokens = new Map<string | Type, Token<Filter<any, any, CodingsContext>[]>>();
export function getEncodeFilterToken(encodings: string | Type): Token<Filter<any, any, CodingsContext>[]> {
    let token = encodingFilterTokens.get(encodings);
    if (!token) {
        token = getToken<Filter<any, any, CodingsContext>[]>(encodings, '_ENCODINGS_FILTERS');
        encodingFilterTokens.set(encodings, token);
    }
    return token;
}

/**
 * EncodeHandler decorator. use to define method as Encodings handler.
 * @Encoding
 * 
 * @exports {@link EncodeHandler}
 */
export const EncodeHandler: EncodeHandler = createDecorator<EncodingsMetadata>('EncodeHandler', {
    actionType: [ActionTypes.annoation, ActionTypes.runnable],
    props: (encodings: string | Type, option?: InvocationOptions) => {
        const opts = { encodings, ...option };
        if (!opts.interceptorsToken) {
            opts.interceptorsToken = getEncodeInterceptorsToken(encodings);
        }
        if (!opts.filtersToken) {
            opts.filtersToken = getEncodeFilterToken(encodings);
        }
        return opts;
    },
    design: {
        method: (ctx, next) => {

            const defines = ctx.class.methodDefs.get(ctx.currDecor.toString()) as DecorDefine<EncodingsMetadata>[];
            if (!defines || !defines.length) return next();

            const injector = ctx.injector;

            const factory = injector.get(InvocationFactoryResolver).resolve(ctx.class, injector);

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


export interface DecodeHandler {

    /**
     * decode handle. use to handle decoding of target, in class with decorator {@link DecodeHandler}.
     *
     * @param {string|Type} decodings encode target.
     * @param {CodingsMetadata} option encode handle invoke option.
     */
    (decodings: string | Type, option?: CodingsMetadata): MethodDecorator;
}

const decodingTokens = new Map<string | Type, Token<Interceptor<any, any, CodingsContext>[]>>();
export function getDecodeInterceptorsToken(encodings: string | Type): Token<Interceptor<any, any, CodingsContext>[]> {
    let token = decodingTokens.get(encodings);
    if (!token) {
        token = getToken<Interceptor<any, any, CodingsContext>[]>(encodings, '_DECODINGS_INTERCEPTORS');
        decodingTokens.set(encodings, token);
    }
    return token;
}

const decodingFilterTokens = new Map<string | Type, Token<Filter<any, any, CodingsContext>[]>>();
export function getDecodeFilterToken(encodings: string | Type): Token<Filter<any, any, CodingsContext>[]> {
    let token = decodingFilterTokens.get(encodings);
    if (!token) {
        token = getToken<Filter<any, any, CodingsContext>[]>(encodings, '_DECODINGS_FILTERS');
        decodingFilterTokens.set(encodings, token);
    }
    return token;
}


/**
 * DecodeHandler decorator. use to define method as Decodings handler.
 * @Decoding
 * 
 * @exports {@link DecodeHandler}
 */
export const DecodeHandler: DecodeHandler = createDecorator<DecodingMetadata>('DecodeHandler', {
    actionType: [ActionTypes.annoation, ActionTypes.runnable],
    props: (encodings: string | Type, option?: InvocationOptions) => {
        const opts = { decodings: encodings, ...option } as DecodingMetadata;
        if (!opts.interceptorsToken) {
            opts.interceptorsToken = getDecodeInterceptorsToken(encodings);
        }
        if (!opts.filtersToken) {
            opts.filtersToken = getDecodeFilterToken(encodings);
        }
        return opts;
    },
    design: {
        method: (ctx, next) => {

            const defines = ctx.class.methodDefs.get(ctx.currDecor.toString()) as DecorDefine<DecodingMetadata>[];
            if (!defines || !defines.length) return next();

            const injector = ctx.injector;

            const factory = injector.get(InvocationFactoryResolver).resolve(ctx.class, injector);

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

