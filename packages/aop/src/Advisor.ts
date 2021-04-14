import { Type, ProviderType, IContainer } from '@tsdi/ioc';
import { Advices } from './advices/Advices';
import { IAdvisor } from './IAdvisor';

/**
 * for global aop advisor.
 *
 * @export
 * @class Advisor
 */
export class Advisor implements IAdvisor {
    /**
     * method advices.
     *
     * @type {Map<Type, Map<string, Advices>>}
     */
    advices: Map<Type, Map<string, Advices>>;

    aspects: Type[];

    constructor(private readonly container: IContainer) {
        this.advices = new Map();
        this.aspects = [];
    }

    /**
     * set advices.
     *
     * @param {string} key
     * @param {Advices} advices
     */
    setAdvices(type: Type, key: string, advices: Advices) {
        let map = this.advices.get(type);
        if (!map) {
            map = new Map();
            this.advices.set(type, map);
        }
        map.set(key, advices);
    }

    hasAdvices(type: Type): boolean {
        return this.advices.has(type);
    }

    /**
     * get advices.
     *
     * @param {string} key
     * @returns
     */
    getAdvices(type: Type, key: string) {
        return this.advices.get(type)?.get(key) || null;
    }

    /**
     * get advices.
     *
     * @param {string} key
     * @returns {Advices}
     */
    getAdviceMap(type: Type): Map<string, Advices> {
        return this.advices.get(type);
    }

    /**
     * add aspect.
     *
     * @param {Type} aspect
     * @param {IContainer} raiseContainer
     */
    add(aspect: Type) {
        this.aspects.push(aspect);
    }

    /**
     * resolve aspect.
     *
     * @template T
     * @param {Type<T>} aspect
     * @param {...ProviderType[]} providers
     * @returns {T}
     */
    resolve<T>(aspect: Type<T>, ...providers: ProviderType[]): T {
        return this.container.state().resolve(aspect, ...providers);
    }
}
