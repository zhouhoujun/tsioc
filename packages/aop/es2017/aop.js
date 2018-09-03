'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var tslib_1 = _interopDefault(require('tslib'));
var core_1 = _interopDefault(require('@ts-ioc/core'));

function unwrapExports (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var AopActions_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * aop actions.
 *
 * @export
 * @enum {number}
 */
var AopActions;
(function (AopActions) {
    /**
     * register aspect service.
     */
    AopActions["registAspect"] = "registAspect";
    /**
     * extends intstance.
     */
    AopActions["exetndsInstance"] = "exetndsInstance";
    /**
     * match pointcut.
     */
    AopActions["matchPointcut"] = "matchPointcut";
    /**
     * bind property pointcut.
     */
    AopActions["bindPropertyPointcut"] = "bindPropertyPointcut";
    /**
     * bind method pointcut for instance.
     */
    AopActions["bindMethodPointcut"] = "bindMethodPointcut";
    AopActions["invokeBeforeConstructorAdvices"] = "invokeBeforeConstructorAdvices";
    AopActions["invokeAfterConstructorAdvices"] = "invokeAfterConstructorAdvices";
})(AopActions = exports.AopActions || (exports.AopActions = {}));




});

unwrapExports(AopActions_1);
var AopActions_2 = AopActions_1.AopActions;

var IAdvisor = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * Aop IAdvisor interface token.
 * it is a token id, you can register yourself IAdvisor for this.
 */
exports.AdvisorToken = new core_1.InjectToken('DI_IAdvisor');




});

unwrapExports(IAdvisor);
var IAdvisor_1 = IAdvisor.AdvisorToken;

var RegistAspectAction_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });



/**
 * regist aspect action.
 *
 * @export
 * @class RegistAspectAction
 * @extends {ActionComposite}
 */
class RegistAspectAction extends core_1.ActionComposite {
    constructor() {
        super(AopActions_1.AopActions.registAspect);
    }
    working(container, data) {
        let type = data.targetType;
        let lifeScope = container.getLifeScope();
        let matchs = lifeScope.getClassDecorators(surm => surm.actions.includes(AopActions_1.AopActions.registAspect) && core_1.hasOwnClassMetadata(surm.name, type));
        let aspectMgr = container.get(IAdvisor.AdvisorToken);
        let raiseContainer = data.raiseContainer || container;
        matchs.forEach(surm => {
            let metadata = core_1.getOwnTypeMetadata(surm.name, type);
            if (Array.isArray(metadata) && metadata.length > 0) {
                metadata.forEach(meta => {
                    if (core_1.isClass(meta.type)) {
                        aspectMgr.add(meta.type, raiseContainer);
                    }
                });
            }
        });
    }
}
RegistAspectAction.classAnnations = { "name": "RegistAspectAction", "params": { "constructor": [], "working": ["container", "data"] } };
exports.RegistAspectAction = RegistAspectAction;




});

unwrapExports(RegistAspectAction_1);
var RegistAspectAction_2 = RegistAspectAction_1.RegistAspectAction;

var Advice = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

function createAdviceDecorator(adviceName, adapter, afterPointcutAdapter, metadataExtends) {
    return core_1.createMethodDecorator('Advice', args => {
        if (adapter) {
            adapter(args);
        }
        args.next({
            match: (arg) => core_1.isString(arg) || core_1.isRegExp(arg),
            setMetadata: (metadata, arg) => {
                metadata.pointcut = arg;
            }
        });
        if (afterPointcutAdapter) {
            afterPointcutAdapter(args);
        }
        args.next({
            match: (arg) => core_1.isString(arg),
            setMetadata: (metadata, arg) => {
                metadata.annotationArgName = arg;
            }
        });
        args.next({
            match: (arg) => core_1.isString(arg),
            setMetadata: (metadata, arg) => {
                metadata.annotationName = arg;
            }
        });
    }, metadata => {
        if (metadataExtends) {
            metadata = metadataExtends(metadata);
        }
        metadata.adviceName = adviceName;
        return metadata;
    });
}
exports.createAdviceDecorator = createAdviceDecorator;
/**
 * aop advice decorator.
 *
 * @Advice
 */
exports.Advice = createAdviceDecorator('Advice');




});

unwrapExports(Advice);
var Advice_1 = Advice.createAdviceDecorator;
var Advice_2 = Advice.Advice;

var Aspect = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * Aspect decorator. define aspect service.
 *
 * @Aspect
 */
exports.Aspect = core_1.createClassDecorator('Aspect', args => {
    args.next({
        match: (arg) => core_1.isString(arg),
        setMetadata: (metadata, arg) => {
            metadata.annotation = arg;
        }
    });
    args.next({
        match: (arg) => core_1.isArray(arg) || core_1.isClass(arg),
        setMetadata: (metadata, arg) => {
            metadata.within = arg;
        }
    });
});




});

unwrapExports(Aspect);
var Aspect_1 = Aspect.Aspect;

var After = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * aop after advice decorator.
 *
 * @After
 */
exports.After = Advice.createAdviceDecorator('After');




});

unwrapExports(After);
var After_1 = After.After;

var AfterReturning = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });


/**
 * aop after returning advice decorator.
 *
 * @AfterReturning
 */
exports.AfterReturning = Advice.createAdviceDecorator('AfterReturning', null, args => {
    args.next({
        match: (arg) => core_1.isString(arg),
        setMetadata: (metadata, arg) => {
            metadata.returning = arg;
        }
    });
});




});

unwrapExports(AfterReturning);
var AfterReturning_1 = AfterReturning.AfterReturning;

var AfterThrowing = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });


/**
 * aop after throwing advice decorator.
 *
 * @AfterThrowing
 */
exports.AfterThrowing = Advice.createAdviceDecorator('AfterThrowing', null, args => {
    args.next({
        match: (arg) => core_1.isString(arg),
        setMetadata: (metadata, arg) => {
            metadata.throwing = arg;
        }
    });
});




});

unwrapExports(AfterThrowing);
var AfterThrowing_1 = AfterThrowing.AfterThrowing;

var Around = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });


/**
 * aop Around advice decorator.
 *
 * @Around
 */
exports.Around = Advice.createAdviceDecorator('Around', null, args => {
    args.next({
        match: (arg) => core_1.isString(arg),
        setMetadata: (metadata, arg) => {
            metadata.args = arg;
        }
    });
    args.next({
        match: (arg) => core_1.isString(arg),
        setMetadata: (metadata, arg) => {
            metadata.returning = arg;
        }
    });
    args.next({
        match: (arg) => core_1.isString(arg),
        setMetadata: (metadata, arg) => {
            metadata.throwing = arg;
        }
    });
});




});

unwrapExports(Around);
var Around_1 = Around.Around;

var Before = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * aop Before advice decorator.
 *
 * @Before
 */
exports.Before = Advice.createAdviceDecorator('Before');




});

unwrapExports(Before);
var Before_1 = Before.Before;

var Pointcut = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * aop Pointcut advice decorator.
 *
 * @Pointcut
 */
exports.Pointcut = Advice.createAdviceDecorator('Pointcut');




});

unwrapExports(Pointcut);
var Pointcut_1 = Pointcut.Pointcut;

var NonePointcut = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * NonePointcut decorator, define class not work with aop.
 *
 * @NonePointcut
 */
exports.NonePointcut = core_1.createClassDecorator('NonePointcut');




});

