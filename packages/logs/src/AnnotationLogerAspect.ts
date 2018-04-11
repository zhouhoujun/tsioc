import { IContainer, Singleton, Inject, symbols } from '@ts-ioc/core';
import { Aspect, Joinpoint, Pointcut } from '@ts-ioc/aop';
import { LoggerMetadata } from './decorators/Logger';
import { LoggerAspect } from './LoggerAspect';


@Singleton
@Aspect
export class AnnotationLogerAspect extends LoggerAspect {

    constructor(@Inject(symbols.IContainer) container: IContainer) {
        super(container)
    }


    @Pointcut('@annotation(Logger)', 'annotation')
    logging(joinPoint: Joinpoint, annotation: LoggerMetadata[]) {
        this.processLog(joinPoint, annotation);
    }
}
