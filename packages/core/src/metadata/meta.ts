import { PatternMetadata, ProviderMetadata, ProvidersMetadata, Type, TypeMetadata, TypeReflect } from '@tsdi/ioc';
import { CanActive } from '../middlewares/guard';
import { Middleware, Middlewares } from '../middlewares/middleware';
import { StartupService } from '../service';

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
    deps?: Type<StartupService>[];
    /**
     * this service startup before the service, or at first
     */
    before?: Type<StartupService> | 'all';
    /**
     * this service startup after the service, or last.
     */
    after?: Type<StartupService> | 'all';
}

export interface HandleMessagePattern {
    /**
     * message handle pattern for route mapping.
     */
    pattern?: string | RegExp;
    /**
     * message handle command for route mapping.
     */
    cmd?: string;
}

export interface ComponentScanMetadata extends TypeMetadata, ProvidersMetadata {
    /**
     * order in set.
     */
    order?: number;
    /**
     * is singleton or not.
     *
     * @type {boolean}
     */
    singleton?: boolean;
}

export interface ScanReflect extends TypeReflect {
    order?: number;
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
     * @type {Type<Middlewares>}
     */
    before?: Type<Middlewares>;

    /**
     * register this handle handle after this handle.
     *
     * @type {Type<Middlewares>}
     */
    after?: Type<Middlewares>;
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
export interface PipeMetadata extends ProviderMetadata {
    type?: Type;
    /**
     * name of pipe.
     */
    name: string;
    /**
     * If Pipe is pure (its output depends only on its input.)
     */
    pure?: boolean;
}