unwrapExports(NonePointcut);
var NonePointcut_1 = NonePointcut.NonePointcut;

var decorators = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

tslib_1.__exportStar(Advice, exports);
tslib_1.__exportStar(Aspect, exports);
tslib_1.__exportStar(After, exports);
tslib_1.__exportStar(AfterReturning, exports);
tslib_1.__exportStar(AfterThrowing, exports);
tslib_1.__exportStar(Around, exports);
tslib_1.__exportStar(Before, exports);
tslib_1.__exportStar(Pointcut, exports);
tslib_1.__exportStar(NonePointcut, exports);




});

unwrapExports(decorators);

var isValideAspectTarget_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });


/**
 * is target can aspect or not.
 *
 * @export
 * @param {Type<any>} targetType
 * @returns {boolean}
 */
function isValideAspectTarget(targetType) {
    if (!core_1.isClass(targetType)
        || targetType === Object
        || targetType === String
        || targetType === Date
        || targetType === Boolean
        || targetType === Number) {
        return false;
    }
    if (core_1.hasOwnClassMetadata(decorators.NonePointcut, targetType)) {
        return false;
    }
    return true;
}
exports.isValideAspectTarget = isValideAspectTarget;




});

unwrapExports(isValideAspectTarget_1);
var isValideAspectTarget_2 = isValideAspectTarget_1.isValideAspectTarget;

var IAdvisorChainFactory = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * Aop IAdvisorChainFactory interface token.
 * it is a token id, you can register yourself IAdvisorChainFactory for this.
 */
exports.AdvisorChainFactoryToken = new core_1.InjectToken('DI_IAdvisorChainFactory');




});

unwrapExports(IAdvisorChainFactory);
var IAdvisorChainFactory_1 = IAdvisorChainFactory.AdvisorChainFactoryToken;

var JoinpointState_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });
var JoinpointState;
(function (JoinpointState) {
    JoinpointState["Before"] = "Before";
    JoinpointState["Pointcut"] = "Pointcut";
    JoinpointState["After"] = "After";
    JoinpointState["AfterReturning"] = "AfterReturning";
    JoinpointState["AfterThrowing"] = "AfterThrowing";
})(JoinpointState = exports.JoinpointState || (exports.JoinpointState = {}));




});

unwrapExports(JoinpointState_1);
var JoinpointState_2 = JoinpointState_1.JoinpointState;

var IJoinpoint = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
* Aop IJoinpoint interface token.
* it is a token id, you can register yourself IJoinpoint for this.
*/
exports.JoinpointToken = new core_1.InjectToken('DI_IJoinpoint');




});

unwrapExports(IJoinpoint);
var IJoinpoint_1 = IJoinpoint.JoinpointToken;

var Joinpoint_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });




/**
 * Join point data.
 *
 * @export
 * @class Joinpoint
 * @implements {IJoinpoint}
 */
let Joinpoint = class Joinpoint {
    constructor(options) {
        this.provJoinpoint = options.provJoinpoint;
        this.name = options.name;
        this.fullName = options.fullName;
        this.params = options.params || [];
        this.args = options.args;
        this.returning = options.returning;
        this.throwing = options.throwing;
        this.state = options.state;
        this.advicer = options.advicer;
        this.annotations = options.annotations;
        this.target = options.target;
        this.targetType = options.targetType;
    }
};
Joinpoint.classAnnations = { "name": "Joinpoint", "params": { "constructor": ["options"] } };
Joinpoint = tslib_1.__decorate([
    core_1.Injectable(IJoinpoint.JoinpointToken),
    decorators.NonePointcut(),
    tslib_1.__metadata("design:paramtypes", [Object])
], Joinpoint);
exports.Joinpoint = Joinpoint;




});

unwrapExports(Joinpoint_1);
var Joinpoint_2 = Joinpoint_1.Joinpoint;

var joinpoints = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

tslib_1.__exportStar(JoinpointState_1, exports);
tslib_1.__exportStar(IJoinpoint, exports);
tslib_1.__exportStar(Joinpoint_1, exports);




});

unwrapExports(joinpoints);

var IAdvisorChain = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * Aop IAdvisorChain interface token.
 * it is a token id, you can register yourself IAdvisorChain for this.
 */
exports.AdvisorChainToken = new core_1.InjectToken('DI_IAdvisorChain');




});

unwrapExports(IAdvisorChain);
var IAdvisorChain_1 = IAdvisorChain.AdvisorChainToken;

var AdvisorChainFactory_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });







