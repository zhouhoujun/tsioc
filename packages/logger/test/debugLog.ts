import { Aspect, Around, JoinPoint } from '@tsdi/aop';
import { LogAspect } from '../src';

@Aspect({ static: true })
export class DebugLog1Aspect extends LogAspect {

    @Around('execution(*.*)')
    logging(joinPoint: JoinPoint) {
        this.processLog(joinPoint);
    }
}
