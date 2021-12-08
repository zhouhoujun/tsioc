import { ArgumentError, lang, Singleton } from '@tsdi/ioc';
import { Aspect, Joinpoint, Before, AfterReturning, AfterThrowing } from '@tsdi/aop';
import { TransactionalMetadata } from './metadata';
import { TransactionManager } from './manager';
import { TransactionError } from './error';
import { TransactionStatus } from './status';


/**
 * Transactional aspect. log for class or method with @Transactional decorator.
 *
 * @export
 * @class TransactionalAspect
 */
@Singleton()
@Aspect()
export class TransactionalAspect {

    @Before('@annotation(Transactional)', { async: true, annotationName: 'Transactional', annotationArgName: 'annotation' })
    async begin(manager: TransactionManager, annotation: TransactionalMetadata[], joinPoint: Joinpoint) {
        if (!manager) throw new ArgumentError('TransactionManager can not be null.');
        const status = await manager.getTransaction(lang.first(annotation));
        joinPoint.setValue(TransactionStatus, status);
        await status.flush(joinPoint);
    }

    @AfterReturning('@annotation(Transactional)', 'returning', { async: true })
    async commit(manager: TransactionManager, returning: any, joinPoint: Joinpoint) {
        if (!manager) throw new ArgumentError('TransactionManager can not be null.');
        await manager.commit(joinPoint.getValue(TransactionStatus));
    }

    @AfterThrowing('@annotation(Transactional)', 'error', { async: true })
    async rollback(manager: TransactionManager, error: Error, joinPoint: Joinpoint) {
        if (!manager) throw new ArgumentError('TransactionManager can not be null.');
        try {
            await manager.rollback(joinPoint.getValue(TransactionStatus));
        } catch (err) {
            throw new TransactionError(err as Error);
        }
    }
}
