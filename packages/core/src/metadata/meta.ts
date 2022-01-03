import { PatternMetadata, ProviderMetadata, ProvidersMetadata, Token, Type, TypeMetadata, TypeReflect } from '@tsdi/ioc';
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
    provide: Token;
}
