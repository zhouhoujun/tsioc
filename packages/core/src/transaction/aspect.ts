import { ArgumentError, lang, Singleton } from '@tsdi/ioc';
import { Aspect, Joinpoint, Before, AfterReturning, AfterThrowing } from '@tsdi/aop';
import { ConfigureLoggerManager } from '@tsdi/logs';
import { TransactionalMetadata } from '../metadata/meta';
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
        const metadata = lang.first(annotation);
        const status = await manager.getTransaction(metadata);
        joinPoint.setValue(TransactionStatus, status);
    }

    @AfterReturning('@annotation(Transactional)', 'returning', { async: true })
    async commit(manager: TransactionManager, returning: any, joinPoint: Joinpoint) {
        if (!manager) throw new ArgumentError('TransactionManager can not be null.');
        await manager.commit(joinPoint.getValue(TransactionStatus));
    }

    @AfterThrowing('@annotation(Transactional)', 'error', { async: true })
    async rollback(manager: TransactionManager, error: Error, joinPoint: Joinpoint) {
        if (!manager) throw new ArgumentError('TransactionManager can not be null.');
        const logger = joinPoint.injector.get(ConfigureLoggerManager)?.getLogger(lang.getClassName(joinPoint.targetType));

        if (logger) logger.error(error);
        try {
            await manager.rollback(joinPoint.getValue(TransactionStatus));
        } catch (err) {
            if (logger) logger.error(err);
            throw new TransactionError(err as Error);
        }
    }
}
