import { AdviceMetadata } from './metadatas/index';
import { MethodMetadata } from '../core/index';
import { symbols, isString, isRegExp, MapSet } from '../utils/index';
import { Type, ObjectMap, Express } from '../types';
import { Advice } from './decorators/index';
import { Advices } from './Advices';


/**
 * aspect set.
 *
 * @export
 * @interface IAspectManager
 */
export interface IAspectManager {
    /**
     * aspects
     *
     * @type {MapSet<Type<any>, ObjectMap<AdviceMetadata[]>>}
     * @memberof IAspectManager
     */
    aspects: MapSet<Type<any>, ObjectMap<AdviceMetadata[]>>;
    /**
     * advices
     *
     * @type {MapSet<string, Advices>}
     * @memberof IAspectManager
     */
    advices: MapSet<string, Advices>;

    /**
     * has register advices or not.
     *
     * @param {Type<any>} targetType
     * @returns {boolean}
     * @memberof IAspectManager
     */
    hasRegisterAdvices(targetType: Type<any>): boolean;
    /**
     * set advices.
     *
     * @param {string} key
     * @param {Advices} advices
     * @memberof IAspectManager
     */
    setAdvices(key: string, advices: Advices);
    /**
     * get advices.
     *
     * @param {string} key
     * @returns {Advices}
     * @memberof IAspectManager
     */
    getAdvices(key: string): Advices;
    /**
     * add aspect.
     *
     * @param {Type<any>} aspect
     * @memberof IAspectManager
     */
    add(aspect: Type<any>);
}
