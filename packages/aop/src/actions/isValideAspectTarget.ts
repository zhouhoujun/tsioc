import { isClass, isBaseType, ITypeReflects, Type } from '@tsdi/ioc';
import { NonePointcut } from '../decorators/NonePointcut';


/**
 * is target can aspect or not.
 *
 * @export
 * @param {Type} targetType
 * @returns {boolean}
 */
export function isValideAspectTarget(targetType: Type, reflects: ITypeReflects): boolean {
    if (!isClass(targetType) || isBaseType(targetType)) {
        return false;
    }
    if (targetType.nonePointcut) {
        return false;
    }
    return !reflects.hasMetadata(NonePointcut, targetType)
}
