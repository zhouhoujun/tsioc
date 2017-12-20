import { Aspect } from './decorators';
import { Type } from '../Type';
import { AspectSet } from './AspectSet';
import { AdviceMatcher } from './AdviceMatcher';
import { MethodAccessor } from '../core';


export function isValideAspectTarget(targetType: Type<any>) {

    if (Reflect.hasMetadata(Aspect.toString(), targetType)) {
        return false;
    }
    if (targetType === AspectSet) {
        return false;
    }

    if (targetType === AdviceMatcher) {
        return false;
    }

    if (targetType === MethodAccessor) {
        return false;
    }

    return true;
}
