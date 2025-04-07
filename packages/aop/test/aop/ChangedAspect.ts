import { JoinPoint, Around, Aspect, Before, After, AdviceMetadata } from '../../src';



@Aspect()
export class ChangedAspect {
    // pointcut for method has @AutoWried decorator.
    @Around('set(*.props.name)')
    change(joinPoint: JoinPoint) {
        if (joinPoint.state == 'After') {
            joinPoint.target.changed = joinPoint.valueChange;
        }
        console.log('aspect execution around, property name:', joinPoint.fullName, ' state:', joinPoint.state, 'change:', joinPoint.valueChange, joinPoint.accessor);
    }

    @Around('value(*.personFullName)')
    nameChange(joinPoint: JoinPoint) {
        if (joinPoint.state == 'After') {
            joinPoint.target.fulChange = joinPoint.valueChange;
        }
        console.log('aspect execution around, property name:', joinPoint.fullName, ' state:', joinPoint.state, 'change:', joinPoint.valueChange, joinPoint.accessor);
    }
}

