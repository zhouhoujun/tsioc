import { IContainer, ContainerToken } from '@tsdi/core';
import { Aspect, Joinpoint, Pointcut } from '@tsdi/aop';
import { LoggerMetadata } from './decorators/Logger';
import { LoggerAspect } from './LoggerAspect';
import { Singleton, Inject } from '@tsdi/ioc';

/**
 * Annotation logger aspect. log for class or method with @Logger decorator.
 *
 * @export
 * @class AnnotationLogerAspect
 * @extends {LoggerAspect}
 */
@Singleton()
@Aspect()
export class AnnotationLogerAspect extends LoggerAspect {

    constructor(@Inject(ContainerToken) container: IContainer) {
        super(container)
    }


    @Pointcut('@annotation(Logger)', 'annotation')
    logging(joinPoint: Joinpoint, annotation: LoggerMetadata[]) {
        this.processLog(joinPoint, annotation);
    }
}
