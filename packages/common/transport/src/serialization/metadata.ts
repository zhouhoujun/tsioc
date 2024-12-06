import { ActionTypes, DecorDefine, Execption, Token, Type, createDecorator, getToken, lang } from '@tsdi/ioc';
import { Filter, Interceptor, InvocationFactoryResolver, InvocationOptions } from '@tsdi/core';
import { SerializeMappings, DeserializeMappings } from './mappings';
import { SerializeContext } from './Serializer';
import { DeserializeContext } from './Deserializer';

export interface SerializationOptions extends InvocationOptions {
    /**
     * the protocol serialization 
     */
    protocol?: string;
}

export interface SerializeMetadata extends SerializationOptions {
    /**
     * Serialize targe.
     */
    target: string | Type;
}


/**
 * SerializeHandler
 */
export interface SerializeHandler {

    /**
     * Serialize handle. use to handle encoding of target, in class with decorator {@link SerializeHandler}.
     *
     * @param {string|Type} encodings Serialize target.
     * @param {SerializationOptions} option Serialize handle invoke option.
     */
    (target: string | Type, option?: SerializationOptions): MethodDecorator;
}

export function getSerializeInterceptorsToken<TInput, TOutput, TContext extends SerializeContext>(encodings: string | Type<TOutput>): Token<Interceptor<TInput, TOutput, TContext>[]> {
    return getToken<Interceptor[]>(encodings, '_ENCODINGS_INTERCEPTORS');
}

export function getSerializeFilterToken<TInput, TOutput, TContext extends SerializeContext>(encodings: string | Type<TOutput>): Token<Filter<TInput, TOutput, TContext>[]> {
    return getToken<Filter[]>(encodings, '_ENCODINGS_FILTERS');
}

/**
 * SerializeHandler decorator. use to define method as Encodings handler.
 * @Encoding
 * 
 * @exports {@link SerializeHandler}
 */
export const SerializeHandler: SerializeHandler = createDecorator<SerializeMetadata>('SerializeHandler', {
    actionType: [ActionTypes.annoation, ActionTypes.runnable],
    props: (target: string | Type, option?: SerializationOptions) => {
        const opts = { target, ...option };
        if (!opts.interceptorsToken) {
            opts.interceptorsToken = getSerializeInterceptorsToken(target);
        }
        if (!opts.filtersToken) {
            opts.filtersToken = getSerializeFilterToken(target);
        }
        return opts;
    },
    design: {
        method: (ctx, next) => {

            const defines = ctx.class.methodDefs.get(ctx.currDecor.toString()) as DecorDefine<SerializeMetadata>[];
            if (!defines || !defines.length) return next();

            const injector = ctx.injector;

            const factory = injector.get(InvocationFactoryResolver).resolve(ctx.class);

            const mapings = injector.get(SerializeMappings);
            if (!mapings) throw new Execption(lang.getClassName(SerializeMappings) + 'has not registered!');

            defines.forEach(def => {
                const { target, protocol, order, ...options } = def.metadata;

                const mappings = mapings.getMappings(protocol);

                const handler = factory.create(def.propertyKey, options);

                mappings.addHandler(target, handler, order);

                factory.onDestroy(() => mappings.removeHandler(target, handler))

            });

            return next();
        }
    }
});



export interface DeserializeMetadata extends SerializationOptions {
    /**
     * Deserialize target.
     */
    target: string | Type;
}


export interface DeserializeHandler {

    /**
     * Deserialize handle. use to handle decoding of target, in class with decorator {@link DeserializeHandler}.
     *
     * @param {string|Type} target Deserialize target.
     * @param {SerializationOptions} option Deserialize handle invoke option.
     */
    (target: string | Type, option?: SerializationOptions): MethodDecorator;
}

export function getDeserializeInterceptorsToken<TInput, TOutput, TContext extends DeserializeContext>(encodings: string | Type<TInput>): Token<Interceptor<TInput, TOutput, TContext>[]> {
    return getToken<Interceptor[]>(encodings, '_DECODINGS_INTERCEPTORS');
}

export function getDeserializeFilterToken<TInput, TOutput, TContext extends DeserializeContext>(encodings: string | Type<TInput>): Token<Filter<TInput, TOutput, TContext>[]> {
    return getToken<Filter[]>(encodings, '_DECODINGS_FILTERS');
}


/**
 * DeserializeHandler decorator. use to define method as Decodings handler.
 * @Decoding
 * 
 * @exports {@link DeserializeHandler}
 */
export const DeserializeHandler: DeserializeHandler = createDecorator<DeserializeMetadata>('DeserializeHandler', {
    actionType: [ActionTypes.annoation, ActionTypes.runnable],
    props: (target: string | Type, option?: InvocationOptions) => {
        const opts = { target, ...option } as DeserializeMetadata;
        if (!opts.interceptorsToken) {
            opts.interceptorsToken = getDeserializeInterceptorsToken(target);
        }
        if (!opts.filtersToken) {
            opts.filtersToken = getDeserializeFilterToken(target);
        }
        return opts;
    },
    design: {
        method: (ctx, next) => {

            const defines = ctx.class.methodDefs.get(ctx.currDecor.toString()) as DecorDefine<DeserializeMetadata>[];
            if (!defines || !defines.length) return next();

            const injector = ctx.injector;

            const factory = injector.get(InvocationFactoryResolver).resolve(ctx.class);

            const map = injector.get(DeserializeMappings);
            if (!map) throw new Execption(lang.getClassName(DeserializeMappings) + 'has not registered!');

            defines.forEach(def => {
                const { protocol, target, order, ...options } = def.metadata;

                const mappings = map.getMappings(protocol);

                const handler = factory.create(def.propertyKey, options);

                mappings?.addHandler(target, handler, order);

                factory.onDestroy(() => mappings.removeHandler(target, handler))

            });

            return next();
        }
    }
});

