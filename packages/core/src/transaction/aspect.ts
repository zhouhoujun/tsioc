import { ArgumentError, lang, Singleton } from '@tsdi/ioc';
import { Aspect, Joinpoint, Before, AfterReturning, AfterThrowing } from '@tsdi/aop';
import { TransactionalMetadata } from '../metadata/meta';
import { TransactionManager } from './manager';
import { ConfigureLoggerManager } from '@tsdi/logs';
import { TransactionError } from './error';


/**
 * Transactional aspect. log for class or method with @Transactional decorator.
 *
 * @export
 * @class TransactionalAspect
 */
@Singleton()
@Aspect()
export class TransactionalAspect {

    @Before('@annotation(Transactional)', { annotationName: 'Transactional', annotationArgName: 'annotation' })
    transaction(manager: TransactionManager, annotation: TransactionalMetadata[], joinPoint: Joinpoint) {
        if (!manager) throw new ArgumentError('TransactionManager can not be null.');
        const metadata = lang.first(annotation);
        manager.getTransaction(metadata).flush();

    }

    @AfterReturning('@annotation(Transactional)', 'returning', { annotationName: 'Transactional', annotationArgName: 'annotation' })
    commit(manager: TransactionManager, annotation: TransactionalMetadata[], returning: any, joinPoint: Joinpoint) {
        if (!manager) throw new ArgumentError('TransactionManager can not be null.');
        const metadata = lang.first(annotation);
        manager.commit(manager.getTransaction(metadata));
    }

    @AfterThrowing('@annotation(Transactional)', 'error', { annotationName: 'Transactional', annotationArgName: 'annotation' })
    rollback(manager: TransactionManager, error: Error, annotation: TransactionalMetadata[], joinPoint: Joinpoint) {
        if (!manager) throw new ArgumentError('TransactionManager can not be null.');
        const metadata = lang.first(annotation);
        const logger = joinPoint.injector.get(ConfigureLoggerManager)?.getLogger(lang.getClassName(joinPoint.targetType));

        if (logger) logger.error(error);
        try {
            manager.rollback(manager.getTransaction(metadata));
        } catch (err) {
            if (logger) logger.error(err);
            throw new TransactionError(err as Error);
        }
    }
}
