import { AnnotationConfigure } from './AnnotationConfigure';
import { BuildOptions, BootHooks } from './AnnoType';
import { isFunction, RefRegistration, Token, Singleton } from '@ts-ioc/ioc';

/**
 * annotation instance build strategy.
 *
 * @export
 * @interface IAnnoBuildStrategy
 * @template T
 */
export interface IAnnoBuildStrategy<T> {

    /**
     * build strategy
     *
     * @param {T} instance
     * @param {AnnotationConfigure<T>} config
     * @param {BuildOptions<T>} options
     * @returns {Promise<void>}
     * @memberof IAnnoBuildStrategy
     */
    build(instance: T, config: AnnotationConfigure<T>, options: BuildOptions<T>): Promise<void>;

}

/**
 * annotation build strategy token inject.
 *
 * @export
 * @class InjectAnnoBuildStrategyToken
 * @extends {RefRegistration<IAnnoBuildStrategy<T>>}
 * @template T
 */
export class InjectAnnoBuildStrategyToken<T> extends RefRegistration<IAnnoBuildStrategy<T>> {
    constructor(type: Token<T>) {
        super(type, 'AnnoBuildStrategy');
    }
}

/**
 *  base AnnoBuildStrategy Token
 */
export const AnnoBuildStrategyToken = new InjectAnnoBuildStrategyToken(Object);

/**
 * annotation instance build strategy.
 *
 * @export
 * @class AnnoBuildStrategy
 * @implements {IAnnoBuildStrategy<T>}
 * @template T
 */
@Singleton(AnnoBuildStrategyToken)
export class AnnoBuildStrategy<T> implements IAnnoBuildStrategy<T> {

    async build(instance: T, config: AnnotationConfigure<T>, options: BuildOptions<T>): Promise<void> {
        if (!instance) {
            return;
        }
        await this.beforeInit(instance as BootHooks<T>, config);
        await this.process(instance, config, options);
        await this.afterInit(instance as BootHooks<T>, config);
    }

    /**
     * after annotation instance init.
     *
     * @protected
     * @param {BootHooks<T>} instance
     * @param {AnnotationConfigure<T>} config
     * @returns {Promise<void>}
     * @memberof AnnoBuildStrategy
     */
    protected async beforeInit(instance: BootHooks<T>, config: AnnotationConfigure<T>): Promise<void> {
        if (isFunction(instance.anBeforeInit)) {
            await instance.anBeforeInit(config);
        }
    }

    /**
     * build annotation instance process.
     *
     * @protected
     * @param {T} instance
     * @param {AnnotationConfigure<T>} config
     * @param {BuildOptions<T>} [options]
     * @returns {Promise<void>}
     * @memberof AnnoBuildStrategy
     */
    protected async process(instance: T, config: AnnotationConfigure<T>, options?: BuildOptions<T>): Promise<void> {

    }

    /**
     * after annotation instance init.
     *
     * @protected
     * @param {BootHooks<T>} instance
     * @param {AnnotationConfigure<T>} config
     * @returns {Promise<void>}
     * @memberof AnnoBuildStrategy
     */
    protected async afterInit(instance: BootHooks<T>, config: AnnotationConfigure<T>): Promise<void> {
        if (isFunction(instance.anAfterInit)) {
            await instance.anAfterInit(config);
        }
    }
}