let AdvisorChainFactory = class AdvisorChainFactory {
    constructor(container, advisor, advices) {
        this.container = container;
        this.advisor = advisor;
        this.advices = advices;
    }
    getAdvicers(adviceType) {
        return (adviceType ? this.advices[adviceType] : null) || [];
    }
    invoaction(joinPoint, state, valueOrthrowing) {
        joinPoint.state = state;
        joinPoint.returning = undefined;
        joinPoint.throwing = undefined;
        switch (state) {
            case joinpoints.JoinpointState.Before:
                this.before(joinPoint);
                break;
            case joinpoints.JoinpointState.Pointcut:
                this.pointcut(joinPoint);
                break;
            case joinpoints.JoinpointState.After:
                joinPoint.returning = valueOrthrowing;
                this.after(joinPoint);
                break;
            case joinpoints.JoinpointState.AfterThrowing:
                joinPoint.throwing = valueOrthrowing;
                this.afterThrowing(joinPoint);
                break;
            case joinpoints.JoinpointState.AfterReturning:
                joinPoint.returning = valueOrthrowing;
                this.afterReturning(joinPoint);
                break;
        }
    }
    before(joinPoint) {
        let cloneJp = core_1.lang.assign({}, joinPoint);
        this.getAdvicers('Around')
            .forEach(advicer => {
            this.invokeAdvice(cloneJp, advicer);
        });
        if (!core_1.isUndefined(cloneJp.args)) {
            joinPoint.args = cloneJp.args;
        }
        this.getAdvicers('Before')
            .forEach(advicer => {
            this.invokeAdvice(cloneJp, advicer);
        });
    }
    pointcut(joinPoint) {
        let cloneJp = core_1.lang.assign({}, joinPoint);
        this.getAdvicers('Pointcut')
            .forEach(advicer => {
            this.invokeAdvice(cloneJp, advicer);
        });
        if (!core_1.isUndefined(cloneJp.args)) {
            joinPoint.args = cloneJp.args;
        }
    }
    after(joinPoint) {
        let cloneJp = core_1.lang.assign({}, joinPoint);
        this.getAdvicers('Around')
            .forEach(advicer => {
            this.invokeAdvice(cloneJp, advicer);
        });
        this.getAdvicers('After')
            .forEach(advicer => {
            this.invokeAdvice(cloneJp, advicer);
        });
    }
    afterThrowing(joinPoint) {
        let cloneJp = core_1.lang.assign({}, joinPoint);
        this.getAdvicers('Around')
            .forEach(advicer => {
            this.invokeAdvice(cloneJp, advicer);
        });
        this.getAdvicers('AfterThrowing')
            .forEach(advicer => {
            this.invokeAdvice(cloneJp, advicer);
        });
    }
    afterReturning(joinPoint) {
        let cloneJp = core_1.lang.assign({}, joinPoint);
        let advChain = this.container.resolve(IAdvisorChain.AdvisorChainToken, { joinPoint: cloneJp });
        this.getAdvicers('Around')
            .forEach(advicer => {
            advChain.next((jp) => {
                return this.invokeAdvice(jp, advicer);
            });
        });
        this.getAdvicers('AfterReturning')
            .forEach(advicer => {
            advChain.next(jp => {
                return this.invokeAdvice(jp, advicer);
            });
        });
        advChain.next((jp) => {
            if (!core_1.isUndefined(jp.returning)) {
                joinPoint.returning = jp.returning;
            }
            return joinPoint;
        });
        advChain.process();
    }
    invokeAdvice(joinPoint, advicer) {
        let providers = [];
        providers.push(core_1.Provider.createExtends(joinpoints.Joinpoint, joinPoint, (inst, provider) => {
            inst._cache_JoinPoint = provider.resolve(this.container);
        }));
        let metadata = advicer.advice;
        if (!core_1.isUndefined(joinPoint.args) && metadata.args) {
            providers.push(core_1.Provider.create(metadata.args, joinPoint.args));
        }
        if (metadata.annotationArgName) {
            providers.push(core_1.Provider.create(metadata.annotationArgName, () => {
                let curj = joinPoint;
                let annotations = curj.annotations;
                while (!annotations && joinPoint.provJoinpoint) {
                    curj = joinPoint.provJoinpoint;
                    if (curj && curj.annotations) {
                        annotations = curj.annotations;
                        break;
                    }
                }
                if (core_1.isArray(annotations)) {
                    if (metadata.annotationName) {
                        let d = metadata.annotationName;
                        d = /^@/.test(d) ? d : `@${d}`;
                        return annotations.filter(a => a.decorator === d);
                    }
                    return annotations;
                }
                else {
                    return [];
                }
            }));
        }
        if (!core_1.isUndefined(joinPoint.returning) && metadata.returning) {
            providers.push(core_1.Provider.create(metadata.returning, joinPoint.returning));
        }
        if (!core_1.isUndefined(joinPoint.throwing) && metadata.throwing) {
            providers.push(core_1.Provider.create(metadata.throwing, joinPoint.throwing));
        }
        return this.advisor.getContainer(advicer.aspectType, this.container).syncInvoke(advicer.aspectType, advicer.advice.propertyKey, null, ...providers);
    }
};
AdvisorChainFactory.classAnnations = { "name": "AdvisorChainFactory", "params": { "constructor": ["container", "advisor", "advices"], "getAdvicers": ["adviceType"], "invoaction": ["joinPoint", "state", "valueOrthrowing"], "before": ["joinPoint"], "pointcut": ["joinPoint"], "after": ["joinPoint"], "afterThrowing": ["joinPoint"], "afterReturning": ["joinPoint"], "invokeAdvice": ["joinPoint", "advicer"] } };
AdvisorChainFactory = tslib_1.__decorate([
    decorators.NonePointcut(),
    core_1.Injectable(IAdvisorChainFactory.AdvisorChainFactoryToken),
    tslib_1.__param(0, core_1.Inject(core_1.ContainerToken)), tslib_1.__param(1, core_1.Inject(IAdvisor.AdvisorToken)),
    tslib_1.__metadata("design:paramtypes", [Object, Object, Object])
], AdvisorChainFactory);
exports.AdvisorChainFactory = AdvisorChainFactory;




});

unwrapExports(AdvisorChainFactory_1);
var AdvisorChainFactory_2 = AdvisorChainFactory_1.AdvisorChainFactory;

var IAdvisorProceeding = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * Aop IAdvisorProceeding interface token.
 * it is a token id, you can register yourself IAdvisorProceeding for this.
 */
exports.AdvisorProceedingToken = new core_1.InjectToken('DI_IAdvisorProceeding');




});

unwrapExports(IAdvisorProceeding);
var IAdvisorProceeding_1 = IAdvisorProceeding.AdvisorProceedingToken;

var AdvisorChain_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });






let AdvisorChain = class AdvisorChain {
    constructor(joinPoint) {
        this.joinPoint = joinPoint;
        this.actions = [];
    }
    next(action) {
        this.actions.push(action);
    }
    getRecognizer() {
        return this.container.get(core_1.RecognizerToken, this.joinPoint.state);
    }
    process() {
        let alias = this.getRecognizer().recognize(this.joinPoint.returning);
        this.container.get(IAdvisorProceeding.AdvisorProceedingToken, alias)
            .proceeding(this.joinPoint, ...this.actions);
    }
};
AdvisorChain.classAnnations = { "name": "AdvisorChain", "params": { "constructor": ["joinPoint"], "next": ["action"], "getRecognizer": [], "process": [] } };
tslib_1.__decorate([
    core_1.Inject(core_1.ContainerToken),
    tslib_1.__metadata("design:type", Object)
], AdvisorChain.prototype, "container", void 0);
AdvisorChain = tslib_1.__decorate([
    decorators.NonePointcut(),
    core_1.Injectable(IAdvisorChain.AdvisorChainToken),
    tslib_1.__metadata("design:paramtypes", [joinpoints.Joinpoint])
], AdvisorChain);
exports.AdvisorChain = AdvisorChain;




});

unwrapExports(AdvisorChain_1);
var AdvisorChain_2 = AdvisorChain_1.AdvisorChain;

var IProxyMethod = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * Aop proxy method interface token.
 * it is a token id, you can register yourself IProxyMethod for this.
 */
exports.ProxyMethodToken = new core_1.InjectToken('DI_IProxyMethod');




});

unwrapExports(IProxyMethod);
var IProxyMethod_1 = IProxyMethod.ProxyMethodToken;

var ProxyMethod_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });



const joinpoints_2 = joinpoints;




