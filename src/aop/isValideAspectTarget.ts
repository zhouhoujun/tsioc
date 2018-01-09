import { Aspect } from './decorators/index';
import { Type } from '../Type';
import { NonePointcut } from '../core/index';
import { isClass, isObject } from '../utils/index';

export function isValideAspectTarget(targetType: Type<any>) {

    if (!isClass(targetType)
        || targetType === Object
        || targetType === String
        || targetType === Date) {
        return false;
    }

    if (Reflect.hasMetadata(Aspect.toString(), targetType) || Reflect.hasMetadata(NonePointcut.toString(), targetType)) {
        return false;
    }

    return true;
}
