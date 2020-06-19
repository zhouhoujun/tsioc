import { ITypeDecorator, MetadataExtends, createClassDecorator, ArgsIteratorAction, isUndefined, ClassType, TypeMetadata, PatternMetadata } from '@tsdi/ioc';
import { IStartupService } from '../services/StartupService';

export type BootDecorator = <TFunction extends ClassType<IStartupService>>(target: TFunction) => TFunction | void;

/**
 * Boot metadata.
 *
 * @export
 * @interface BootMetadata
 * @extends {ClassMetadata}
 */
export interface BootMetadata extends TypeMetadata, PatternMetadata {
    /**
     * the startup service dependencies.
     */
    deps?: ClassType<IStartupService>[];
    /**
     * the service startup order.
     */
    order?: 'first' | 'last';
}

/**
 * Boot decorator, use to define class build way via config.
 *
 * @export
 * @interface IBootDecorator
 * @extends {ITypeDecorator<T>}
 * @template T
 */
export interface IBootDecorator<T extends BootMetadata> extends ITypeDecorator<T> {
    /**
     * Boot decorator, use to define class as DI Module.
     *
     * @Build
     *
     * @param {T} [metadata] bootstrap metadate config.
     */
    (metadata: T): BootDecorator;
}

/**
 * create type builder decorator
 *
 * @export
 * @template T
 * @param {string} name
 * @param {ArgsIteratorAction<T>[]} [actions]
 * @param {MetadataExtends<T>} [metaExtends]
 * @returns {IBootDecorator<T>}
 */
export function createBootDecorator<T extends BootMetadata>(
    name: string,
    actions?: ArgsIteratorAction<T>[],
    metaExtends?: MetadataExtends<T>): IBootDecorator<T> {

    return createClassDecorator<BootMetadata>(name,
        actions,
        meta => {
            if (metaExtends) {
                metaExtends(meta as T);
            }
            if (isUndefined(meta.singleton)) {
                meta.singleton = true;
            }
            return meta;
        }) as IBootDecorator<T>;
}


/**
 * Boot decorator, use to define class as configurable service way via config.
 *
 * @Boot
 */
export const Boot: IBootDecorator<BootMetadata> = createBootDecorator<BootMetadata>('Boot');
