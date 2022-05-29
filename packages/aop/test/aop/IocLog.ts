import { Joinpoint, Around, Aspect, Before } from '../../src';



@Aspect({ static: true })
export class IocLog {
    @Around('execution(*)')
    log(joinPoint: Joinpoint) {
        if (joinPoint.target) {
            const key = 'around_' + joinPoint.methodName + '_' + joinPoint.state.toString();
            if (!joinPoint.target[key]) {
                joinPoint.target[key] = true;
            }
        }
        console.log('aspect execution Around log, method name:', joinPoint.fullName, ' state:', joinPoint.state, ' args:', joinPoint.args, ' returning:', joinPoint.returning, ' throwing:', joinPoint.throwing);
    }

    @Before('execution(*)')
    beforelog(joinPoint: Joinpoint) {
        console.log('aspect execution Before log, method name:', joinPoint.fullName, ' state:', joinPoint.state, ' returning:', joinPoint.returning, ' throwing:', joinPoint.throwing);
    }

}
