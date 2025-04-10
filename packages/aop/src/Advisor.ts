import { Type, lang, ReflectiveRef, OnDestroy, Platform, refl, isFunction, Class, getClass, ctorName, getClassName } from '@tsdi/ioc';
import { Advicer } from './advices/Advicer';
// import { Advices, AdvicesMapping } from './advices/Advices';
import { AdviceMatcher } from './AdviceMatcher';
import { AopDef } from './metadata/ref';
import { AdviceTypes } from './metadata/meta';

/**
 * for global aop advisor.
 *
 * @export
 * @class Advisor
 */
export class Advisor implements OnDestroy {

    private advices: Map<AdviceTypes, Advicer[]>;
    // /**
    //  * method advices.
    //  *
    //  * @type {Map<Type, AdvicesMapping>}
    //  */
    // advices: Map<Type, AdvicesMapping>;
    /**
     * aspects.
     */
    aspects: ReflectiveRef[];

    constructor(private matcher: AdviceMatcher) {
        this.advices = new Map();
        this.aspects = []
    }

    // register(type: Type | Class): void {
    //     if (this.advices.has((type as Class).type ?? type)) {
    //         return;
    //     }
    //     const matcher = this.platform.context.get(AdviceMatcher);
    //     const typeRefl = isFunction(type) ? refl.get(type) : type as Class;
    //     const mapping = new AdvicesMapping(typeRefl, (path) => path.startsWith(typeRefl.className));
    //     this.advices.set(typeRefl.type, mapping);

    //     this.aspects.forEach(aspect => {
    //         const aopRef = aspect.class as Class;
    //         const matchpoints = matcher.match(aopRef, typeRefl, aopRef.getAnnotation<AopDef>().advices);
    //         matchpoints.forEach(mpt => {
    //             const { name, advice, match, type: subType } = mpt;
    //             if (!advice.adviceName) return;

    //             let advices = mapping.get(name) as Advices;

    //             if (!advices) {
    //                 if(match) {
    //                     mapping.set(name, new AdvicesMapping(refl.get(subType!), match));
    //                     return;
    //                 }
    //                 advices = new Advices(advice.type);
    //                 mapping.set(name, advices)
    //             }
    //             const advicer = {
    //                 ...mpt,
    //                 aspect
    //             } as Advicer;

    //             advices.addAdvicer(advice.adviceName, advicer);

    //         });
    //     });

    // }

    // unregister(type: Type) {
    //     this.advices.get(type)?.clear();
    //     this.advices.delete(type);
    // }

    // getMapping(type: Type) {
    //     return this.advices.get(type);
    // }

    /**
     * add aspect.
     *
     * @param {Type} aspect
     * @param {Container} raiseContainer
     */
    add(aspect: ReflectiveRef): void {
        if (this.aspects.some(a => a.type === aspect.type)) return;
        this.registerAspect(aspect)
    }

    protected registerAspect(aspect: ReflectiveRef): void {
        this.aspects.push(aspect);
        aspect.class.getAnnotation<AopDef>().advices?.forEach(advice => {
            const match = this.matcher.createMatch(advice);
            const adviceType = advice.adviceName!;
            let advices = this.advices.get(adviceType);
            if (!advices) {
                advices = [];
                this.advices.set(adviceType, advices);
            }

            advices.push({
                advice,
                match,
                accessor: advice.accessor,
                aspect
            });
        });

    }

    unregisterAspect(aspect: ReflectiveRef) {
        aspect.class.getAnnotation<AopDef>().advices?.forEach(advice => {
            this.advices.forEach(advices => {
                advices.filter(a => a.aspect.type === aspect.type)
                    .forEach(a => {
                        advices.splice(advices.indexOf(a), 1);
                    })
            })
        })
    }

    remove(aspect: ReflectiveRef) {
        lang.remove(this.aspects, aspect);
        this.unregisterAspect(aspect);
    }

    get(type: Type): ReflectiveRef | undefined {
        return this.aspects.find(r => r.type === type)
    }

    hasProp(tagref: Class, property: string | symbol): boolean {
        return Array.from(this.advices.values()).some(r => {
            return r.some(a => a.match(property, `${tagref.className}.${property.toString()}`, tagref))
        })
    }

    match(name: string | symbol, fullName: string, targetRef?: Class|null, target?: any, accessor?: 'get' | 'set'): boolean {
        return Array.from(this.advices.values()).some(r => {
            return r.some(a => a.match(name, fullName, targetRef, target, accessor))
        })
    }

    hasAnyProp(instance: any, typeRef?: Class): boolean {
        const names = Object.keys(instance);

        const decorators = typeRef?.getPropertyDescriptors()
        // match method or property.
        if (decorators) {
            names.push(...Object.keys(decorators));
        }
        return Array.from(this.advices.values()).some(r => {

            return names.some(name=> r.some(a => a.match(name, `${typeRef?.className?? getClassName(instance)}.${name}`, typeRef, instance)))
        })
    }

    onDestroy(): void {
        this.aspects = [];
        this.advices.clear()
    }
}
