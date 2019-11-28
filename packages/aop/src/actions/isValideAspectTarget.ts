import { isClass, isBaseType, ITypeReflects, Type, IocCoreService } from '@tsdi/ioc';
import { NonePointcut } from '../decorators';


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
    if (reflects.hasMetadata(NonePointcut, targetType)) {
        return false;
    }
    return !reflects.isExtends(targetType, IocCoreService);
}
