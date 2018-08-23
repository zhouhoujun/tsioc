import { InjectedModule } from './InjectedModule';


/**
 *  module instance.
 */
export type MdInstance<T> = T & OnModuleInit<T> & OnModuleStart<any>;


/**
 * on module init.
 *
 * @export
 * @interface OnModuleInit
 */
export interface OnModuleInit<T> {
    /**
     * on Module init.
     *
     * @param {InjectedModule} [mdl]
     * @memberof OnModuleInit
     */
    mdOnInit(mdl?: InjectedModule<T>): void;
}

/**
 * module bootstrp start hook, raise hook on module bootstrap start.
 *
 * @export
 * @interface OnModuleStart
 * @template T
 */
export interface OnModuleStart<T> {
    /**
     * on Module bootstrap started.
     *
     * @param {T} [instance]
     * @memberof OnStart
     */
    mdOnStart(instance?: T): void | Promise<any>;
}
