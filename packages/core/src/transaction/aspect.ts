import { ArgumentError, lang, Singleton } from '@tsdi/ioc';
import { Aspect, Joinpoint, Pointcut } from '@tsdi/aop';
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

    @Pointcut('@annotation(Transactional)', { annotationName: 'Transactional', annotationArgName: 'annotation' })
    processTransaction(manager: TransactionManager, annotation: TransactionalMetadata[], joinPoint: Joinpoint) {
        if(!manager) throw new ArgumentError('TransactionManager can not be null.');
        const metadata = lang.first(annotation);
        
        
    }
}