let ProxyMethod = class ProxyMethod {
    constructor(container) {
        this.container = container;
    }
    get advisor() {
        if (!this._advisor) {
            this._advisor = this.container.get(IAdvisor.AdvisorToken);
        }
        return this._advisor;
    }
    get liefScope() {
        if (!this._liefScope) {
            this._liefScope = this.container.getLifeScope();
        }
        return this._liefScope;
    }
    proceed(target, targetType, pointcut, provJoinpoint) {
        let aspectMgr = this.advisor;
        let fullName = pointcut.fullName;
        let methodName = pointcut.name;
        let advices = aspectMgr.getAdvices(fullName);
        if (advices && pointcut) {
            if (pointcut.descriptor && (pointcut.descriptor.get || pointcut.descriptor.set)) {
                if (pointcut.descriptor.get) {
                    let getMethod = pointcut.descriptor.get.bind(target);
                    pointcut.descriptor.get = this.proxy(getMethod, advices, target, targetType, pointcut, provJoinpoint);
                }
                if (pointcut.descriptor.set) {
                    let setMethod = pointcut.descriptor.set.bind(target);
                    pointcut.descriptor.set = this.proxy(setMethod, advices, target, targetType, pointcut, provJoinpoint);
                }
                Object.defineProperty(target, methodName, pointcut.descriptor);
            }
            else if (core_1.isFunction(target[methodName])) {
                let propertyMethod = target[methodName].bind(target);
                target[methodName] = this.proxy(propertyMethod, advices, target, targetType, pointcut, provJoinpoint);
            }
        }
    }
    proxy(propertyMethod, advices, target, targetType, pointcut, provJoinpoint) {
        let fullName = pointcut.fullName;
        let methodName = pointcut.name;
        let liefScope = this.liefScope;
        let container = this.container;
        return (...args) => {
            let joinPoint = this.container.resolve(joinpoints_2.Joinpoint, core_1.Provider.create('options', {
                name: methodName,
                fullName: fullName,
                provJoinpoint: provJoinpoint,
                annotations: provJoinpoint ? null : liefScope.getMethodMetadatas(targetType, methodName),
                params: liefScope.getMethodParameters(targetType, target, methodName),
                args: args,
                target: target,
                targetType: targetType
            }));
            let adChain = container.resolve(IAdvisorChainFactory.AdvisorChainFactoryToken, { container: container, advisor: this.advisor, advices: advices });
            adChain.invoaction(joinPoint, joinpoints.JoinpointState.Before);
            adChain.invoaction(joinPoint, joinpoints.JoinpointState.Pointcut);
            let val, exeErr;
            try {
                val = propertyMethod(...joinPoint.args);
            }
            catch (err) {
                exeErr = err;
            }
            adChain.invoaction(joinPoint, joinpoints.JoinpointState.After, val);
            if (exeErr) {
                adChain.invoaction(joinPoint, joinpoints.JoinpointState.AfterThrowing, exeErr);
            }
            else {
                adChain.invoaction(joinPoint, joinpoints.JoinpointState.AfterReturning, val);
                return joinPoint.returning;
            }
        };
    }
};
ProxyMethod.classAnnations = { "name": "ProxyMethod", "params": { "constructor": ["container"], "proceed": ["target", "targetType", "pointcut", "provJoinpoint"], "proxy": ["propertyMethod", "advices", "target", "targetType", "pointcut", "provJoinpoint"] } };
ProxyMethod = tslib_1.__decorate([
    decorators.NonePointcut(),
    core_1.Singleton(IProxyMethod.ProxyMethodToken),
    tslib_1.__param(0, core_1.Inject(core_1.ContainerToken)),
    tslib_1.__metadata("design:paramtypes", [Object])
], ProxyMethod);
exports.ProxyMethod = ProxyMethod;




});

unwrapExports(ProxyMethod_1);
var ProxyMethod_2 = ProxyMethod_1.ProxyMethod;

var ReturningType_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Returning Type
 *
 * @export
 * @enum {number}
 */
var ReturningType;
(function (ReturningType) {
    /**
     * it is a sync returning
     */
    ReturningType["sync"] = "sync";
    /**
     * it is promise asyce returning
     */
    ReturningType["promise"] = "promise";
    /**
     * it is observable asyce returning
     */
    ReturningType["observable"] = "observable";
})(ReturningType = exports.ReturningType || (exports.ReturningType = {}));




});

unwrapExports(ReturningType_1);
var ReturningType_2 = ReturningType_1.ReturningType;

var AsyncPromiseProceeding_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });





let AsyncPromiseProceeding = class AsyncPromiseProceeding {
    constructor() {
    }
    proceeding(joinPoint, ...actions) {
        if (joinPoint.returning) {
            actions.forEach((action => {
                joinPoint.returning = joinPoint.returning.then((val) => {
                    joinPoint.returningValue = val;
                    return Promise.resolve(action(joinPoint))
                        .then(() => {
                        return joinPoint.returningValue;
                    });
                });
            }));
        }
    }
};
AsyncPromiseProceeding.classAnnations = { "name": "AsyncPromiseProceeding", "params": { "constructor": [], "proceeding": ["joinPoint", "actions"] } };
AsyncPromiseProceeding = tslib_1.__decorate([
    decorators.NonePointcut(),
    core_1.Singleton(IAdvisorProceeding.AdvisorProceedingToken, ReturningType_1.ReturningType.promise),
    tslib_1.__metadata("design:paramtypes", [])
], AsyncPromiseProceeding);
exports.AsyncPromiseProceeding = AsyncPromiseProceeding;




});

unwrapExports(AsyncPromiseProceeding_1);
var AsyncPromiseProceeding_2 = AsyncPromiseProceeding_1.AsyncPromiseProceeding;

var AsyncObservableProceeding_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });





let AsyncObservableProceeding = class AsyncObservableProceeding {
    constructor() {
    }
    proceeding(joinPoint, ...actions) {
        if (core_1.isFunction(joinPoint.returning.flatMap)) {
            actions.forEach(action => {
                joinPoint.returning = joinPoint.returning.flatMap((val) => {
                    joinPoint.returningValue = val;
                    action(joinPoint);
                    if (core_1.isObservable(joinPoint.returningValue)) {
                        return joinPoint.returningValue;
                    }
                    else if (core_1.isPromise(joinPoint.returningValue)) {
                        return joinPoint.returningValue;
                    }
                    else {
                        return Promise.resolve(joinPoint.returningValue);
                    }
                });
            });
        }
        else {
            actions.forEach(action => {
                action(joinPoint);
            });
        }
    }
};
AsyncObservableProceeding.classAnnations = { "name": "AsyncObservableProceeding", "params": { "constructor": [], "proceeding": ["joinPoint", "actions"] } };
AsyncObservableProceeding = tslib_1.__decorate([
    decorators.NonePointcut(),
    core_1.Singleton(IAdvisorProceeding.AdvisorProceedingToken, ReturningType_1.ReturningType.observable),
    tslib_1.__metadata("design:paramtypes", [])
], AsyncObservableProceeding);
exports.AsyncObservableProceeding = AsyncObservableProceeding;




});

unwrapExports(AsyncObservableProceeding_1);
var AsyncObservableProceeding_2 = AsyncObservableProceeding_1.AsyncObservableProceeding;

var ReturningRecognizer_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });





let ReturningRecognizer = class ReturningRecognizer {
    constructor() {
    }
    recognize(value) {
        if (core_1.isPromise(value)) {
            return ReturningType_1.ReturningType.promise;
        }
        if (core_1.isObservable(value)) {
            return ReturningType_1.ReturningType.observable;
        }
        return ReturningType_1.ReturningType.sync;
    }
};
ReturningRecognizer.classAnnations = { "name": "ReturningRecognizer", "params": { "constructor": [], "recognize": ["value"] } };
ReturningRecognizer = tslib_1.__decorate([
    decorators.NonePointcut(),
    core_1.Singleton(core_1.RecognizerToken, joinpoints.JoinpointState.AfterReturning),
    tslib_1.__metadata("design:paramtypes", [])
], ReturningRecognizer);
exports.ReturningRecognizer = ReturningRecognizer;




});

unwrapExports(ReturningRecognizer_1);
var ReturningRecognizer_2 = ReturningRecognizer_1.ReturningRecognizer;

var SyncProceeding_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });





let SyncProceeding = class SyncProceeding {
    proceeding(joinPoint, ...actions) {
        joinPoint.returningValue = joinPoint.returning;
        actions.forEach((action => {
            action(joinPoint);
        }));
    }
};
SyncProceeding.classAnnations = { "name": "SyncProceeding", "params": { "proceeding": ["joinPoint", "actions"] } };
SyncProceeding = tslib_1.__decorate([
    decorators.NonePointcut(),
    core_1.Singleton(IAdvisorProceeding.AdvisorProceedingToken, ReturningType_1.ReturningType.sync)
], SyncProceeding);
exports.SyncProceeding = SyncProceeding;




});

unwrapExports(SyncProceeding_1);
var SyncProceeding_2 = SyncProceeding_1.SyncProceeding;

var access = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

