import { IContainer, Singleton, Inject, symbols } from '@ts-ioc/core';
import { Aspect, Joinpoint, Pointcut } from '@ts-ioc/aop';
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
export class AnnotationLogerAspect extends LoggerAspect {

    constructor(@Inject(symbols.IContainer) container: IContainer) {
        super(container)
    }


    @Pointcut('@annotation(Logger)', 'annotation')
    logging(joinPoint: Joinpoint, annotation: LoggerMetadata[]) {
        this.processLog(joinPoint, annotation);
    }
}
