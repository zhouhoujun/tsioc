import { ActionTypes, DecorDefine, Execption, Token, Type, createDecorator, getToken, lang } from '@tsdi/ioc';
import { Interceptor, InvocationFactoryResolver, InvocationOptions } from '@tsdi/core';
import { CodingsOpts } from './options';
import { CodingsContext } from './context';
import { CodingMappings } from './mappings';


export interface CodingsOptions extends InvocationOptions, CodingsOpts {
}


export interface EncodingMetadata extends CodingsOptions {
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
     * @param {CodingsOptions} option encode handle invoke option.
     */
    (encodings: string | Type, option?: CodingsOptions): MethodDecorator;
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

/**
 * Encoding decorator. use to define method as Encodings handler.
 * @Encoding
 * 
 * @exports {@link EncodeHandler}
 */
export const EncodeHandler: EncodeHandler = createDecorator<EncodingMetadata>('Encoding', {
    actionType: [ActionTypes.annoation, ActionTypes.runnable],
    props: (encodings: string | Type, option?: InvocationOptions) => {
        const opts = { encodings, ...option };
        if (!opts.interceptorsToken) {
            opts.interceptorsToken = getEncodeInterceptorsToken(encodings);
        }
        return opts;
    },
    design: {
        method: (ctx, next) => {

            const defines = ctx.class.methodDefs.get(ctx.currDecor.toString()) as DecorDefine<EncodingMetadata>[];
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



export interface DecodingMetadata extends CodingsOptions {
    /**
     * codings targe.
     */
    encodings: string | Type;
}


export interface DecodeHandler {

    /**
     * encode handle. use to handle encoding of target, in class with decorator {@link EncodeHandler}.
     *
     * @param {string|Type} encodings encode target.
     * @param {CodingsOptions} option encode handle invoke option.
     */
    (encodings: string | Type, option?: CodingsOptions): MethodDecorator;
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


/**
 * Decoding decorator. use to define method as Decodings handler.
 * @Decoding
 * 
 * @exports {@link DecodeHandler}
 */
export const DecodeHandler: DecodeHandler = createDecorator<DecodingMetadata>('Decoding', {
    actionType: [ActionTypes.annoation, ActionTypes.runnable],
    props: (encodings: string | Type, option?: InvocationOptions) => {
        const opts = { encodings, ...option } as DecodingMetadata;
        if (!opts.interceptorsToken) {
            opts.interceptorsToken = getDecodeInterceptorsToken(encodings);
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
                const { encodings, order, ...options } = def.metadata;

                const mappings = codes.getDecodings(options);

                const handler = factory.create(def.propertyKey, options);

                mappings.addHandler(encodings, handler, order);
                factory.onDestroy(() => mappings.removeHandler(encodings, handler))

            });

            return next();
        }
    }
});