tslib_1.__exportStar(IAdvisorChainFactory, exports);
tslib_1.__exportStar(AdvisorChainFactory_1, exports);
tslib_1.__exportStar(IAdvisorChain, exports);
tslib_1.__exportStar(AdvisorChain_1, exports);
tslib_1.__exportStar(IProxyMethod, exports);
tslib_1.__exportStar(ProxyMethod_1, exports);
tslib_1.__exportStar(AsyncPromiseProceeding_1, exports);
tslib_1.__exportStar(AsyncObservableProceeding_1, exports);
tslib_1.__exportStar(IAdvisorProceeding, exports);
tslib_1.__exportStar(ReturningRecognizer_1, exports);
tslib_1.__exportStar(ReturningType_1, exports);
tslib_1.__exportStar(SyncProceeding_1, exports);




});

unwrapExports(access);

var BindMethodPointcutAction_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });




/**
 * bind method pointcut action.
 *
 * @export
 * @class BindMethodPointcutAction
 * @extends {ActionComposite}
 */
class BindMethodPointcutAction extends core_1.ActionComposite {
    constructor() {
        super(AopActions_1.AopActions.bindMethodPointcut);
    }
    working(container, data) {
        // aspect class do nothing.
        if (!data.target || !isValideAspectTarget_1.isValideAspectTarget(data.targetType)) {
            return;
        }
        if (!container.hasRegister(access.ProxyMethodToken.toString())) {
            return;
        }
        let proxy = container.get(access.ProxyMethodToken);
        let target = data.target;
        let targetType = data.targetType;
        let className = core_1.getClassName(targetType);
        let methods = [];
        let decorators = Object.getOwnPropertyDescriptors(targetType.prototype);
        core_1.lang.forIn(decorators, (item, name) => {
            if (name === 'constructor') {
                return;
            }
            methods.push({
                name: name,
                fullName: `${className}.${name}`,
                descriptor: item
            });
        });
        let allmethods = core_1.getParamerterNames(targetType);
        core_1.lang.forIn(allmethods, (item, name) => {
            if (name === 'constructor') {
                return;
            }
            if (core_1.isUndefined(decorators[name])) {
                methods.push({
                    name: name,
                    fullName: `${className}.${name}`
                });
            }
        });
        methods.forEach(pointcut => {
            proxy.proceed(target, targetType, pointcut, target['_cache_JoinPoint']);
        });
    }
}
BindMethodPointcutAction.classAnnations = { "name": "BindMethodPointcutAction", "params": { "constructor": [], "working": ["container", "data"] } };
exports.BindMethodPointcutAction = BindMethodPointcutAction;




});

unwrapExports(BindMethodPointcutAction_1);
var BindMethodPointcutAction_2 = BindMethodPointcutAction_1.BindMethodPointcutAction;

var InvokeBeforeConstructorAction_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });





/**
 * actions invoke before constructor.
 *
 * @export
 * @class InvokeBeforeConstructorAction
 * @extends {ActionComposite}
 */
class InvokeBeforeConstructorAction extends core_1.ActionComposite {
    constructor() {
        super(AopActions_1.AopActions.registAspect);
    }
    working(container, data) {
        // aspect class do nothing.
        if (!isValideAspectTarget_1.isValideAspectTarget(data.targetType)) {
            return;
        }
        let advisor = container.get(IAdvisor.AdvisorToken);
        let className = core_1.getClassName(data.targetType);
        let advices = advisor.getAdvices(className + '.constructor');
        if (!advices) {
            return;
        }
        let targetType = data.targetType;
        let target = data.target;
        let joinPoint = container.resolve(joinpoints.Joinpoint, core_1.Provider.create('options', {
            name: 'constructor',
            state: joinpoints.JoinpointState.Before,
            fullName: className + '.constructor',
            target: target,
            args: data.args,
            params: data.params,
            targetType: targetType
        }));
        let providers = [core_1.Provider.create(joinpoints.Joinpoint, joinPoint)];
        if (data.providerMap) {
            providers.push(data.providerMap);
        }
        advices.Before.forEach(advicer => {
            advisor.getContainer(advicer.aspectType, container).syncInvoke(advicer.aspectType, advicer.advice.propertyKey, null, ...providers); // new Joinpoint(joinPoint) // container.resolve(Joinpoint, { json: joinPoint })
        });
        advices.Around.forEach(advicer => {
            advisor.getContainer(advicer.aspectType, container).syncInvoke(advicer.aspectType, advicer.advice.propertyKey, null, ...providers);
        });
    }
}
InvokeBeforeConstructorAction.classAnnations = { "name": "InvokeBeforeConstructorAction", "params": { "constructor": [], "working": ["container", "data"] } };
exports.InvokeBeforeConstructorAction = InvokeBeforeConstructorAction;




});

unwrapExports(InvokeBeforeConstructorAction_1);
var InvokeBeforeConstructorAction_2 = InvokeBeforeConstructorAction_1.InvokeBeforeConstructorAction;

var InvokeAfterConstructorAction_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });





/**
 * invoke after constructor action.
 *
 * @export
 * @class InvokeAfterConstructorAction
 * @extends {ActionComposite}
 */
class InvokeAfterConstructorAction extends core_1.ActionComposite {
    constructor() {
        super(AopActions_1.AopActions.invokeAfterConstructorAdvices);
    }
    working(container, data) {
        // aspect class do nothing.
        if (!data.target || !isValideAspectTarget_1.isValideAspectTarget(data.targetType)) {
            return;
        }
        let advisor = container.get(IAdvisor.AdvisorToken);
        let className = core_1.getClassName(data.targetType);
        let advices = advisor.getAdvices(className + '.constructor');
        if (!advices) {
            return;
        }
        let targetType = data.targetType;
        let target = data.target;
        let joinPoint = container.resolve(joinpoints.Joinpoint, core_1.Provider.create('options', {
            name: 'constructor',
            state: joinpoints.JoinpointState.After,
            fullName: className + '.constructor',
            target: target,
            args: data.args,
            params: data.params,
            targetType: targetType
        }));
        let providers = [core_1.Provider.create(joinpoints.Joinpoint, joinPoint)];
        if (data.providerMap) {
            providers.push(data.providerMap);
        }
        advices.After.forEach(advicer => {
            advisor.getContainer(advicer.aspectType, container).syncInvoke(advicer.aspectType, advicer.advice.propertyKey, null, ...providers);
        });
        advices.Around.forEach(advicer => {
            advisor.getContainer(advicer.aspectType, container).syncInvoke(advicer.aspectType, advicer.advice.propertyKey, null, ...providers);
        });
    }
}
InvokeAfterConstructorAction.classAnnations = { "name": "InvokeAfterConstructorAction", "params": { "constructor": [], "working": ["container", "data"] } };
exports.InvokeAfterConstructorAction = InvokeAfterConstructorAction;




});

unwrapExports(InvokeAfterConstructorAction_1);
var InvokeAfterConstructorAction_2 = InvokeAfterConstructorAction_1.InvokeAfterConstructorAction;

var IAdviceMatcher = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * Aop advice matcher interface token.
 * it is a token id, you can register yourself IActionBuilder for this.
 */
exports.AdviceMatcherToken = new core_1.InjectToken('DI_IAdviceMatcher');




});

unwrapExports(IAdviceMatcher);
var IAdviceMatcher_1 = IAdviceMatcher.AdviceMatcherToken;

var MatchPointcutAction_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });





