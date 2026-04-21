"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Advisor = void 0;
const ioc_1 = require("@tsdi/ioc");
const JoinPoint_1 = require("./joinpoints/JoinPoint");
/**
 * for global aop advisor.
 *
 * @export
 * @class Advisor
 */
class Advisor {
    constructor(matcher) {
        this.matcher = matcher;
        this.advices = new Map();
        this.aspects = [];
        this.proceedings = [];
    }
    /**
     * add aspect.
     *
     * @param {AbstractType} aspect
     * @param {Container} raiseContainer
     */
    add(aspect) {
        if (this.aspects.some(a => a.type === aspect.type))
            return;
        this.registerAspect(aspect);
    }
    registerAspect(aspect) {
        this.aspects.push(aspect);
        aspect.onDestroy(() => this.remove(aspect));
        aspect.classRef.getAnnotation().advices?.forEach(advice => {
            if (!advice.type) {
                advice.type = aspect.type;
            }
            const match = this.matcher.parse(advice);
            if (advice.propertyKey && advice.adviceName === 'Around' && aspect.classRef.getParameters(advice.propertyKey)?.some(r => r.type === JoinPoint_1.ProceedingJoinPoint || r.provider === JoinPoint_1.ProceedingJoinPoint)) {
                this.proceedings.push({
                    advice,
                    match,
                    aspect,
                    interceptor: (ctx, next, context) => {
                        const proceeding = new JoinPoint_1.ProceedingJoinPoint(ctx, next, context);
                        ctx.setValue(JoinPoint_1.ProceedingJoinPoint, proceeding);
                        return aspect.invoke(advice.propertyKey, ctx);
                    }
                });
                return;
            }
            const adviceType = advice.adviceName;
            let advices = this.advices.get(adviceType);
            if (!advices) {
                advices = [];
                this.advices.set(adviceType, advices);
            }
            if (!advices.some(r => r.advice.type == advice.type
                && r.advice.propertyKey === advice.propertyKey
                && r.advice.pointcut === advice.pointcut)) {
                advices.push({
                    advice,
                    match,
                    accessor: advice.accessor,
                    aspect
                });
            }
        });
    }
    unregisterAspect(aspect) {
        this.advices.forEach(advices => {
            advices.filter(a => a.aspect.type === aspect.type)
                .forEach(a => {
                advices.splice(advices.indexOf(a), 1);
            });
        });
        this.proceedings = this.proceedings.filter(r => r.aspect !== aspect || r.aspect.type !== aspect.type);
    }
    remove(aspect) {
        ioc_1.lang.remove(this.aspects, aspect);
        this.unregisterAspect(aspect);
    }
    get(type) {
        return this.aspects.find(r => r.type === type);
    }
    match(name, fullName, targetRef, target, options) {
        if (!this.advices.size)
            return false;
        for (const r of this.advices.values()) {
            for (let i = 0, len = r.length; i < len; i++) {
                if (r[i].match(name, fullName, targetRef, target, options)) {
                    return true;
                }
            }
        }
        return false;
    }
    hasCtor(tagref) {
        return this.match(ioc_1.ctorName, `${tagref.className}.${ioc_1.ctorName}`, tagref);
    }
    hasPointcut(instance, typeRef, withConstructor) {
        const className = typeRef?.className ?? (0, ioc_1.getTypeName)(instance);
        const names = Object.keys(instance);
        const decorators = typeRef?.getPropertyDescriptors();
        if (decorators) {
            for (const name in decorators) {
                if (name !== ioc_1.ctorName || withConstructor) {
                    names.push(name);
                }
            }
        }
        if (!this.advices.size)
            return false;
        for (const r of this.advices.values()) {
            for (let i = 0, len = names.length; i < len; i++) {
                const name = names[i];
                const fullName = `${className}.${name}`;
                for (let j = 0, alen = r.length; j < alen; j++) {
                    if (r[j].match(name, fullName, typeRef, instance, { way: 'root' })) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    getAdvicers(...types) {
        if (!types?.length)
            return [];
        if (types.length === 1)
            return this.advices.get(types[0]) ?? [];
        const result = [];
        for (let i = 0, len = types.length; i < len; i++) {
            const advicers = this.advices.get(types[i]);
            if (advicers?.length) {
                result.push(...advicers);
            }
        }
        return result;
    }
    getProceeding(name, fullName, targetRef, target, options) {
        return this.proceedings.filter(adv => adv.match(name, fullName, targetRef, target, options));
    }
    getBefore(name, fullName, targetRef, target, options) {
        return this.getAdvicers('Around', 'Before')
            .filter(adv => adv.match(name, fullName, targetRef, target, options));
    }
    getPointcut(name, fullName, targetRef, target, options) {
        return this.getAdvicers('Pointcut')
            .filter(adv => adv.match(name, fullName, targetRef, target, options));
    }
    getAfter(name, fullName, targetRef, target, options) {
        return this.getAdvicers('Around', 'After')
            .filter(adv => adv.match(name, fullName, targetRef, target, options));
    }
    getAfterReturning(name, fullName, targetRef, target, options) {
        return this.getAdvicers('Around', 'AfterReturning')
            .filter(adv => adv.match(name, fullName, targetRef, target, options));
    }
    getAfterThrowing(name, fullName, targetRef, target, options) {
        return this.getAdvicers('Around', 'AfterThrowing')
            .filter(adv => adv.match(name, fullName, targetRef, target, options));
    }
    onDestroy() {
        this.aspects = [];
        this.advices.clear();
    }
}
exports.Advisor = Advisor;
//# sourceMappingURL=Advisor.js.map