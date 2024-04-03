import { InvocationFactoryResolver, InvocationOptions } from '@tsdi/core';
import { ActionTypes, DecorDefine, Execption, Type, createDecorator, lang } from '@tsdi/ioc';
import { CodingMappings } from './mappings';


export interface CodingsOptions extends InvocationOptions {
    /**
     * codings type.
     */
    codingsType?: 'client' | 'server';
}


export interface EncodingMetadata extends CodingsOptions {
    /**
     * codings targe.
     */
    encodings: string | Type;
}


export interface Encoding {

    /**
     * encode handle. use to handle encoding of target, in class with decorator {@link Encoding}.
     *
     * @param {string|Type} encodings encode target.
     * @param {CodingsOptions} option encode handle invoke option.
     */
    (encodings: string | Type, option?: CodingsOptions): MethodDecorator;
}

/**
 * Encoding decorator. use to define method as Encodings handler.
 * @Encoding
 * 
 * @exports {@link Encoding}
 */
export const Encoding: Encoding = createDecorator<EncodingMetadata>('Encoding', {
    actionType: [ActionTypes.annoation, ActionTypes.runnable],
    props: (encodings: string | Type, option?: InvocationOptions) => ({ encodings, ...option }) as EncodingMetadata,
    def: {
        class: (ctx, next) => {
            ctx.class.setAnnotation(ctx.define.metadata);
            return next();
        }
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
                const { encodings, order, codingsType, ...options } = def.metadata;

                const mappings = codes.getEncodings(codingsType);

                const handler = factory.create(def.propertyKey, { ...options });

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


export interface Decoding {

    /**
     * encode handle. use to handle encoding of target, in class with decorator {@link Encoding}.
     *
     * @param {string|Type} encodings encode target.
     * @param {CodingsOptions} option encode handle invoke option.
     */
    (encodings: string | Type, option?: CodingsOptions): MethodDecorator;
}

/**
 * Decoding decorator. use to define method as Decodings handler.
 * @Decoding
 * 
 * @exports {@link Decoding}
 */
export const Decoding: Decoding = createDecorator<DecodingMetadata>('Decoding', {
    actionType: [ActionTypes.annoation, ActionTypes.runnable],
    props: (encodings: string | Type, option?: InvocationOptions) => ({ encodings, ...option }) as DecodingMetadata,
    def: {
        class: (ctx, next) => {
            ctx.class.setAnnotation(ctx.define.metadata);
            return next();
        }
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
                const { encodings, order, codingsType, ...options } = def.metadata;

                const mappings = codes.getDecodings(codingsType);

                const handler = factory.create(def.propertyKey, { ...options });

                mappings.addHandler(encodings, handler, order);
                factory.onDestroy(() => mappings.removeHandler(encodings, handler))

            });

            return next();
        }
    }
});

