import { Token, MetadataExtends, ITypeDecorator, isFunction, isClass, createClassDecorator, ArgsIteratorAction } from '@tsdi/ioc';
import { ModuleConfigure } from '../modules/ModuleConfigure';

/**
 * bootstrap metadata.
 *
 * @export
 * @interface BootstrapMetadata
 * @extends {AppConfigure}
 */
export interface BootstrapMetadata extends ModuleConfigure {
    /**
     * module bootstrap token.
     *
     * @type {Token<T>}
     * @memberof AnnotationConfigure
     */
    bootstrap?: Token;

}


/**
 * Bootstrap decorator, use to define class is a task element.
 *
 * @export
 * @interface IBootstrapDecorator
 * @extends {ITypeDecorator<T>}
 * @template T
 */
export interface IBootstrapDecorator<T extends BootstrapMetadata> extends ITypeDecorator<T> {
    /**
     * Bootstrap decorator, use to define class as Application Bootstrap element.
     *
     * @Bootstrap
     *
     * @param {T} metadata bootstrap metadate config.
     */
    (metadata: T): ClassDecorator;
}


/**
 * create bootstrap decorator.
 *
 * @export
 * @template T
 * @param {string} name
 * @param {MetadataAdapter} [actions]
 * @param {MetadataExtends<T>} [metaExt]
 * @returns {IBootstrapDecorator<T>}
 */
export function createBootstrapDecorator<T extends BootstrapMetadata>(
    name: string,
    actions?: ArgsIteratorAction<T>[],
    metaExt?: MetadataExtends<T>): IBootstrapDecorator<T> {

    return createClassDecorator<BootstrapMetadata>(name, actions, (meta: T) => {
        if (metaExt) {
            metaExt(meta);
        }

        // static main.
        if (isClass(meta.type) && isFunction(meta.type['main'])) {
            setTimeout(() => {
                meta.type['main'](meta);
            }, 100);
        }
        return meta;
    }) as IBootstrapDecorator<T>;
}

/**
 * Bootstrap Decorator, definde class as mvc bootstrap module.
 *
 * @Bootstrap
 */
export const Bootstrap: IBootstrapDecorator<BootstrapMetadata> = createBootstrapDecorator<BootstrapMetadata>('Bootstrap');
