import { PatternMetadata, Type, TypeMetadata } from '@tsdi/ioc';
import { CanActivate } from '../../transport/guard';
import { Endpoint, Middleware } from '../../transport/middleware';
import { Middlewares } from '../../transport/middlewares';

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
    parent?: Type<Endpoint>;

    /**
     * register this handle handle before this handle.
     *
     * @type {Type<Endpoint>}
     */
    before?: Type<Endpoint>;

    /**
     * register this handle handle after this handle.
     *
     * @type {Type<Endpoint>}
     */
    after?: Type<Endpoint>;
}

export interface HandlesMetadata extends HandleMetadata {

    autorun?: string;
}
