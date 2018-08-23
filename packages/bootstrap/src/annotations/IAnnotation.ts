import { AnnotationConfigure } from './AnnotationConfigure';



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
     * @param {AnnotationConfigure<T>} [config]
     * @returns {(void | Promise<any>)}
     * @memberof OnAnnotationCreate
     */
    anBeforeInit(config?: AnnotationConfigure<T>): void | Promise<any>;
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
    anAfterInit(config?: AnnotationConfigure<T>): void | Promise<any>;
}

/**
 * boot instance.
 */
export type AnnoInstance<T> = T & BeforeAnnotationInit<T> & AfterAnnotationInit<T>;

