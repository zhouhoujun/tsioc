import { ModuleConfig } from './ModuleConfigure';



/**
 * on Annotation class create hook.
 *
 * @export
 * @interface BeforeAnnotationCreate
 * @template T
 */
export interface BeforeAnnotationInit<T> {
    /**
     * before annotation class init.
     *
     * @param {ModuleConfig<T>} [config]
     * @returns {(void | Promise<any>)}
     * @memberof OnAnnotationCreate
     */
    anBeforeInit(config?: ModuleConfig<T>): void | Promise<any>;
}

/**
 * After Annotation classp created hook.
 *
 * @export
 * @interface AfterBootCreate
 * @template T
 */
export interface AfterAnnotationInit<T> {
    /**
     * after annotation class init.
     *
     * @param {ModuleConfig<T>} [config]
     * @returns {(void | Promise<any>)}
     * @memberof AfterAnnotationInit
     */
    anAfterInit(config?: ModuleConfig<T>): void | Promise<any>;
}

export type BootInstance<T> = T & BeforeAnnotationInit<T> & AfterAnnotationInit<T>;

