import { Singleton, Inject, IocContainerToken, IIocContainer } from '@tsdi/ioc';
import { Aspect, Joinpoint, Pointcut } from '@tsdi/aop';
import { LoggerMetadata } from './decorators/Logger';
import { LoggerAspect } from './LoggerAspect';

/**
 * Annotation logger aspect. log for class or method with @Logger decorator.
 *
 * @export
 * @class AnnotationLogerAspect
 * @extends {LoggerAspect}
 */
@Singleton()
@Aspect()
export class AnnotationLoggerAspect extends LoggerAspect {

    constructor(@Inject(IocContainerToken) container: IIocContainer) {
        super(container)
    }


    @Pointcut('@annotation(Logger)', 'annotation')
    logging(joinPoint: Joinpoint, annotation: LoggerMetadata[]) {
        this.processLog(joinPoint, annotation);
    }
}
