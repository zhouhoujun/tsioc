"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AfterThrowing = exports.AfterReturning = exports.Around = exports.After = exports.Before = exports.Pointcut = exports.Advice = exports.NonePointcut = exports.Aspect = void 0;
exports.createAdviceDecorator = createAdviceDecorator;
const ioc_1 = require("@tsdi/ioc");
const Advisor_1 = require("../Advisor");
/**
 * Aspect decorator. define aspect service.
 *
 * @Aspect()
 */
exports.Aspect = (0, ioc_1.createDecorator)('Aspect', {
    actionType: ioc_1.ActionType.annoation,
    def: {
        class: (ctx) => {
            ctx.classRef.assignAnnotation({ aspect: ctx.define.metadata });
        }
    },
    design: {
        afterAnnoation: (typeRef, ctx) => {
            const advisor = ctx.runtime.get(Advisor_1.Advisor);
            if (advisor) {
                const injector = ctx.injector;
                const invocation = typeRef.createInvocation(injector);
                injector.onDestroy(() => {
                    advisor.remove(invocation);
                    invocation.destroy();
                });
                advisor.add(invocation);
            }
            else {
                console.error('aop module not registered. make sure register before', typeRef.type);
            }
        }
    },
    props: (annotation, within, append) => ({ annotation, within, ...append })
});
/**
 * NonePointcut decorator, define class not work with aop.
 *
 * @NonePointcut()
 */
exports.NonePointcut = (0, ioc_1.createDecorator)('NonePointcut', {
    def: {
        class: (ctx) => {
            ctx.classRef.type[ioc_1.noPointcut] = true;
        }
    }
});
function createAdviceDecorator(adviceName, options) {
    options = options ?? {};
    const append = options.appendProps;
    return (0, ioc_1.createDecorator)(adviceName, {
        props: (pointcut, annotation) => {
            if ((0, ioc_1.isString)(annotation)) {
                return { pointcut, annotationArgName: annotation };
            }
            else {
                return { pointcut, ...annotation };
            }
        },
        ...options,
        def: {
            method: (ctx) => {
                if (!ctx.classRef.getAnnotation().advices) {
                    ctx.classRef.assignAnnotation({ advices: [] });
                }
                if (!ctx.define.metadata.propertyKey) {
                    ctx.define.metadata.propertyKey = ctx.define.propertyKey;
                }
                ctx.classRef.getAnnotation().advices.push(ctx.define.metadata);
            }
        },
        appendProps: (metadata) => {
            if (append) {
                append(metadata);
            }
            metadata.adviceName = adviceName;
            return metadata;
        }
    });
}
/**
 * aop advice decorator.
 *
 * @Advice
 */
exports.Advice = createAdviceDecorator('Advice');
/**
 * aop Pointcut advice decorator.
 *
 * @Pointcut
 */
exports.Pointcut = createAdviceDecorator('Pointcut');
/**
 * aop Before advice decorator.
 *
 * @Before
 */
exports.Before = createAdviceDecorator('Before');
/**
 * aop after advice decorator.
 *
 * @After
 */
exports.After = createAdviceDecorator('After');
/**
 * aop Around advice decorator.
 *
 * @Around
 */
exports.Around = createAdviceDecorator('Around');
/**
 * aop after returning advice decorator.
 *
 * @AfterReturning
 */
exports.AfterReturning = createAdviceDecorator('AfterReturning', {
    props: (pointcut, returning, annotation) => {
        if ((0, ioc_1.isString)(annotation)) {
            return { pointcut, returning, annotationName: annotation };
        }
        else {
            return { pointcut, ...annotation, returning };
        }
    }
});
/**
 * aop after throwing advice decorator.
 *
 * @AfterThrowing
 */
exports.AfterThrowing = createAdviceDecorator('AfterThrowing', {
    props: (pointcut, throwing, annotation) => {
        if ((0, ioc_1.isString)(annotation)) {
            return { pointcut, throwing, annotationName: annotation };
        }
        else {
            return { pointcut, ...annotation, throwing };
        }
    }
});
//# sourceMappingURL=decor.js.map