/**
 *  match pointcut action.
 *
 * @export
 * @class MatchPointcutAction
 * @extends {ActionComposite}
 */
class MatchPointcutAction extends core_1.ActionComposite {
    constructor() {
        super(AopActions_1.AopActions.matchPointcut);
    }
    working(container, data) {
        // aspect class do nothing.
        if (!isValideAspectTarget_1.isValideAspectTarget(data.targetType)) {
            return;
        }
        let advisor = container.get(IAdvisor.AdvisorToken);
        let matcher = container.get(IAdviceMatcher.AdviceMatcherToken);
        advisor.aspects.forEach((adviceMetas, type) => {
            let matchpoints = matcher.match(type, data.targetType, adviceMetas, data.target);
            matchpoints.forEach(mpt => {
                let fullName = mpt.fullName;
                let advice = mpt.advice;
                let advices = advisor.getAdvices(fullName);
                if (!advices) {
                    advices = {
                        Before: [],
                        Pointcut: [],
                        After: [],
                        Around: [],
                        AfterThrowing: [],
                        AfterReturning: []
                    };
                    advisor.setAdvices(fullName, advices);
                }
                let advicer = core_1.lang.assign(mpt, {
                    aspectType: type
                });
                if (advice.adviceName === 'Before') {
                    if (!advices.Before.some(a => this.isAdviceEquals(a.advice, advice))) {
                        advices.Before.push(advicer);
                    }
                }
                else if (advice.adviceName === 'Pointcut') {
                    if (!advices.Pointcut.some(a => this.isAdviceEquals(a.advice, advice))) {
                        advices.Pointcut.push(advicer);
                    }
                }
                else if (advice.adviceName === 'Around') {
                    if (!advices.Around.some(a => this.isAdviceEquals(a.advice, advice))) {
                        advices.Around.push(advicer);
                    }
                }
                else if (advice.adviceName === 'After') {
                    if (!advices.After.some(a => this.isAdviceEquals(a.advice, advice))) {
                        advices.After.push(advicer);
                    }
                }
                else if (advice.adviceName === 'AfterThrowing') {
                    if (!advices.AfterThrowing.some(a => this.isAdviceEquals(a.advice, advice))) {
                        advices.AfterThrowing.push(advicer);
                    }
                }
                else if (advice.adviceName === 'AfterReturning') {
                    if (!advices.AfterReturning.some(a => this.isAdviceEquals(a.advice, advice))) {
                        advices.AfterReturning.push(advicer);
                    }
                }
            });
        });
    }
    isAdviceEquals(advice1, advice2) {
        if (!advice1 || !advice2) {
            return false;
        }
        if (advice1 === advice2) {
            return true;
        }
        return advice1.adviceName === advice2.adviceName
            && advice1.pointcut === advice2.pointcut
            && advice1.propertyKey === advice2.propertyKey;
    }
}
MatchPointcutAction.classAnnations = { "name": "MatchPointcutAction", "params": { "constructor": [], "working": ["container", "data"], "isAdviceEquals": ["advice1", "advice2"] } };
exports.MatchPointcutAction = MatchPointcutAction;




});

unwrapExports(MatchPointcutAction_1);
var MatchPointcutAction_2 = MatchPointcutAction_1.MatchPointcutAction;

var AopActionFactory_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });



/**
 * aop action factory.
 *
 * @export
 * @class AopActionFactory
 */
class AopActionFactory {
    create(type) {
        let action;
        switch (type) {
            case AopActions_1.AopActions.registAspect:
                action = new RegistAspectAction_1.RegistAspectAction();
                break;
            case AopActions_1.AopActions.matchPointcut:
                action = new actions.MatchPointcutAction();
                break;
            case AopActions_1.AopActions.invokeBeforeConstructorAdvices:
                action = new actions.InvokeBeforeConstructorAction();
                break;
            case AopActions_1.AopActions.invokeAfterConstructorAdvices:
                action = new actions.InvokeAfterConstructorAction();
                break;
            case AopActions_1.AopActions.bindMethodPointcut:
                action = new actions.BindMethodPointcutAction();
                break;
            // case AopActions.bindPropertyPointcut:
            //     action = new BindPropertyPointcutAction();
            //     break;
            case AopActions_1.AopActions.exetndsInstance:
                action = new actions.ExetndsInstanceAction();
                break;
        }
        return action;
    }
}
AopActionFactory.classAnnations = { "name": "AopActionFactory", "params": { "create": ["type"] } };
exports.AopActionFactory = AopActionFactory;




});

unwrapExports(AopActionFactory_1);
var AopActionFactory_2 = AopActionFactory_1.AopActionFactory;

var ExetndsInstanceAction_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });


/**
 * extends instance action.
 *
 * @export
 * @class ExetndsInstanceAction
 * @extends {ActionComposite}
 */
class ExetndsInstanceAction extends core_1.ActionComposite {
    constructor() {
        super(AopActions_1.AopActions.registAspect);
    }
    working(container, data) {
        // aspect class do nothing.
        if (!data.target || !data.providers || data.providers.length < 1) {
            return;
        }
        data.providers.forEach(p => {
            if (p && p instanceof core_1.ExtendsProvider) {
                p.extends(data.target);
            }
        });
    }
}
ExetndsInstanceAction.classAnnations = { "name": "ExetndsInstanceAction", "params": { "constructor": [], "working": ["container", "data"] } };
exports.ExetndsInstanceAction = ExetndsInstanceAction;




});

unwrapExports(ExetndsInstanceAction_1);
var ExetndsInstanceAction_2 = ExetndsInstanceAction_1.ExetndsInstanceAction;

var actions = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

tslib_1.__exportStar(AopActions_1, exports);
tslib_1.__exportStar(RegistAspectAction_1, exports);
tslib_1.__exportStar(BindMethodPointcutAction_1, exports);
tslib_1.__exportStar(InvokeBeforeConstructorAction_1, exports);
tslib_1.__exportStar(InvokeAfterConstructorAction_1, exports);
// export * from './BindPropertyPointcutAction';
tslib_1.__exportStar(MatchPointcutAction_1, exports);
tslib_1.__exportStar(AopActionFactory_1, exports);
tslib_1.__exportStar(ExetndsInstanceAction_1, exports);




});

unwrapExports(actions);

var Advisor_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });




/**
 * for global aop advisor.
 *
 * @export
 * @class Advisor
 */
let Advisor = class Advisor {
    constructor() {
        this.aspects = new core_1.MapSet();
        this.aspectIocs = new core_1.MapSet();
        this.advices = new core_1.MapSet();
    }
    setAdvices(key, advices) {
        if (!this.advices.has(key)) {
            this.advices.set(key, advices);
        }
    }
    getAdvices(key) {
        if (!this.advices.has(key)) {
            return null;
        }
        return this.advices.get(key);
    }
    hasRegisterAdvices(targetType) {
        let methods = core_1.lang.keys(Object.getOwnPropertyDescriptors(targetType.prototype));
        let className = core_1.getClassName(targetType);
        return methods.some(m => this.advices.has(`${className}.${m}`));
    }
    add(aspect, raiseContainer) {
        if (!this.aspects.has(aspect)) {
            let metas = core_1.getOwnMethodMetadata(decorators.Advice, aspect);
            this.aspects.set(aspect, metas);
            this.aspectIocs.set(aspect, raiseContainer);
        }
    }
    getContainer(aspect, defaultContainer) {
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
    resolve(aspect, ...providers) {
        if (this.aspectIocs.has(aspect)) {
            return this.aspectIocs.get(aspect).resolve(aspect, ...providers);
        }
        return null;
    }
};
Advisor.classAnnations = { "name": "Advisor", "params": { "constructor": [], "setAdvices": ["key", "advices"], "getAdvices": ["key"], "hasRegisterAdvices": ["targetType"], "add": ["aspect", "raiseContainer"], "getContainer": ["aspect", "defaultContainer"], "resolve": ["aspect", "providers"] } };
Advisor = tslib_1.__decorate([
    decorators.NonePointcut(),
    core_1.Singleton(IAdvisor.AdvisorToken),
    tslib_1.__metadata("design:paramtypes", [])
], Advisor);
exports.Advisor = Advisor;




});

