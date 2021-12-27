import { Type, lang, OperationRef, OnDestroy } from '@tsdi/ioc';
import { Advices } from './advices/Advices';

/**
 * for global aop advisor.
 *
 * @export
 * @class Advisor
 */
export class Advisor implements OnDestroy {
    /**
     * method advices.
     *
     * @type {Map<Type, Map<string, Advices>>}
     */
    advices: Map<Type, Map<string, Advices>>;

    aspects: OperationRef[];

    constructor() {
        this.advices = new Map();
        this.aspects = [];
    }

    /**
     * set advices.
     *
     * @param {string} key
     * @param {Advices} advices
     */
    setAdvices(type: Type, key: string, advices: Advices): void {
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
    getAdvices(type: Type, key: string): Advices {
        return this.advices.get(type)?.get(key) || null!;
    }

    /**
     * get advices.
     *
     * @param {string} key
     * @returns {Advices}
     */
    getAdviceMap(type: Type): Map<string, Advices> {
        return this.advices.get(type)!;
    }

    /**
     * add aspect.
     *
     * @param {Type} aspect
     * @param {Container} raiseContainer
     */
    add(aspect: OperationRef): void {
        this.aspects.push(aspect);
    }

    remove(aspect: OperationRef) {
        lang.remove(this.aspects, aspect);
    }

    get(type: Type): OperationRef | undefined {
        return this.aspects.find(r => r.type === type);
    }
    
    onDestroy(): void {
        this.aspects = [];
        this.advices.clear();
    }
}
