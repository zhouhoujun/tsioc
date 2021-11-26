import { MethodMetadata, PatternMetadata, ProviderMetadata, ProvidersMetadata, Type, TypeMetadata } from '@tsdi/ioc';
import { CanActive } from '../middlewares/guard';
import { Middleware, Middlewares } from '../middlewares/middleware';
import { Service } from '../services/service';

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
    deps?: Type<Service>[];
    /**
     * this service startup before the service, or at first
     */
    before?: Type<Service> | 'all';
    /**
     * this service startup after the service, or last.
     */
    after?: Type<Service> | 'all';
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
    scanType?: 'server' | 'client' | 'service';
    /**
     * is singleton or not.
     *
     * @type {boolean}
     */
    singleton?: boolean;
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

/**
 * Transactional metadata
 */
export interface TransactionalMetadata extends MethodMetadata {
    connection?: string | (() => string);
    /**
     * transaction propagation behaviors for transactional.
     * 
     * `MANDATORY` Support a current transaction, throw an exception if none exists.
     * 
     * `NESTED` Execute within a nested transaction if a current transaction exists, behave like `REQUIRED` else.
     * 
     * `NEVER` Execute non-transactionally, throw an exception if a transaction exists.
     * 
     * `NOT_SUPPORTED` Execute non-transactionally, suspend the current transaction if one exists.
     * 
     * `REQUIRED` Support a current transaction, create a new one if none exists.
     * 
     * `REQUIRES_NEW` Create a new transaction, and suspend the current transaction if one exists.
     * 
     * `SUPPORTS` Support a current transaction, execute non-transactionally if none exists.
     */
    propagation?: 'MANDATORY' | 'NESTED' | 'NEVER' | 'NOT_SUPPORTED' | 'REQUIRED' | 'REQUIRES_NEW' | 'SUPPORTS';
    /**
     * transaction isolation levels for transactional
     * 
     * `READ_UNCOMMITTED` A constant indicating that dirty reads, non-repeatable reads and phantom reads can occur.
     * 
     * `READ_COMMITTED` A constant indicating that dirty reads are prevented; non-repeatable reads and phantom reads can occur.
     * 
     * `REPEATABLE_READ` A constant indicating that dirty reads and non-repeatable reads are prevented; phantom reads can occur.
     * 
     * `SERIALIZABLE` A constant indicating that dirty reads, non-repeatable reads and phantom reads are prevented.
     */
    isolation?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
    /**
     * timeout limit.
     */
    timeout?: number;
    /**
     * readonly transaction.
     */
    readonly?: boolean;
    /**
     * rollback for.
     */
    rollbackFor?: Type | Type[];
}