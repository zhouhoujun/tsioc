import { Type, ActionTypes, createDecorator, MethodMetadata } from '@tsdi/ioc';
import { TransactionResolver } from './resolver';

/**
 * Transactional Decorator, define transaction propagation behaviors.
 * 
 * @Transactional
 */
export interface Transactional {
    /**
     * Transactional decorator, define transaction propagation behaviors.
     * @param option transactional metadata.
     */
    (option?: TransactionalMetadata): MethodDecorator;
}

export const Transactional: Transactional = createDecorator<TransactionalMetadata>('Transactional', {
    actionType: ActionTypes.methodProviders,
    def: {
        method: [
            (ctx, next) => {
                ctx.class.setMethodOptions(ctx.define.propertyKey, { resolvers: [TransactionResolver] });
                next()
            }
        ]
    },
    appendProps: (meta) => {
        if (!meta.propagation) {
            meta.propagation = 'REQUIRED'
        }
    }
});



/**
 * Transactional metadata
 */
export interface TransactionalMetadata extends MethodMetadata {
    connection?: string;
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

