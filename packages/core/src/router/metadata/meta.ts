import { PatternMetadata, Type, TypeMetadata } from '@tsdi/ioc';
import { CanActivate } from '../guard';
import { RouteMiddleware } from '../endpoint';

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
    parent?: Type<RouteMiddleware>;
}

export interface HandlesMetadata extends HandleMetadata {

    autorun?: string;
}
