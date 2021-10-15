import { Metadata, PatternMetadata, ProviderMetadata, Type, TypeMetadata, DataType } from '@tsdi/ioc';
import { ModuleConfigure } from './ref';
import { CanActive } from '../middlewares/guard';
import { Middleware, Middlewares } from '../middlewares/middleware';
import { IStartupService } from '../services/interface';

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
 * module metadata.
 *
 * @export
 * @interface ModuleMetadata
 * @extends {ModuleConfigure}
 * @extends {ClassMetadata}
 */
export interface ModuleMetadata extends ModuleConfigure { }



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
     * route guards.
     */
    guards?: Type<CanActive>[],

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

/**
 * pipe metadata.
 *
 * @export
 * @interface PipeMetadata
 * @extends {TypeMetadata}
 */
export interface PipeMetadata extends Metadata, ProviderMetadata {
    /**
     * name of pipe.
     */
    name: string;
    /**
     * If Pipe is pure (its output depends only on its input.)
     */
    pure?: boolean;
    /**
     * the type transform to.
     */
    toType?: Type | DataType;
}