unwrapExports(Advisor_1);
var Advisor_2 = Advisor_1.Advisor;

var AdviceMatcher_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });




/**
 * advice matcher, use to match advice when a registered create instance.
 *
 * @export
 * @class AdviceMatcher
 * @implements {IAdviceMatcher}
 */
let AdviceMatcher = class AdviceMatcher {
    constructor(container) {
        this.container = container;
    }
    match(aspectType, targetType, adviceMetas, target) {
        let aspectMeta = core_1.lang.first(core_1.getOwnTypeMetadata(decorators.Aspect, aspectType));
        if (aspectMeta) {
            if (aspectMeta.within) {
                let ins = core_1.isArray(aspectMeta.within) ? aspectMeta.within : [aspectMeta.within];
                if (ins.indexOf(targetType) < 0) {
                    return [];
                }
            }
            if (aspectMeta.annotation) {
                let annotation = core_1.isFunction(aspectMeta.annotation) ? aspectMeta.annotation.toString() : aspectMeta.annotation;
                let anno = (/^\^?@\w+/.test(annotation) ? '' : '@') + annotation;
                if (!core_1.hasOwnClassMetadata(anno, targetType)) {
                    return [];
                }
            }
        }
        let className = core_1.getClassName(targetType);
        adviceMetas = adviceMetas || core_1.getOwnMethodMetadata(decorators.Advice, targetType);
        // let advisor = this.container.get(AdvisorToken);
        let matched = [];
        if (targetType === aspectType) {
            let adviceNames = core_1.lang.keys(adviceMetas);
            if (adviceNames.length > 1) {
                let advices = [];
                adviceNames.forEach(n => {
                    advices = advices.concat(adviceMetas[n]);
                });
                adviceNames.forEach(n => {
                    advices.forEach(adv => {
                        if (adv.propertyKey !== n) {
                            if (this.matchAspectSelf(n, adv)) {
                                matched.push({
                                    name: n,
                                    fullName: `${className}.${n}`,
                                    advice: adv
                                });
                            }
                        }
                    });
                });
            }
        }
        else { // if (!advisor.hasRegisterAdvices(targetType)) {
            let points = [];
            let decorators$$2 = Object.getOwnPropertyDescriptors(targetType.prototype);
            // match method.
            for (let name in decorators$$2) {
                points.push({
                    name: name,
                    fullName: `${className}.${name}`
                });
            }
            let allmethods = core_1.getParamerterNames(targetType);
            core_1.lang.forIn(allmethods, (item, name) => {
                if (name === 'constructor') {
                    return;
                }
                if (core_1.isUndefined(decorators$$2[name])) {
                    points.push({
                        name: name,
                        fullName: `${className}.${name}`
                    });
                }
            });
            Object.getOwnPropertyNames(adviceMetas).forEach(name => {
                let advices = adviceMetas[name];
                advices.forEach(metadata => {
                    matched = matched.concat(this.filterPointcut(targetType, points, metadata));
                });
            });
        }
        return matched;
    }
    matchAspectSelf(name, metadata) {
        if (metadata.pointcut) {
            let pointcut = metadata.pointcut;
            if (core_1.isString(pointcut)) {
                if (/^execution\(\S+\)$/.test(pointcut)) {
                    pointcut = pointcut.substring(10, pointcut.length - 1);
                }
                return pointcut.startsWith(name);
            }
            else if (core_1.isRegExp(pointcut)) {
                return pointcut.test(name);
            }
        }
        return false;
    }
    filterPointcut(type, points, metadata, target) {
        if (!metadata.pointcut) {
            return [];
        }
        let matchedPointcut;
        if (metadata.pointcut) {
            let match = this.matchTypeFactory(type, metadata);
            matchedPointcut = points.filter(p => match(p.name, p.fullName, type, target, p));
        }
        matchedPointcut = matchedPointcut || [];
        return matchedPointcut.map(p => {
            return core_1.lang.assign({}, p, { advice: metadata });
        });
    }
    matchTypeFactory(type, metadata) {
        let pointcut = metadata.pointcut;
        let expresses = [];
        if (metadata.within) {
            expresses.push((method, fullName, targetType) => {
                if (core_1.isArray(metadata.within)) {
                    return metadata.within.indexOf(targetType) >= 0;
                }
                else {
                    return metadata.within === targetType;
                }
            });
            expresses.push('&&');
        }
        if (metadata.target) {
            expresses.push((method, fullName, targetType, target) => {
                return metadata.target = target;
            });
            expresses.push('&&');
        }
        if (metadata.annotation) {
            expresses.push((method, fullName, targetType, target) => {
                return core_1.hasOwnMethodMetadata(metadata.annotation, targetType, method);
            });
            expresses.push('&&');
        }
        if (core_1.isString(pointcut)) {
            let pointcuts = (pointcut || '').trim();
            expresses.push(this.tranlateExpress(type, pointcuts));
        }
        else if (core_1.isRegExp(pointcut)) {
            let pointcutReg = pointcut;
            if (/^\^?@\w+/.test(pointcutReg.source)) {
                expresses.push((name, fullName, targetType) => {
                    let decName = Reflect.getMetadataKeys(type, name);
                    return decName.some(n => core_1.isString(n) && pointcutReg.test(n));
                });
            }
            else {
                expresses.push((name, fullName) => pointcutReg.test(fullName));
            }
        }
        return this.mergeExpress(...expresses);
    }
    spiltBrace(strExp) {
        strExp = strExp.trim();
        if (/^\(/.test(strExp) && /\)$/.test(strExp)) {
            strExp = strExp.substring(1, strExp.length - 1).trim();
        }
        if (/^\(/.test(strExp) && /\)$/.test(strExp)) {
            return this.spiltBrace(strExp);
        }
        else {
            return strExp;
        }
    }
    expressToFunc(type, strExp) {
        if (/^@annotation\(.*\)$/.test(strExp)) {
            let exp = strExp.substring(12, strExp.length - 1);
            let annotation = /^@/.test(exp) ? exp : ('@' + exp);
            return (name, fullName) => core_1.hasOwnMethodMetadata(annotation, type, name) && !core_1.hasOwnClassMetadata(decorators.Aspect, type);
        }
        else if (/^execution\(.*\)$/.test(strExp)) {
            let exp = strExp.substring(10, strExp.length - 1);
            if (exp === '*' || exp === '*.*') {
                return (name, fullName) => !!name && !core_1.hasOwnClassMetadata(decorators.Aspect, type);
            }
            else if (/^\w+(\((\s*\w+\s*,)*\s*\w*\))?$/.test(exp)) {
                // if is method name, will match aspect self only.
                return () => false;
            }
            else if (/^([\w\*]+\.)+[\w\*]+(\((\s*\w+\s*,)*\s*\w*\))?$/.test(exp)) {
                exp = exp.replace(/\*\*/gi, '(\\\w+(\\\.|\\\/)){0,}\\\w+')
                    .replace(/\*/gi, '\\\w+')
                    .replace(/\./gi, '\\\.')
                    .replace(/\//gi, '\\\/');
                let matcher = new RegExp(exp + "$");
                return (name, fullName) => matcher.test(fullName);
            }
            else {
                return () => false;
            }
        }
        else if (/^@within\(\s*\w+/.test(strExp)) {
            let classnames = strExp.substring(strExp.indexOf('(') + 1, strExp.length - 1).split(',').map(n => n.trim());
            return (name, fullName, targetType) => classnames.indexOf(core_1.getClassName(targetType)) >= 0;
        }
        else if (/^@target\(\s*\w+/.test(strExp)) {
            let torken = strExp.substring(strExp.indexOf('(') + 1, strExp.length - 1).trim();
            return (name, fullName, targetType) => this.container.getTokenImpl(torken) === targetType;
        }
        else {
            return () => false;
        }
    }
    tranlateExpress(type, strExp) {
        let expresses = [];
        let idxOr = strExp.indexOf('||');
        let idxAd = strExp.indexOf('&&');
        if (idxAd < 0 && idxOr < 0) {
            expresses.push(this.expressToFunc(type, this.spiltBrace(strExp)));
        }
        else {
            if (idxOr > idxAd) {
                let leftExp = this.spiltBrace(strExp.substring(0, idxOr));
                if (leftExp) {
                    expresses.push(this.tranlateExpress(type, leftExp));
                }
                let rightExp = this.spiltBrace(strExp.substring(idxOr + 2));
                if (rightExp) {
                    expresses.push('||');
                    expresses.push(this.tranlateExpress(type, rightExp));
                }
            }
            else if (idxAd > idxOr) {
                let leftExp = this.spiltBrace(strExp.substring(0, idxAd));
                if (leftExp) {
                    expresses.push(this.tranlateExpress(type, leftExp));
                }
                let rightExp = this.spiltBrace(strExp.substring(idxAd + 2));
                if (rightExp) {
                    expresses.push('&&');
                    expresses.push(this.tranlateExpress(type, rightExp));
                }
            }
        }
        return this.mergeExpress(...expresses);
    }
    mergeExpress(...expresses) {
        return (method, fullName, targetType, pointcut) => {
            let flag;
            expresses.forEach((express, idx) => {
                if (!core_1.isUndefined(flag)) {
                    return;
                }
                if (core_1.isFunction(express)) {
                    let rel = express(method, fullName, targetType, pointcut);
                    if (idx < expresses.length - 2) {
                        if (!rel && express[idx + 1] === '&&') {
                            flag = false;
                        }
                        if (rel && express[idx + 1] === '||') {
                            flag = true;
                        }
                    }
                    else {
                        flag = rel;
                    }
                }
            });
            return flag;
        };
    }
};
AdviceMatcher.classAnnations = { "name": "AdviceMatcher", "params": { "constructor": ["container"], "match": ["aspectType", "targetType", "adviceMetas", "target"], "matchAspectSelf": ["name", "metadata"], "filterPointcut": ["type", "points", "metadata", "target"], "matchTypeFactory": ["type", "metadata"], "spiltBrace": ["strExp"], "expressToFunc": ["type", "strExp"], "tranlateExpress": ["type", "strExp"], "mergeExpress": ["expresses"] } };
AdviceMatcher = tslib_1.__decorate([
    decorators.NonePointcut(),
    core_1.Singleton(IAdviceMatcher.AdviceMatcherToken),
    tslib_1.__param(0, core_1.Inject(core_1.ContainerToken)),
    tslib_1.__metadata("design:paramtypes", [Object])
], AdviceMatcher);
exports.AdviceMatcher = AdviceMatcher;




});

unwrapExports(AdviceMatcher_1);
var AdviceMatcher_2 = AdviceMatcher_1.AdviceMatcher;

var AopModule_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });









