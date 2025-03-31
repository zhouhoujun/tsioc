import { Type, lang, ReflectiveRef, OnDestroy, Platform, refl, isFunction, Class } from '@tsdi/ioc';
import { Advicer } from './advices/Advicer';
import { Advices } from './advices/Advices';
import { AdviceMatcher } from './AdviceMatcher';
import { AopDef } from './metadata/ref';

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
    advices: Map<Type, Map<string | symbol, Advices>>;
    /**
     * aspects.
     */
    aspects: ReflectiveRef[];

    constructor(private platform: Platform) {
        this.advices = new Map();
        this.aspects = []
    }

    register(type: Type | Class): void {
        const matcher = this.platform.context.get(AdviceMatcher);
        const typeRefl = isFunction(type) ? refl.get(type) : type as Class;
        const ClassType = typeRefl.type;
        this.aspects.forEach(aspect => {
            const aopRef = aspect.class as Class;
            const matchpoints = matcher.match(aopRef, typeRefl, aopRef.getAnnotation<AopDef>().advices);
            matchpoints.forEach(mpt => {
                const { name, advice } = mpt;
                if (!advice.adviceName) return;

                let advices = this.getAdvices(ClassType, name);
                if (!advices) {
                    advices = new Advices();
                    this.setAdvices(ClassType, name, advices)
                }
                const advicer = {
                    ...mpt,
                    aspect
                } as Advicer;

                advices.addAdvicer(advice.adviceName, advicer);

            });
        })
    }

    unregister(type: Type) {
        this.advices.get(type)?.clear();
        this.advices.delete(type);
    }

    /**
     * set advices.
     *
     * @param {string} key
     * @param {Advices} advices
     */
    private setAdvices(type: Type, key: string | symbol, advices: Advices): void {
        let map = this.advices.get(type);
        if (!map) {
            map = new Map();
            this.advices.set(type, map)
        }
        map.set(key, advices)
    }

    /**
     * get advices.
     *
     * @param {string} key
     * @returns
     */
    getAdvices(type: Type, key: string | symbol): Advices {
        return this.advices.get(type)?.get(key) || null!
    }

    getAdvicesMap(type: Type) {
        return this.advices.get(type);
    }

    /**
     * add aspect.
     *
     * @param {Type} aspect
     * @param {Container} raiseContainer
     */
    add(aspect: ReflectiveRef): void {
        if (this.aspects.some(a => a.type === aspect.type)) return;
        this.aspects.push(aspect)
    }

    remove(aspect: ReflectiveRef) {
        lang.remove(this.aspects, aspect)
    }

    get(type: Type): ReflectiveRef | undefined {
        return this.aspects.find(r => r.type === type)
    }

    onDestroy(): void {
        this.aspects = [];
        this.advices.clear()
    }
}
