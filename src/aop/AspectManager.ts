import { Singleton, Inject, NonePointcut, MethodMetadata, getOwnMethodMetadata } from '../core/index';
import { IContainer } from '../IContainer';
import { symbols, MapSet } from '../utils/index';
import { Token, ObjectMap, Express } from '../types';
import { Type } from '../Type';
import { Advices, Advicer } from './Advices';
import { Aspect, Advice } from './decorators/index';
import { AdviceMetadata } from './metadatas/index';
import { IAspectManager } from './IAspectManager';

/**
 * for global aspect mamager.
 *
 * @export
 * @class AspectManager
 */
@NonePointcut()
export class AspectManager implements IAspectManager {
    /**
     * aspects.
     *
     * @type {MapSet<Type<any>, ObjectMap<AdviceMetadata[]>>}
     * @memberof AspectManager
     */
    aspects: MapSet<Type<any>, ObjectMap<AdviceMetadata[]>>;
    /**
     * method advices.
     *
     * @type {MapSet<string, Advices>}
     * @memberof AspectManager
     */
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

    hasRegisterAdvices(targetType: Type<any>): boolean {
        let methods = Object.keys(Object.getOwnPropertyDescriptors(targetType.prototype));
        let className = targetType.name || targetType.constructor.name;
        return methods.some(m => this.advices.has(`${className}.${m}`));
    }

    add(aspect: Type<any>) {
        if (!this.aspects.has(aspect)) {
            let metas = getOwnMethodMetadata<AdviceMetadata>(Advice, aspect);
            this.aspects.set(aspect, metas);
        }
    }
}