/**
 * aop ext for ioc. auto run setup after registered.
 * with @IocExt('setup') decorator.
 * @export
 * @class AopModule
 */
let AopModule = class AopModule {
    constructor(container) {
        this.container = container;
    }
    /**
     * register aop for container.
     *
     * @memberof AopModule
     */
    setup() {
        let container = this.container;
        container.register(joinpoints.Joinpoint);
        container.register(access.AdvisorChainFactory);
        container.register(access.ReturningRecognizer);
        container.register(access.SyncProceeding);
        container.register(access.AsyncPromiseProceeding);
        container.register(access.AsyncObservableProceeding);
        container.register(access.AdvisorChain);
        container.register(access.ProxyMethod);
        container.register(Advisor_1.Advisor);
        container.register(AdviceMatcher_1.AdviceMatcher);
        let lifeScope = container.get(core_1.LifeScopeToken);
        let factory = new AopActionFactory_1.AopActionFactory();
        lifeScope.addAction(factory.create(actions.AopActions.registAspect), core_1.IocState.design);
        lifeScope.addAction(factory.create(actions.AopActions.matchPointcut), core_1.IocState.runtime, core_1.LifeState.beforeConstructor);
        lifeScope.addAction(factory.create(actions.AopActions.bindMethodPointcut), core_1.IocState.runtime, core_1.LifeState.AfterInit);
        lifeScope.addAction(factory.create(actions.AopActions.invokeBeforeConstructorAdvices), core_1.IocState.runtime, core_1.LifeState.beforeConstructor);
        lifeScope.addAction(factory.create(actions.AopActions.exetndsInstance), core_1.IocState.runtime, core_1.LifeState.onInit, core_1.LifeState.afterConstructor);
        lifeScope.addAction(factory.create(actions.AopActions.invokeAfterConstructorAdvices), core_1.IocState.runtime, core_1.LifeState.afterConstructor);
        lifeScope.registerDecorator(decorators.Aspect, actions.AopActions.registAspect, actions.AopActions.exetndsInstance);
    }
};
AopModule.classAnnations = { "name": "AopModule", "params": { "constructor": ["container"], "setup": [] } };
AopModule = tslib_1.__decorate([
    core_1.IocExt('setup'),
    tslib_1.__param(0, core_1.Inject(core_1.ContainerToken)),
    tslib_1.__metadata("design:paramtypes", [Object])
], AopModule);
exports.AopModule = AopModule;




});

unwrapExports(AopModule_1);
var AopModule_2 = AopModule_1.AopModule;

var D__workspace_github_tsioc_packages_aop_esnext = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

tslib_1.__exportStar(actions, exports);
tslib_1.__exportStar(decorators, exports);
tslib_1.__exportStar(joinpoints, exports);
tslib_1.__exportStar(access, exports);
tslib_1.__exportStar(IAdvisor, exports);
tslib_1.__exportStar(Advisor_1, exports);
tslib_1.__exportStar(AdviceMatcher_1, exports);
tslib_1.__exportStar(isValideAspectTarget_1, exports);
tslib_1.__exportStar(AopModule_1, exports);




});

var index$4 = unwrapExports(D__workspace_github_tsioc_packages_aop_esnext);

module.exports = index$4;

//# sourceMappingURL=sourcemaps/aop.js.map

//# sourceMappingURL=sourcemaps/aop.js.map
