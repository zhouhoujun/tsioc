import { Singleton, Inject, symbols, IContainer, MethodMetadata } from '@ts-ioc/core';
import { Aspect, Around, Joinpoint, Pointcut } from '@ts-ioc/aop';
import { LoggerAspect } from '../src';

@Singleton
@Aspect
export class AnntotationLogAspect extends LoggerAspect {

    constructor(@Inject(symbols.IContainer) container: IContainer) {
        super(container);
    }

    @Pointcut('@annotation(Logger)', 'logAnnotation')
    logging(logAnnotation: MethodMetadata[], joinPoint: Joinpoint) {
        this.processLog(joinPoint, logAnnotation);
    }
}
