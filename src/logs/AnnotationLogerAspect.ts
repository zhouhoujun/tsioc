import { Aspect, Joinpoint, Pointcut } from '../aop/index';
import { Singleton, Inject } from '../core/index';

import { symbols } from '../utils/index';
import { IContainer } from '../IContainer';
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
