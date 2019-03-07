import { Singleton, Inject, MethodMetadata } from '@ts-ioc/ioc';
import { Aspect, Around, Joinpoint, Pointcut } from '@ts-ioc/aop';
import { LoggerAspect } from '../src';
import { ContainerToken, IContainer } from '@ts-ioc/core';

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
