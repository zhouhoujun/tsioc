import { ArgumentError, lang, Singleton } from '@tsdi/ioc';
import { Aspect, Joinpoint, Pointcut, Before, AfterReturning, AfterThrowing } from '@tsdi/aop';
import { TransactionalMetadata } from '../metadata/meta';
import { TransactionManager } from './manager';


/**
 * Annotation Transactional aspect. log for class or method with @Transactional decorator.
 *
 * @export
 * @class AnnotationLogerAspect
 */
@Singleton()
@Aspect()
export class AnnotationTransactionalAspect {

    @Before('@annotation(Transactional)', { annotationName: 'Transactional', annotationArgName: 'annotation' })
    transaction(manager: TransactionManager, annotation: TransactionalMetadata[], joinPoint: Joinpoint) {
        if(!manager) throw new ArgumentError('TransactionManager can not be null.');
        const metadata = lang.first(annotation);
        
    }

    @AfterReturning('@annotation(Transactional)', 'returning', { annotationName: 'Transactional', annotationArgName: 'annotation' })
    commit(manager: TransactionManager, annotation: TransactionalMetadata[], returning: any, joinPoint: Joinpoint) {
        if(!manager) throw new ArgumentError('TransactionManager can not be null.');
        const metadata = lang.first(annotation);
    }

    @AfterThrowing('@annotation(Transactional)', 'error', { annotationName: 'Transactional', annotationArgName: 'annotation' })
    rollback(manager: TransactionManager, error: Error, annotation: TransactionalMetadata[], joinPoint: Joinpoint) {
        if(!manager) throw new ArgumentError('TransactionManager can not be null.');
        const metadata = lang.first(annotation);
    }
}
