import { Type, TypeMetadata, createClassDecorator, isString, ITypeDecorator, isBoolean, ProviderMetadata, isUndefined } from '@tsdi/ioc';
import { IPipeTransform } from '../bindings/IPipeTransform';

/**
 * pipe decorator.
 */
export type PipeDecorator = <TFunction extends Type<IPipeTransform>>(target: TFunction) => TFunction | void;

/**
 * pipe metadata.
 *
 * @export
 * @interface IPipeMetadata
 * @extends {TypeMetadata}
 */
export interface IPipeMetadata extends TypeMetadata, ProviderMetadata {
    /**
     * name of pipe.
     */
    name: string;
    /**
     * If Pipe is pure (its output depends only on its input.)
     */
    pure?: boolean;
}


/**
 * Pipe decorator.
 *
 * @export
 * @interface IInjectableDecorator
 * @extends {ITypeDecorator<IPipeMetadata>}
 */
export interface IPipeDecorator extends ITypeDecorator<IPipeMetadata> {
    /**
     * Pipe decorator, define the class as pipe.
     *
     * @Pipe
     *
     * @param {IPipeMetadata} [metadata] metadata map.
     */
    (metadata?: IPipeMetadata): PipeDecorator;

    /**
     * Pipe decorator, define the class as pipe.
     *
     * @Pipe
     * @param {string} name  pipe name.
     * @param {boolean} pure If Pipe is pure (its output depends only on its input.) defaut true.
     */
    (name: string, pure?: boolean): PipeDecorator;
}

/**
 * Pipe decorator, define for class. use to define the class. it can setting provider to some token, singleton or not. it will execute  [`PipeLifecycle`]
 *
 * @Pipe
 */
export const Pipe: IPipeDecorator = createClassDecorator<IPipeMetadata>('Pipe', [
    (ctx, next) => {
        if (isString(ctx.currArg)) {
            ctx.metadata.name = ctx.currArg;
            ctx.next(next);
        }
    },
    (ctx, next) => {
        if (isBoolean(ctx.currArg)) {
            ctx.metadata.pure = ctx.currArg;
        }
    }
], meta => {
    if (isUndefined(meta.pure)) {
        meta.pure = true;
    }
});

