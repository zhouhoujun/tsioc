import { PatternMetadata, ProviderMetadata, ProvidersMetadata, Token, Type, TypeMetadata, TypeDef } from '@tsdi/ioc';
import { ConfigureService } from '../service';

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
    deps?: Type<ConfigureService>[];
    /**
     * this service startup before the service, or at first
     */
    before?: Type<ConfigureService> | 'all';
    /**
     * this service startup after the service, or last.
     */
    after?: Type<ConfigureService> | 'all';
}

/**
 * component scan metadata.
 */
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

/**
 * scan def.
 */
export interface ScanDef extends TypeDef {
    order?: number;
}

/**
 * pipe metadata.
 *
 * @export
 * @interface PipeMetadata
 * @extends {TypeMetadata}
 */
export interface PipeMetadata extends ProviderMetadata {
    /**
     * pipe class type.
     */
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

/**
 * bean provider metadata.
 */
export interface BeanMetadata {
    /**
     * the token bean provider to.
     */
    provide: Token;
}
