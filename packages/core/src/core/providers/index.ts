import { isObject } from '../../utils';
import { ProviderMap } from './ProviderMap';

export * from './Provider';
// export * from './ExtendsProvider';
export * from './ProviderMap';
// export * from './InvokeProvider';
// export * from './ParamProvider';
// export * from './AsyncParamProvider';


/**
 * object is provider map or not.
 *
 * @export
 * @param {object} target
 * @returns {target is ProviderMap}
 */
export function isProviderMap(target: object): target is ProviderMap {
    if (!isObject(target)) {
        return false;
    }
    return target instanceof ProviderMap;
}
