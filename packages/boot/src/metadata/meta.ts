import { PatternMetadata, Type, TypeMetadata } from '@tsdi/ioc';
import { ModuleConfigure } from './ref';
import { Middleware, Middlewares } from '../middlewares/handle';
import { IStartupService } from '../services/StartupService';

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
    deps?: Type<IStartupService>[];
    /**
     * this service startup before the service, or at first
     */
    before?: Type<IStartupService> | 'all';
    /**
     * this service startup after the service, or last.
     */
    after?: Type<IStartupService> | 'all';
}


/**
 * DI module metadata.
 *
 * @export
 * @interface DIModuleMetadata
 * @extends {ModuleConfigure}
 * @extends {ClassMetadata}
 */
 export interface DIModuleMetadata extends ModuleConfigure { }

 

/**
 * Handle metadata. use to define the class as handle handle register in global handle queue.
 *
 * @export
 * @interface RegisterForMetadata
 * @extends {TypeMetadata}
 */
 export interface HandleMetadata extends TypeMetadata, PatternMetadata {
    /**
     * handle route
     */
    route?: string;

    /**
     * route protocol
     */
    protocol?: string;

    /**
     * handle parent.
     * default register in root handle queue.
     * @type {boolean}
     */
    parent?: Type<Middlewares>;

    /**
     * register this handle handle before this handle.
     *
     * @type {Type<Middleware>}
     */
    before?: Type<Middleware>;

    /**
     * register this handle handle after this handle.
     *
     * @type {Type<Middleware>}
     */
    after?: Type<Middleware>;
}

export interface HandlesMetadata extends HandleMetadata {

    autorun?: string;
}