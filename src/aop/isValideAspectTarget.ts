import { Type } from '../Type';
import { hasClassMetadata, NonePointcut } from '../core/index';
import { isClass, isObject } from '../utils/index';
// import { Aspect } from './decorators/index';

export function isValideAspectTarget(targetType: Type<any>) {

    if (!isClass(targetType)
        || targetType === Object
        || targetType === String
        || targetType === Date) {
        return false;
    }

    if (hasClassMetadata(NonePointcut, targetType)) {
        return false;
    }

    return true;
}
