import {
    IContainer, Singleton, getOwnMethodMetadata,
    MapSet, Type, ObjectMap, getClassName, lang, Providers
} from '@ts-ioc/core';
import { Advices } from './advices';
import { Advice, NonePointcut } from './decorators';
import { AdviceMetadata } from './metadatas';
import { IAdvisor, AdvisorToken } from './IAdvisor';

/**
 * for global aop advisor.
 *
 * @export
 * @class Advisor
 */
@NonePointcut()
@Singleton(AdvisorToken)
export class Advisor implements IAdvisor {
    /**
     * aspects.
     *
     * @type {MapSet<Type<any>, ObjectMap<AdviceMetadata[]>>}
     * @memberof AspectManager
     */
    aspects: MapSet<Type<any>, ObjectMap<AdviceMetadata[]>>;

    protected aspectIocs: MapSet<Type<any>, IContainer>;
    /**
     * method advices.
     *
     * @type {MapSet<string, Advices>}
     * @memberof AspectManager
     */
    advices: MapSet<string, Advices>;


    constructor() {
        this.aspects = new MapSet();
        this.aspectIocs = new MapSet();
        this.advices = new MapSet();
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
        let methods = lang.keys(Object.getOwnPropertyDescriptors(targetType.prototype));
        let className = getClassName(targetType);
        return methods.some(m => this.advices.has(`${className}.${m}`));
    }

    add(aspect: Type<any>, raiseContainer: IContainer) {
        if (!this.aspects.has(aspect)) {
            let metas = getOwnMethodMetadata<AdviceMetadata>(Advice, aspect);
            this.aspects.set(aspect, metas);
            this.aspectIocs.set(aspect, raiseContainer);
        }
    }

    getContainer(aspect: Type<any>, defaultContainer?: IContainer): IContainer {
        if (this.aspectIocs.has(aspect)) {
            return this.aspectIocs.get(aspect) || defaultContainer;
        }
        return defaultContainer;
    }

    /**
     * resolve aspect.
     *
     * @template T
     * @param {Type<T>} aspect
     * @param {...Providers[]} providers
     * @returns {T}
     * @memberof Advisor
     */
    resolve<T>(aspect: Type<T>, ...providers: Providers[]): T {
        if (this.aspectIocs.has(aspect)) {
            return this.aspectIocs.get(aspect).resolve(aspect, ...providers);
        }
        return null;
    }
}
