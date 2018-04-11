import {
    Type, hasOwnClassMetadata, isClass, IocCore
} from '@ts-ioc/core';
import { NonePointcut } from './decorators/index';

export function isValideAspectTarget(targetType: Type<any>) {

    if (!isClass(targetType)
        || targetType === Object
        || targetType === String
        || targetType === Date) {
        return false;
    }


    if (hasOwnClassMetadata(NonePointcut, targetType)) {
        return false;
    }

    if (hasOwnClassMetadata(IocCore, targetType)) {
        return false;
    }

    return true;
}
