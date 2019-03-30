import { Singleton, Inject, MethodMetadata } from '@tsdi/ioc';
import { Aspect, Around, Joinpoint, Pointcut } from '@tsdi/aop';
import { LoggerAspect } from '../src';
import { ContainerToken, IContainer } from '@tsdi/core';

@Singleton
@Aspect
export class AnntotationLogAspect extends LoggerAspect {

    constructor(@Inject(ContainerToken) container: IContainer) {
        super(container);
    }

    @Pointcut('@annotation(Logger)', 'logAnnotation')
    logging(logAnnotation: MethodMetadata[], joinPoint: Joinpoint) {
        this.processLog(joinPoint, logAnnotation);
    }
}
