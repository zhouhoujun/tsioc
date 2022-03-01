import { PatternMetadata, Type, TypeMetadata } from '@tsdi/ioc';
import { CanActivate } from '../../transport/guard';
import { Middleware } from '../middleware';
import { Middlewares } from '../middlewares';

export interface HandleMessagePattern {
    /**
     * message handle pattern for route mapping.
     */
    route?: string | RegExp;
    /**
     * message handle command for route mapping.
     */
    cmd?: string;
}

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
     * version of api.
     */
    version?: string;
    /**
     * route prefix.
     */
    prefix?: string;
    /**
     * route protocol
     */
    protocol?: string;
    /**
     * route guards.
     */
    guards?: Type<CanActivate>[];

    /**
     * handle parent.
     * default register in root handle queue.
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
