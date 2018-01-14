import { AdviceMetadata } from './metadatas/index';
import { MethodMetadata } from '../core/index';
import { Type } from '../Type';
import { symbols, isString, isRegExp, MapSet } from '../utils/index';
import { ObjectMap, Express } from '../types';
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
