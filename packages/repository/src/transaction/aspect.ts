import { ArgumentExecption, lang } from '@tsdi/ioc';
import { Aspect, Joinpoint, Before, AfterReturning, AfterThrowing } from '@tsdi/aop';
import { TransactionalMetadata } from './metadata';
import { TransactionManager } from './manager';
import { TransactionExecption } from './execption';
import { TransactionStatus } from './status';


/**
 * Transactional aspect. log for class or method with @Transactional decorator.
 *
 * @export
 * @class TransactionalAspect
 */
@Aspect({ static: true })
export class TransactionalAspect {

    @Before('@annotation(Transactional)', { sync: true, annotationName: 'Transactional', annotationArgName: 'annotation' })
    async begin(manager: TransactionManager, annotation: TransactionalMetadata[], joinPoint: Joinpoint) {
        if (!manager) throw new ArgumentExecption('TransactionManager can not be null.')
        const status = await manager.getTransaction(lang.first(annotation));
        joinPoint.setValue(TransactionStatus, status);
        await status.flush(joinPoint)
    }

    @AfterReturning('@annotation(Transactional)', 'returning', { sync: true })
    async commit(manager: TransactionManager, returning: any, joinPoint: Joinpoint) {
        if (!manager) throw new ArgumentExecption('TransactionManager can not be null.')
        await manager.commit(joinPoint.get(TransactionStatus))
    }

    @AfterThrowing('@annotation(Transactional)', 'error', { sync: true })
    async rollback(manager: TransactionManager, error: Error, joinPoint: Joinpoint) {
        if (!manager) throw new ArgumentExecption('TransactionManager can not be null.')
        try {
            await manager.rollback(joinPoint.get(TransactionStatus))
        } catch (err) {
            throw new TransactionExecption(err as Error)
        }
    }
}
