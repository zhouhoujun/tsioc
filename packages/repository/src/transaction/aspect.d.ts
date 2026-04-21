import { JoinPoint } from '@tsdi/aop';
import { TransactionalMetadata } from './metadata';
import { TransactionManager } from './manager';
/**
 * Transactional aspect. log for class or method with @Transactional decorator.
 *
 * @export
 * @class TransactionalAspect
 */
export declare class TransactionalAspect {
    begin(manager: TransactionManager, annotation: TransactionalMetadata[], joinPoint: JoinPoint): Promise<void>;
    commit(manager: TransactionManager, returning: any, joinPoint: JoinPoint): Promise<void>;
    rollback(manager: TransactionManager, error: Error, joinPoint: JoinPoint): Promise<void>;
}
