import { Joinpoint, Around, Aspect } from '../src';


@Aspect
export class IocDebug {
    @Around('execution(*)')
    log(joinPoint: Joinpoint) {
        console.log(joinPoint.fullName, ':', joinPoint.returning, joinPoint.throwing);
    }

}
