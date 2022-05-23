import { Type, lang, ReflectiveRef, OnDestroy, Platform, refl, ctorName, TypeReflect, isFunction } from '@tsdi/ioc';
import { Advicer } from './advices/Advicer';
import { Advices } from './advices/Advices';
import { AdviceMatcher } from './AdviceMatcher';
import { AopReflect } from './metadata/ref';
import { Proceeding } from './Proceeding';

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
    /**
     * aspects.
     */
    aspects: ReflectiveRef[];

    constructor(private platform: Platform) {
        this.advices = new Map();
        this.aspects = []
    }

    register(type: Type | TypeReflect): void {
        const matcher = this.platform.getAction(AdviceMatcher);
        const typeRefl = isFunction(type) ? refl.get<AopReflect>(type, true) : type as AopReflect;
        const ClassType = typeRefl.type as Type;
        this.aspects.forEach(aspect => {
            const aopRef = aspect.reflect as AopReflect;
            const matchpoints = matcher.match(aopRef, typeRefl, aopRef.advices);
            matchpoints.forEach(mpt => {
                const name = mpt.name;
                const advice = mpt.advice;

                let advices = this.getAdvices(ClassType, name);
                if (!advices) {
                    advices = {
                        Before: [],
                        Pointcut: [],
                        After: [],
                        Around: [],
                        AfterThrowing: [],
                        AfterReturning: []
                    } as Advices;
                    this.setAdvices(ClassType, name, advices)
                }

                const advicer = {
                    ...mpt,
                    aspect
                } as Advicer;

                if (advice.adviceName === 'Before') {
                    if (!advices.Before.some(a => equals(a, advicer))) {
                        if (!advices.syncBefore && advicer.advice.sync) {
                            advices.syncBefore = true
                        }
                        advices.Before.push(advicer)
                    }
                } else if (advice.adviceName === 'Pointcut') {
                    if (!advices.Pointcut.some(a => equals(a, advicer))) {
                        if (!advices.syncPointcut && advicer.advice.sync) {
                            advices.syncPointcut = true
                        }
                        advices.Pointcut.push(advicer)
                    }
                } else if (advice.adviceName === 'Around') {
                    if (!advices.Around.some(a => equals(a, advicer))) {
                        if (!advices.syncAround && advicer.advice.sync) {
                            advices.syncAround = true
                        }
                        advices.Around.push(advicer)
                    }
                } else if (advice.adviceName === 'After') {
                    if (!advices.After.some(a => equals(a, advicer))) {
                        if (!advices.syncAfter && advicer.advice.sync) {
                            advices.syncAfter = true
                        }
                        advices.After.push(advicer)
                    }
                } else if (advice.adviceName === 'AfterThrowing') {
                    if (!advices.AfterThrowing.some(a => equals(a, advicer))) {
                        if (!advices.syncAfterThrowing && advicer.advice.sync) {
                            advices.syncAfterThrowing = true
                        }
                        advices.AfterThrowing.push(advicer)
                    }
                } else if (advice.adviceName === 'AfterReturning') {
                    if (!advices.AfterReturning.some(a => equals(a, advicer))) {
                        if (!advices.syncAfterReturning && advicer.advice.sync) {
                            advices.syncAfterReturning = true
                        }
                        advices.AfterReturning.push(advicer)
                    }
                }
            });
        })
    }

    unregister(type: Type) {
        this.advices.get(type)?.clear();
        this.advices.delete(type);
    }

    attach<T>(reflect: TypeReflect<T>, instance: T): void {
        const type = reflect.type as Type;
        const advicesMap = this.advices.get(type);
        if (advicesMap && advicesMap.size) {
            const className = reflect.class.className;
            const decorators = reflect.class.getPropertyDescriptors();
            const proceeding = this.platform.getAction(Proceeding);

            advicesMap.forEach((advices, name) => {
                if (name === ctorName) {
                    return
                }
                const pointcut = {
                    name: name,
                    fullName: `${className}.${name}`,
                    descriptor: decorators[name]
                }
                proceeding.proceed(instance, type, advices, pointcut)
            })
        }
    }

    detach<T>(reflect: TypeReflect<T>, instance: T): void {
        const advicesMap = this.advices.get(reflect.type as Type);
        if (advicesMap && advicesMap.size) {
            const decorators = reflect.class.getPropertyDescriptors();
            advicesMap.forEach((advices, name) => {
                if (name === ctorName) {
                    return
                }
                const descriptor = decorators[name];
                if (!descriptor) return;

                if (descriptor.get || descriptor.set) {
                    if (descriptor.get) {
                        const getMth = descriptor.get.bind(instance);
                        Object.defineProperty(instance, name, {
                            get: () => {
                                return getMth()
                            }
                        })
                    }
                    if (descriptor.set) {
                        const setMth = descriptor.set.bind(instance);
                        Object.defineProperty(instance, name, {
                            set: (val) => {
                                setMth(val)
                            }
                        })
                    }
                } else if (isFunction(descriptor.value)) {
                    (instance as any)[name] = descriptor.value.bind(instance);
                } else {
                    (instance as any)[name] = (instance as any)[name];
                }
            })
        }
    }

    /**
     * set advices.
     *
     * @param {string} key
     * @param {Advices} advices
     */
    private setAdvices(type: Type, key: string, advices: Advices): void {
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
    getAdvices(type: Type, key: string): Advices {
        return this.advices.get(type)?.get(key) || null!
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

function equals(a: Advicer, b: Advicer) {
    return a.aspect.type === b.aspect.type && a.advice.propertyKey === b.advice.propertyKey
}
