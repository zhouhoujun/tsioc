import { Singleton, Inject, NonePointcut, getMethodMetadata } from '../core/index';
import { IContainer } from '../IContainer';
import { symbols, MapSet } from '../utils/index';
import { Token, ObjectMap } from '../types';
import { Type } from '../Type';
import { Advices } from './Advices';
import { Aspect, Advice } from './decorators/index';
import { AdviceMetadata } from './metadatas/index';


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

/**
 * for global aspect mamager.
 *
 * @export
 * @class AspectManager
 */
@NonePointcut()
export class AspectManager implements IAspectManager {
    aspects: MapSet<Type<any>, ObjectMap<AdviceMetadata[]>>;
    advices: MapSet<string, Advices>;
    constructor(private container: IContainer) {
        this.aspects = new MapSet<Type<any>, ObjectMap<AdviceMetadata[]>>();
        this.advices = new MapSet<string, Advices>();
    }

    setAdvices(key: string, advices: Advices) {
        if (!this.advices.has(key)) {
            this.advices.set(key, advices);
        }
    }

    getAdvices(key: string) {
        if (!this.advices.has(key)) {
            return null;
        }
        return this.advices.get(key);
    }

    add(aspect: Type<any>) {
        if (!this.aspects.has(aspect)) {
            let metas = getMethodMetadata<AdviceMetadata>(Advice, aspect);
            // console.log(aspect, metas);
            this.aspects.set(aspect, metas);
        }
    }

}
