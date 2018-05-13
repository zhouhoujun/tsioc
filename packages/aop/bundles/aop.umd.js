(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('@ts-ioc/core')) :
	typeof define === 'function' && define.amd ? define(['@ts-ioc/core'], factory) :
	(global.aop = global.aop || {}, global.aop.umd = global.aop.umd || {}, global.aop.umd.js = factory(global['@ts-ioc/core']));
}(this, (function (core_1) { 'use strict';

core_1 = core_1 && core_1.hasOwnProperty('default') ? core_1['default'] : core_1;

var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};



function unwrapExports (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var symbols = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * symboles of aop.
 */
exports.AopSymbols = {
    /**
     * Aop proxy method interface symbol.
     * it is a symbol id, you can register yourself IProxyMethod for this.
     */
    IProxyMethod: Symbol('IProxyMethod'),
    /**
     * Aop advice matcher interface symbol.
     * it is a symbol id, you can register yourself IActionBuilder for this.
     */
    IAdviceMatcher: Symbol('IAdviceMatcher'),
    /**
     * Aop IAdvisor interface symbol.
     * it is a symbol id, you can register yourself IAdvisor for this.
     */
    IAdvisor: Symbol('IAdvisor'),
    /**
     * Aop IAdvisorChainFactory interface symbol.
     * it is a symbol id, you can register yourself IAdvisorChainFactory for this.
     */
    IAdvisorChainFactory: Symbol('IAdvisorChainFactory'),
    /**
     * Aop IAdvisorChain interface symbol.
     * it is a symbol id, you can register yourself IAdvisorChain for this.
     */
    IAdvisorChain: Symbol('IAdvisorChain'),
    /**
     * Aop IAdvisorProceeding interface symbol.
     * it is a symbol id, you can register yourself IAdvisorProceeding for this.
     */
    IAdvisorProceeding: Symbol('IAdvisorProceeding'),
    /**
     * joinpoint symbol.
     */
    IJoinpoint: Symbol('IJoinpoint')
};


});

unwrapExports(symbols);
var symbols_1 = symbols.AopSymbols;

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

var RegistAspectAction_1 = createCommonjsModule(function (module, exports) {
var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });



/**
 * regist aspect action.
 *
 * @export
 * @class RegistAspectAction
 * @extends {ActionComposite}
 */
var RegistAspectAction = /** @class */ (function (_super) {
    __extends(RegistAspectAction, _super);
    function RegistAspectAction() {
        return _super.call(this, AopActions_1.AopActions.registAspect) || this;
    }
    RegistAspectAction.prototype.working = function (container, data) {
        var type = data.targetType;
        var propertyKey = data.propertyKey;
        var lifeScope = container.getLifeScope();
        var matchs = lifeScope.getClassDecorators(function (surm) { return surm.actions.includes(AopActions_1.AopActions.registAspect) && core_1.hasOwnClassMetadata(surm.name, type); });
        var aspectMgr = container.get(symbols.AopSymbols.IAdvisor);
        matchs.forEach(function (surm) {
            var metadata = core_1.getOwnTypeMetadata(surm.name, type);
            if (Array.isArray(metadata) && metadata.length > 0) {
                metadata.forEach(function (meta) {
                    if (core_1.isClass(meta.type)) {
                        aspectMgr.add(meta.type);
                    }
                });
            }
        });
    };
    RegistAspectAction.classAnnations = { "name": "RegistAspectAction", "params": { "constructor": [], "working": ["container", "data"] } };
    return RegistAspectAction;
}(core_1.ActionComposite));
exports.RegistAspectAction = RegistAspectAction;


});

unwrapExports(RegistAspectAction_1);
var RegistAspectAction_2 = RegistAspectAction_1.RegistAspectAction;

var Advice = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

function createAdviceDecorator(adviceName, adapter, afterPointcutAdapter, metadataExtends) {
    return core_1.createMethodDecorator('Advice', function (args) {
        if (adapter) {
            adapter(args);
        }
        args.next({
            isMetadata: function (arg) { return core_1.isClassMetadata(arg, ['pointcut']); },
            match: function (arg) { return core_1.isString(arg) || core_1.isRegExp(arg); },
            setMetadata: function (metadata, arg) {
                metadata.pointcut = arg;
            }
        });
        if (afterPointcutAdapter) {
            afterPointcutAdapter(args);
        }
        args.next({
            match: function (arg) { return core_1.isString(arg); },
            setMetadata: function (metadata, arg) {
                metadata.annotationArgName = arg;
            }
        });
        args.next({
            match: function (arg) { return core_1.isString(arg); },
            setMetadata: function (metadata, arg) {
                metadata.annotation = arg;
            }
        });
    }, function (metadata) {
        if (metadataExtends) {
            metadata = metadataExtends(metadata);
        }
        metadata.adviceName = adviceName;
        return metadata;
    });
}
exports.createAdviceDecorator = createAdviceDecorator;
exports.Advice = createAdviceDecorator('Advice');


});

unwrapExports(Advice);
var Advice_1 = Advice.createAdviceDecorator;
var Advice_2 = Advice.Advice;

var Aspect = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * Aspect decorator and metadata. define aspect class. I's auto a singleton.
 *
 * @Aspect
 */
exports.Aspect = core_1.createClassDecorator('Aspect');


});

unwrapExports(Aspect);
var Aspect_1 = Aspect.Aspect;

var After = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

exports.After = Advice.createAdviceDecorator('After');


});

unwrapExports(After);
var After_1 = After.After;

var AfterReturning = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });


exports.AfterReturning = Advice.createAdviceDecorator('AfterReturning', null, function (args) {
    args.next({
        match: function (arg) { return core_1.isString(arg); },
        setMetadata: function (metadata, arg) {
            metadata.returning = arg;
        }
    });
});


});

unwrapExports(AfterReturning);
var AfterReturning_1 = AfterReturning.AfterReturning;

var AfterThrowing = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });


exports.AfterThrowing = Advice.createAdviceDecorator('AfterThrowing', null, function (args) {
    args.next({
        match: function (arg) { return core_1.isString(arg); },
        setMetadata: function (metadata, arg) {
            metadata.throwing = arg;
        }
    });
});


});

unwrapExports(AfterThrowing);
var AfterThrowing_1 = AfterThrowing.AfterThrowing;

var Around = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });


exports.Around = Advice.createAdviceDecorator('Around', null, function (args) {
    args.next({
        match: function (arg) { return core_1.isString(arg); },
        setMetadata: function (metadata, arg) {
            metadata.args = arg;
        }
    });
    args.next({
        match: function (arg) { return core_1.isString(arg); },
        setMetadata: function (metadata, arg) {
            metadata.returning = arg;
        }
    });
    args.next({
        match: function (arg) { return core_1.isString(arg); },
        setMetadata: function (metadata, arg) {
            metadata.throwing = arg;
        }
    });
});


});

unwrapExports(Around);
var Around_1 = Around.Around;

var Before = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

exports.Before = Advice.createAdviceDecorator('Before');


});

unwrapExports(Before);
var Before_1 = Before.Before;

var Pointcut = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

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
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(Advice);
__export(Aspect);
__export(After);
__export(AfterReturning);
__export(AfterThrowing);
__export(Around);
__export(Before);
__export(Pointcut);
__export(NonePointcut);


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

var BindMethodPointcutAction_1 = createCommonjsModule(function (module, exports) {
var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });




/**
 * bind method pointcut action.
 *
 * @export
 * @class BindMethodPointcutAction
 * @extends {ActionComposite}
 */
var BindMethodPointcutAction = /** @class */ (function (_super) {
    __extends(BindMethodPointcutAction, _super);
    function BindMethodPointcutAction() {
        return _super.call(this, AopActions_1.AopActions.bindMethodPointcut) || this;
    }
    BindMethodPointcutAction.prototype.working = function (container, data) {
        // aspect class do nothing.
        if (!data.target || !isValideAspectTarget_1.isValideAspectTarget(data.targetType)) {
            return;
        }
        var proxy = container.get(symbols.AopSymbols.IProxyMethod);
        var target = data.target;
        var targetType = data.targetType;
        var className = core_1.getClassName(targetType);
        var methods = [];
        var decorators = Object.getOwnPropertyDescriptors(targetType.prototype);
        core_1.lang.forIn(decorators, function (item, name) {
            if (name === 'constructor') {
                return;
            }
            methods.push({
                name: name,
                fullName: className + "." + name,
                descriptor: item
            });
        });
        var allmethods = core_1.getParamerterNames(targetType);
        core_1.lang.forIn(allmethods, function (item, name) {
            if (name === 'constructor') {
                return;
            }
            if (core_1.isUndefined(decorators[name])) {
                methods.push({
                    name: name,
                    fullName: className + "." + name
                });
            }
        });
        methods.forEach(function (pointcut) {
            proxy.proceed(target, targetType, pointcut, target['_cache_JoinPoint']);
        });
    };
    BindMethodPointcutAction.classAnnations = { "name": "BindMethodPointcutAction", "params": { "constructor": [], "working": ["container", "data"] } };
    return BindMethodPointcutAction;
}(core_1.ActionComposite));
exports.BindMethodPointcutAction = BindMethodPointcutAction;


});

unwrapExports(BindMethodPointcutAction_1);
var BindMethodPointcutAction_2 = BindMethodPointcutAction_1.BindMethodPointcutAction;

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

var Joinpoint_1 = createCommonjsModule(function (module, exports) {
var __decorate = (commonjsGlobal && commonjsGlobal.__decorate) || function (decorators$$2, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators$$2, target, key, desc);
    else for (var i = decorators$$2.length - 1; i >= 0; i--) if (d = decorators$$2[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (commonjsGlobal && commonjsGlobal.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });



/**
 * Join point data.
 *
 * @export
 * @class Joinpoint
 * @implements {IJoinpoint}
 */
var Joinpoint = /** @class */ (function () {
    function Joinpoint(options) {
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
    Joinpoint.classAnnations = { "name": "Joinpoint", "params": { "constructor": ["options"] } };
    Joinpoint = __decorate([
        core_1.Injectable(symbols.AopSymbols.IJoinpoint),
        decorators.NonePointcut(),
        __metadata("design:paramtypes", [Object])
    ], Joinpoint);
    return Joinpoint;
}());
exports.Joinpoint = Joinpoint;


});

unwrapExports(Joinpoint_1);
var Joinpoint_2 = Joinpoint_1.Joinpoint;

var joinpoints = createCommonjsModule(function (module, exports) {
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(JoinpointState_1);
__export(Joinpoint_1);


});

unwrapExports(joinpoints);

var InvokeBeforeConstructorAction_1 = createCommonjsModule(function (module, exports) {
var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });





/**
 * actions invoke before constructor.
 *
 * @export
 * @class InvokeBeforeConstructorAction
 * @extends {ActionComposite}
 */
var InvokeBeforeConstructorAction = /** @class */ (function (_super) {
    __extends(InvokeBeforeConstructorAction, _super);
    function InvokeBeforeConstructorAction() {
        return _super.call(this, AopActions_1.AopActions.registAspect) || this;
    }
    InvokeBeforeConstructorAction.prototype.working = function (container, data) {
        // aspect class do nothing.
        if (!isValideAspectTarget_1.isValideAspectTarget(data.targetType)) {
            return;
        }
        var advisor = container.get(symbols.AopSymbols.IAdvisor);
        var className = core_1.getClassName(data.targetType);
        var advices = advisor.getAdvices(className + '.constructor');
        if (!advices) {
            return;
        }
        var targetType = data.targetType;
        var target = data.target;
        var joinPoint = container.resolve(joinpoints.Joinpoint, core_1.Provider.create('options', {
            name: 'constructor',
            state: joinpoints.JoinpointState.Before,
            fullName: className + '.constructor',
            target: target,
            args: data.args,
            targetType: targetType
        }));
        var providers = [core_1.Provider.create(joinpoints.Joinpoint, joinPoint)];
        var access = container.get(core_1.symbols.IMethodAccessor);
        advices.Before.forEach(function (advicer) {
            access.syncInvoke.apply(access, [advicer.aspectType, advicer.advice.propertyKey, undefined].concat(providers)); // new Joinpoint(joinPoint) // container.resolve(Joinpoint, { json: joinPoint })
        });
        advices.Around.forEach(function (advicer) {
            access.syncInvoke.apply(access, [advicer.aspectType, advicer.advice.propertyKey, undefined].concat(providers));
        });
    };
    InvokeBeforeConstructorAction.classAnnations = { "name": "InvokeBeforeConstructorAction", "params": { "constructor": [], "working": ["container", "data"] } };
    return InvokeBeforeConstructorAction;
}(core_1.ActionComposite));
exports.InvokeBeforeConstructorAction = InvokeBeforeConstructorAction;


});

unwrapExports(InvokeBeforeConstructorAction_1);
var InvokeBeforeConstructorAction_2 = InvokeBeforeConstructorAction_1.InvokeBeforeConstructorAction;

var InvokeAfterConstructorAction_1 = createCommonjsModule(function (module, exports) {
var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });





/**
 * invoke after constructor action.
 *
 * @export
 * @class InvokeAfterConstructorAction
 * @extends {ActionComposite}
 */
var InvokeAfterConstructorAction = /** @class */ (function (_super) {
    __extends(InvokeAfterConstructorAction, _super);
    function InvokeAfterConstructorAction() {
        return _super.call(this, AopActions_1.AopActions.invokeAfterConstructorAdvices) || this;
    }
    InvokeAfterConstructorAction.prototype.working = function (container, data) {
        // aspect class do nothing.
        if (!data.target || !isValideAspectTarget_1.isValideAspectTarget(data.targetType)) {
            return;
        }
        var advisor = container.get(symbols.AopSymbols.IAdvisor);
        var className = core_1.getClassName(data.targetType);
        var advices = advisor.getAdvices(className + '.constructor');
        if (!advices) {
            return;
        }
        var targetType = data.targetType;
        var target = data.target;
        var joinPoint = container.resolve(joinpoints.Joinpoint, core_1.Provider.create('options', {
            name: 'constructor',
            state: joinpoints.JoinpointState.After,
            fullName: className + '.constructor',
            target: target,
            args: data.args,
            targetType: targetType
        }));
        var providers = [core_1.Provider.create(joinpoints.Joinpoint, joinPoint)];
        var access = container.get(core_1.symbols.IMethodAccessor);
        advices.After.forEach(function (advicer) {
            access.syncInvoke.apply(access, [advicer.aspectType, advicer.advice.propertyKey, undefined].concat(providers));
        });
        advices.Around.forEach(function (advicer) {
            access.syncInvoke.apply(access, [advicer.aspectType, advicer.advice.propertyKey, undefined].concat(providers));
        });
    };
    InvokeAfterConstructorAction.classAnnations = { "name": "InvokeAfterConstructorAction", "params": { "constructor": [], "working": ["container", "data"] } };
    return InvokeAfterConstructorAction;
}(core_1.ActionComposite));
exports.InvokeAfterConstructorAction = InvokeAfterConstructorAction;


});

unwrapExports(InvokeAfterConstructorAction_1);
var InvokeAfterConstructorAction_2 = InvokeAfterConstructorAction_1.InvokeAfterConstructorAction;

var MatchPointcutAction_1 = createCommonjsModule(function (module, exports) {
var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });




/**
 *  match pointcut action.
 *
 * @export
 * @class MatchPointcutAction
 * @extends {ActionComposite}
 */
var MatchPointcutAction = /** @class */ (function (_super) {
    __extends(MatchPointcutAction, _super);
    function MatchPointcutAction() {
        return _super.call(this, AopActions_1.AopActions.matchPointcut) || this;
    }
    MatchPointcutAction.prototype.working = function (container, data) {
        var _this = this;
        // aspect class do nothing.
        if (!isValideAspectTarget_1.isValideAspectTarget(data.targetType)) {
            return;
        }
        var advisor = container.get(symbols.AopSymbols.IAdvisor);
        var matcher = container.get(symbols.AopSymbols.IAdviceMatcher);
        advisor.aspects.forEach(function (adviceMetas, type) {
            var matchpoints = matcher.match(type, data.targetType, adviceMetas);
            matchpoints.forEach(function (mpt) {
                var fullName = mpt.fullName;
                var advice = mpt.advice;
                var advices = advisor.getAdvices(fullName);
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
                var advicer = core_1.lang.assign(mpt, {
                    aspectType: type
                });
                if (advice.adviceName === 'Before') {
                    if (!advices.Before.some(function (a) { return _this.isAdviceEquals(a.advice, advice); })) {
                        advices.Before.push(advicer);
                    }
                }
                else if (advice.adviceName === 'Pointcut') {
                    if (!advices.Pointcut.some(function (a) { return _this.isAdviceEquals(a.advice, advice); })) {
                        advices.Pointcut.push(advicer);
                    }
                }
                else if (advice.adviceName === 'Around') {
                    if (!advices.Around.some(function (a) { return _this.isAdviceEquals(a.advice, advice); })) {
                        advices.Around.push(advicer);
                    }
                }
                else if (advice.adviceName === 'After') {
                    if (!advices.After.some(function (a) { return _this.isAdviceEquals(a.advice, advice); })) {
                        advices.After.push(advicer);
                    }
                }
                else if (advice.adviceName === 'AfterThrowing') {
                    if (!advices.AfterThrowing.some(function (a) { return _this.isAdviceEquals(a.advice, advice); })) {
                        advices.AfterThrowing.push(advicer);
                    }
                }
                else if (advice.adviceName === 'AfterReturning') {
                    if (!advices.AfterReturning.some(function (a) { return _this.isAdviceEquals(a.advice, advice); })) {
                        advices.AfterReturning.push(advicer);
                    }
                }
            });
        });
    };
    MatchPointcutAction.prototype.isAdviceEquals = function (advice1, advice2) {
        if (!advice1 || !advice2) {
            return false;
        }
        if (advice1 === advice2) {
            return true;
        }
        return advice1.adviceName === advice2.adviceName
            && advice1.pointcut === advice2.pointcut
            && advice1.propertyKey === advice2.propertyKey;
    };
    MatchPointcutAction.classAnnations = { "name": "MatchPointcutAction", "params": { "constructor": [], "working": ["container", "data"], "isAdviceEquals": ["advice1", "advice2"] } };
    return MatchPointcutAction;
}(core_1.ActionComposite));
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
var AopActionFactory = /** @class */ (function () {
    function AopActionFactory() {
    }
    AopActionFactory.prototype.create = function (type) {
        var action;
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
    };
    AopActionFactory.classAnnations = { "name": "AopActionFactory", "params": { "create": ["type"] } };
    return AopActionFactory;
}());
exports.AopActionFactory = AopActionFactory;


});

unwrapExports(AopActionFactory_1);
var AopActionFactory_2 = AopActionFactory_1.AopActionFactory;

var ExetndsInstanceAction_1 = createCommonjsModule(function (module, exports) {
var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });


/**
 * extends instance action.
 *
 * @export
 * @class ExetndsInstanceAction
 * @extends {ActionComposite}
 */
var ExetndsInstanceAction = /** @class */ (function (_super) {
    __extends(ExetndsInstanceAction, _super);
    function ExetndsInstanceAction() {
        return _super.call(this, AopActions_1.AopActions.registAspect) || this;
    }
    ExetndsInstanceAction.prototype.working = function (container, data) {
        // aspect class do nothing.
        if (!data.target || !data.providers || data.providers.length < 1) {
            return;
        }
        data.providers.forEach(function (p) {
            if (p && p instanceof core_1.ExtendsProvider) {
                p.extends(data.target);
            }
        });
    };
    ExetndsInstanceAction.classAnnations = { "name": "ExetndsInstanceAction", "params": { "constructor": [], "working": ["container", "data"] } };
    return ExetndsInstanceAction;
}(core_1.ActionComposite));
exports.ExetndsInstanceAction = ExetndsInstanceAction;


});

unwrapExports(ExetndsInstanceAction_1);
var ExetndsInstanceAction_2 = ExetndsInstanceAction_1.ExetndsInstanceAction;

var actions = createCommonjsModule(function (module, exports) {
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(AopActions_1);
__export(RegistAspectAction_1);
__export(BindMethodPointcutAction_1);
__export(InvokeBeforeConstructorAction_1);
__export(InvokeAfterConstructorAction_1);
// export * from './BindPropertyPointcutAction';
__export(MatchPointcutAction_1);
__export(AopActionFactory_1);
__export(ExetndsInstanceAction_1);


});

unwrapExports(actions);

var AdvisorChainFactory_1 = createCommonjsModule(function (module, exports) {
var __decorate = (commonjsGlobal && commonjsGlobal.__decorate) || function (decorators$$2, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators$$2, target, key, desc);
    else for (var i = decorators$$2.length - 1; i >= 0; i--) if (d = decorators$$2[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (commonjsGlobal && commonjsGlobal.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (commonjsGlobal && commonjsGlobal.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });




var AdvisorChainFactory = /** @class */ (function () {
    function AdvisorChainFactory(container, advices) {
        this.container = container;
        this.advices = advices;
    }
    AdvisorChainFactory.prototype.getAdvicers = function (adviceType) {
        return (adviceType ? this.advices[adviceType] : null) || [];
    };
    AdvisorChainFactory.prototype.invoaction = function (joinPoint, state, valueOrthrowing) {
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
    };
    AdvisorChainFactory.prototype.before = function (joinPoint) {
        var _this = this;
        var cloneJp = core_1.lang.assign({}, joinPoint);
        this.getAdvicers('Around')
            .forEach(function (advicer) {
            _this.invokeAdvice(cloneJp, advicer);
        });
        if (!core_1.isUndefined(cloneJp.args)) {
            joinPoint.args = cloneJp.args;
        }
        this.getAdvicers('Before')
            .forEach(function (advicer) {
            _this.invokeAdvice(cloneJp, advicer);
        });
    };
    AdvisorChainFactory.prototype.pointcut = function (joinPoint) {
        var _this = this;
        var cloneJp = core_1.lang.assign({}, joinPoint);
        this.getAdvicers('Pointcut')
            .forEach(function (advicer) {
            _this.invokeAdvice(cloneJp, advicer);
        });
        if (!core_1.isUndefined(cloneJp.args)) {
            joinPoint.args = cloneJp.args;
        }
    };
    AdvisorChainFactory.prototype.after = function (joinPoint) {
        var _this = this;
        var cloneJp = core_1.lang.assign({}, joinPoint);
        this.getAdvicers('Around')
            .forEach(function (advicer) {
            _this.invokeAdvice(cloneJp, advicer);
        });
        this.getAdvicers('After')
            .forEach(function (advicer) {
            _this.invokeAdvice(cloneJp, advicer);
        });
    };
    AdvisorChainFactory.prototype.afterThrowing = function (joinPoint) {
        var _this = this;
        var cloneJp = core_1.lang.assign({}, joinPoint);
        this.getAdvicers('Around')
            .forEach(function (advicer) {
            _this.invokeAdvice(cloneJp, advicer);
        });
        this.getAdvicers('AfterThrowing')
            .forEach(function (advicer) {
            _this.invokeAdvice(cloneJp, advicer);
        });
    };
    AdvisorChainFactory.prototype.afterReturning = function (joinPoint) {
        var _this = this;
        var cloneJp = core_1.lang.assign({}, joinPoint);
        var advChain = this.container.resolve(symbols.AopSymbols.IAdvisorChain, { joinPoint: cloneJp });
        this.getAdvicers('Around')
            .forEach(function (advicer) {
            advChain.next(function (jp) {
                return _this.invokeAdvice(jp, advicer);
            });
        });
        this.getAdvicers('AfterReturning')
            .forEach(function (advicer) {
            advChain.next(function (jp) {
                return _this.invokeAdvice(jp, advicer);
            });
        });
        advChain.next(function (jp) {
            if (!core_1.isUndefined(jp.returning)) {
                joinPoint.returning = jp.returning;
            }
            return joinPoint;
        });
        advChain.process();
    };
    AdvisorChainFactory.prototype.invokeAdvice = function (joinPoint, advicer) {
        var _this = this;
        var providers = [];
        providers.push(core_1.Provider.createExtends(joinpoints.Joinpoint, joinPoint, function (inst, provider) {
            inst._cache_JoinPoint = provider.resolve(_this.container);
        }));
        var metadata = advicer.advice;
        if (!core_1.isUndefined(joinPoint.args) && metadata.args) {
            providers.push(core_1.Provider.create(metadata.args, joinPoint.args));
        }
        if (metadata.annotationArgName) {
            providers.push(core_1.Provider.create(metadata.annotationArgName, function () {
                var curj = joinPoint;
                var annotations = curj.annotations;
                while (!annotations && joinPoint.provJoinpoint) {
                    curj = joinPoint.provJoinpoint;
                    if (curj && curj.annotations) {
                        annotations = curj.annotations;
                        break;
                    }
                }
                if (core_1.isArray(annotations)) {
                    if (metadata.annotation) {
                        var d_1 = metadata.annotation;
                        d_1 = /^@/.test(d_1) ? d_1 : "@" + d_1;
                        return annotations.filter(function (a) { return a.decorator === d_1; });
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
        return (_a = this.container).syncInvoke.apply(_a, [advicer.aspectType, advicer.advice.propertyKey, null].concat(providers));
        var _a;
    };
    AdvisorChainFactory.classAnnations = { "name": "AdvisorChainFactory", "params": { "constructor": ["container", "advices"], "getAdvicers": ["adviceType"], "invoaction": ["joinPoint", "state", "valueOrthrowing"], "before": ["joinPoint"], "pointcut": ["joinPoint"], "after": ["joinPoint"], "afterThrowing": ["joinPoint"], "afterReturning": ["joinPoint"], "invokeAdvice": ["joinPoint", "advicer"] } };
    AdvisorChainFactory = __decorate([
        decorators.NonePointcut(),
        core_1.Injectable(symbols.AopSymbols.IAdvisorChainFactory),
        __param(0, core_1.Inject(core_1.symbols.IContainer)),
        __metadata("design:paramtypes", [Object, Object])
    ], AdvisorChainFactory);
    return AdvisorChainFactory;
}());
exports.AdvisorChainFactory = AdvisorChainFactory;


});

unwrapExports(AdvisorChainFactory_1);
var AdvisorChainFactory_2 = AdvisorChainFactory_1.AdvisorChainFactory;

var AdvisorChain_1 = createCommonjsModule(function (module, exports) {
var __decorate = (commonjsGlobal && commonjsGlobal.__decorate) || function (decorators$$2, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators$$2, target, key, desc);
    else for (var i = decorators$$2.length - 1; i >= 0; i--) if (d = decorators$$2[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (commonjsGlobal && commonjsGlobal.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });




var AdvisorChain = /** @class */ (function () {
    function AdvisorChain(joinPoint) {
        this.joinPoint = joinPoint;
        this.actions = [];
    }
    AdvisorChain.prototype.next = function (action) {
        this.actions.push(action);
    };
    AdvisorChain.prototype.getRecognizer = function () {
        return this.container.get(core_1.symbols.IRecognizer, this.joinPoint.state);
    };
    AdvisorChain.prototype.process = function () {
        var alias = this.getRecognizer().recognize(this.joinPoint.returning);
        (_a = this.container.get(symbols.AopSymbols.IAdvisorProceeding, alias)).proceeding.apply(_a, [this.joinPoint].concat(this.actions));
        var _a;
    };
    AdvisorChain.classAnnations = { "name": "AdvisorChain", "params": { "constructor": ["joinPoint"], "next": ["action"], "getRecognizer": [], "process": [] } };
    __decorate([
        core_1.Inject(core_1.symbols.IContainer),
        __metadata("design:type", Object)
    ], AdvisorChain.prototype, "container", void 0);
    AdvisorChain = __decorate([
        decorators.NonePointcut(),
        core_1.Injectable(symbols.AopSymbols.IAdvisorChain),
        __metadata("design:paramtypes", [joinpoints.Joinpoint])
    ], AdvisorChain);
    return AdvisorChain;
}());
exports.AdvisorChain = AdvisorChain;


});

unwrapExports(AdvisorChain_1);
var AdvisorChain_2 = AdvisorChain_1.AdvisorChain;

var ProxyMethod_1 = createCommonjsModule(function (module, exports) {
var __decorate = (commonjsGlobal && commonjsGlobal.__decorate) || function (decorators$$2, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators$$2, target, key, desc);
    else for (var i = decorators$$2.length - 1; i >= 0; i--) if (d = decorators$$2[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (commonjsGlobal && commonjsGlobal.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (commonjsGlobal && commonjsGlobal.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });


var index_2 = joinpoints;


var ProxyMethod = /** @class */ (function () {
    function ProxyMethod(container) {
        this.container = container;
    }
    Object.defineProperty(ProxyMethod.prototype, "aspectMgr", {
        get: function () {
            if (!this._aspectMgr) {
                this._aspectMgr = this.container.get(symbols.AopSymbols.IAdvisor);
            }
            return this._aspectMgr;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ProxyMethod.prototype, "liefScope", {
        get: function () {
            if (!this._liefScope) {
                this._liefScope = this.container.getLifeScope();
            }
            return this._liefScope;
        },
        enumerable: true,
        configurable: true
    });
    ProxyMethod.prototype.proceed = function (target, targetType, pointcut, provJoinpoint) {
        var aspectMgr = this.aspectMgr;
        var fullName = pointcut.fullName;
        var methodName = pointcut.name;
        var advices = aspectMgr.getAdvices(fullName);
        if (advices && pointcut) {
            if (pointcut.descriptor && (pointcut.descriptor.get || pointcut.descriptor.set)) {
                if (pointcut.descriptor.get) {
                    var getMethod = pointcut.descriptor.get.bind(target);
                    pointcut.descriptor.get = this.proxy(getMethod, advices, target, targetType, pointcut, provJoinpoint);
                }
                if (pointcut.descriptor.set) {
                    var setMethod = pointcut.descriptor.set.bind(target);
                    pointcut.descriptor.set = this.proxy(setMethod, advices, target, targetType, pointcut, provJoinpoint);
                }
                Object.defineProperty(target, methodName, pointcut.descriptor);
            }
            else if (core_1.isFunction(target[methodName])) {
                var propertyMethod = target[methodName].bind(target);
                target[methodName] = this.proxy(propertyMethod, advices, target, targetType, pointcut, provJoinpoint);
            }
        }
    };
    ProxyMethod.prototype.proxy = function (propertyMethod, advices, target, targetType, pointcut, provJoinpoint) {
        var _this = this;
        var aspectMgr = this.aspectMgr;
        var fullName = pointcut.fullName;
        var methodName = pointcut.name;
        var liefScope = this.liefScope;
        var container = this.container;
        return function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            var joinPoint = _this.container.resolve(index_2.Joinpoint, core_1.Provider.create('options', {
                name: methodName,
                fullName: fullName,
                provJoinpoint: provJoinpoint,
                annotations: provJoinpoint ? null : liefScope.getMethodMetadatas(targetType, methodName),
                params: liefScope.getMethodParameters(targetType, target, methodName),
                args: args,
                target: target,
                targetType: targetType
            }));
            var adChain = container.resolve(symbols.AopSymbols.IAdvisorChainFactory, { container: container, advices: advices });
            adChain.invoaction(joinPoint, joinpoints.JoinpointState.Before);
            adChain.invoaction(joinPoint, joinpoints.JoinpointState.Pointcut);
            var val, exeErr;
            try {
                val = propertyMethod.apply(void 0, joinPoint.args);
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
    };
    ProxyMethod.classAnnations = { "name": "ProxyMethod", "params": { "constructor": ["container"], "proceed": ["target", "targetType", "pointcut", "provJoinpoint"], "proxy": ["propertyMethod", "advices", "target", "targetType", "pointcut", "provJoinpoint"] } };
    ProxyMethod = __decorate([
        decorators.NonePointcut(),
        core_1.Singleton(symbols.AopSymbols.IProxyMethod),
        __param(0, core_1.Inject(core_1.symbols.IContainer)),
        __metadata("design:paramtypes", [Object])
    ], ProxyMethod);
    return ProxyMethod;
}());
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
var __decorate = (commonjsGlobal && commonjsGlobal.__decorate) || function (decorators$$2, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators$$2, target, key, desc);
    else for (var i = decorators$$2.length - 1; i >= 0; i--) if (d = decorators$$2[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (commonjsGlobal && commonjsGlobal.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });




var AsyncPromiseProceeding = /** @class */ (function () {
    function AsyncPromiseProceeding() {
    }
    AsyncPromiseProceeding.prototype.proceeding = function (joinPoint) {
        var actions = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            actions[_i - 1] = arguments[_i];
        }
        if (joinPoint.returning) {
            actions.forEach((function (action) {
                joinPoint.returning = joinPoint.returning.then(function (val) {
                    joinPoint.returningValue = val;
                    return Promise.resolve(action(joinPoint))
                        .then(function () {
                        return joinPoint.returningValue;
                    });
                });
            }));
        }
    };
    AsyncPromiseProceeding.classAnnations = { "name": "AsyncPromiseProceeding", "params": { "constructor": [], "proceeding": ["joinPoint", "actions"] } };
    AsyncPromiseProceeding = __decorate([
        decorators.NonePointcut(),
        core_1.Singleton(symbols.AopSymbols.IAdvisorProceeding, ReturningType_1.ReturningType.promise),
        __metadata("design:paramtypes", [])
    ], AsyncPromiseProceeding);
    return AsyncPromiseProceeding;
}());
exports.AsyncPromiseProceeding = AsyncPromiseProceeding;


});

unwrapExports(AsyncPromiseProceeding_1);
var AsyncPromiseProceeding_2 = AsyncPromiseProceeding_1.AsyncPromiseProceeding;

var AsyncObservableProceeding_1 = createCommonjsModule(function (module, exports) {
var __decorate = (commonjsGlobal && commonjsGlobal.__decorate) || function (decorators$$2, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators$$2, target, key, desc);
    else for (var i = decorators$$2.length - 1; i >= 0; i--) if (d = decorators$$2[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (commonjsGlobal && commonjsGlobal.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });




var AsyncObservableProceeding = /** @class */ (function () {
    function AsyncObservableProceeding() {
    }
    AsyncObservableProceeding.prototype.proceeding = function (joinPoint) {
        var actions = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            actions[_i - 1] = arguments[_i];
        }
        if (core_1.isFunction(joinPoint.returning.flatMap)) {
            actions.forEach(function (action) {
                joinPoint.returning = joinPoint.returning.flatMap(function (val) {
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
            actions.forEach(function (action) {
                action(joinPoint);
            });
        }
    };
    AsyncObservableProceeding.classAnnations = { "name": "AsyncObservableProceeding", "params": { "constructor": [], "proceeding": ["joinPoint", "actions"] } };
    AsyncObservableProceeding = __decorate([
        decorators.NonePointcut(),
        core_1.Singleton(symbols.AopSymbols.IAdvisorProceeding, ReturningType_1.ReturningType.observable),
        __metadata("design:paramtypes", [])
    ], AsyncObservableProceeding);
    return AsyncObservableProceeding;
}());
exports.AsyncObservableProceeding = AsyncObservableProceeding;


});

unwrapExports(AsyncObservableProceeding_1);
var AsyncObservableProceeding_2 = AsyncObservableProceeding_1.AsyncObservableProceeding;

var ReturningRecognizer_1 = createCommonjsModule(function (module, exports) {
var __decorate = (commonjsGlobal && commonjsGlobal.__decorate) || function (decorators$$2, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators$$2, target, key, desc);
    else for (var i = decorators$$2.length - 1; i >= 0; i--) if (d = decorators$$2[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (commonjsGlobal && commonjsGlobal.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });




var ReturningRecognizer = /** @class */ (function () {
    function ReturningRecognizer() {
    }
    ReturningRecognizer.prototype.recognize = function (value) {
        if (core_1.isPromise(value)) {
            return ReturningType_1.ReturningType.promise;
        }
        if (core_1.isObservable(value)) {
            return ReturningType_1.ReturningType.observable;
        }
        return ReturningType_1.ReturningType.sync;
    };
    ReturningRecognizer.classAnnations = { "name": "ReturningRecognizer", "params": { "constructor": [], "recognize": ["value"] } };
    ReturningRecognizer = __decorate([
        decorators.NonePointcut(),
        core_1.Singleton(core_1.symbols.IRecognizer, joinpoints.JoinpointState.AfterReturning),
        __metadata("design:paramtypes", [])
    ], ReturningRecognizer);
    return ReturningRecognizer;
}());
exports.ReturningRecognizer = ReturningRecognizer;


});

unwrapExports(ReturningRecognizer_1);
var ReturningRecognizer_2 = ReturningRecognizer_1.ReturningRecognizer;

var SyncProceeding_1 = createCommonjsModule(function (module, exports) {
var __decorate = (commonjsGlobal && commonjsGlobal.__decorate) || function (decorators$$2, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators$$2, target, key, desc);
    else for (var i = decorators$$2.length - 1; i >= 0; i--) if (d = decorators$$2[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });




var SyncProceeding = /** @class */ (function () {
    function SyncProceeding() {
    }
    SyncProceeding.prototype.proceeding = function (joinPoint) {
        var actions = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            actions[_i - 1] = arguments[_i];
        }
        joinPoint.returningValue = joinPoint.returning;
        actions.forEach((function (action) {
            action(joinPoint);
        }));
    };
    SyncProceeding.classAnnations = { "name": "SyncProceeding", "params": { "proceeding": ["joinPoint", "actions"] } };
    SyncProceeding = __decorate([
        decorators.NonePointcut(),
        core_1.Singleton(symbols.AopSymbols.IAdvisorProceeding, ReturningType_1.ReturningType.sync)
    ], SyncProceeding);
    return SyncProceeding;
}());
exports.SyncProceeding = SyncProceeding;


});

unwrapExports(SyncProceeding_1);
var SyncProceeding_2 = SyncProceeding_1.SyncProceeding;

var access = createCommonjsModule(function (module, exports) {
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(AdvisorChainFactory_1);
__export(AdvisorChain_1);
__export(ProxyMethod_1);
__export(AsyncPromiseProceeding_1);
__export(AsyncObservableProceeding_1);
__export(ReturningRecognizer_1);
__export(ReturningType_1);
__export(SyncProceeding_1);


});

unwrapExports(access);

var Advisor_1 = createCommonjsModule(function (module, exports) {
var __decorate = (commonjsGlobal && commonjsGlobal.__decorate) || function (decorators$$2, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators$$2, target, key, desc);
    else for (var i = decorators$$2.length - 1; i >= 0; i--) if (d = decorators$$2[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (commonjsGlobal && commonjsGlobal.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (commonjsGlobal && commonjsGlobal.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });



/**
 * for global aop advisor.
 *
 * @export
 * @class Advisor
 */
var Advisor = /** @class */ (function () {
    function Advisor(container) {
        this.container = container;
        this.aspects = new core_1.MapSet();
        this.advices = new core_1.MapSet();
    }
    Advisor.prototype.setAdvices = function (key, advices) {
        if (!this.advices.has(key)) {
            this.advices.set(key, advices);
        }
    };
    Advisor.prototype.getAdvices = function (key) {
        if (!this.advices.has(key)) {
            return null;
        }
        return this.advices.get(key);
    };
    Advisor.prototype.hasRegisterAdvices = function (targetType) {
        var _this = this;
        var methods = core_1.lang.keys(Object.getOwnPropertyDescriptors(targetType.prototype));
        var className = core_1.getClassName(targetType);
        return methods.some(function (m) { return _this.advices.has(className + "." + m); });
    };
    Advisor.prototype.add = function (aspect) {
        if (!this.aspects.has(aspect)) {
            var metas = core_1.getOwnMethodMetadata(decorators.Advice, aspect);
            this.aspects.set(aspect, metas);
        }
    };
    Advisor.classAnnations = { "name": "Advisor", "params": { "constructor": ["container"], "setAdvices": ["key", "advices"], "getAdvices": ["key"], "hasRegisterAdvices": ["targetType"], "add": ["aspect"] } };
    Advisor = __decorate([
        decorators.NonePointcut(),
        core_1.Singleton(symbols.AopSymbols.IAdvisor),
        __param(0, core_1.Inject(core_1.symbols.IContainer)),
        __metadata("design:paramtypes", [Object])
    ], Advisor);
    return Advisor;
}());
exports.Advisor = Advisor;


});

unwrapExports(Advisor_1);
var Advisor_2 = Advisor_1.Advisor;

var AdviceMatcher_1 = createCommonjsModule(function (module, exports) {
var __decorate = (commonjsGlobal && commonjsGlobal.__decorate) || function (decorators$$2, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators$$2, target, key, desc);
    else for (var i = decorators$$2.length - 1; i >= 0; i--) if (d = decorators$$2[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (commonjsGlobal && commonjsGlobal.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (commonjsGlobal && commonjsGlobal.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });



/**
 * advice matcher, use to match advice when a registered create instance.
 *
 * @export
 * @class AdviceMatcher
 * @implements {IAdviceMatcher}
 */
var AdviceMatcher = /** @class */ (function () {
    function AdviceMatcher(container) {
        this.container = container;
    }
    AdviceMatcher.prototype.match = function (aspectType, targetType, adviceMetas, instance) {
        var _this = this;
        var className = core_1.getClassName(targetType);
        adviceMetas = adviceMetas || core_1.getOwnMethodMetadata(decorators.Advice, targetType);
        var advisor = this.container.get(symbols.AopSymbols.IAdvisor);
        var matched = [];
        if (targetType === aspectType) {
            var adviceNames = core_1.lang.keys(adviceMetas);
            if (adviceNames.length > 1) {
                var advices_1 = [];
                adviceNames.forEach(function (n) {
                    advices_1 = advices_1.concat(adviceMetas[n]);
                });
                adviceNames.forEach(function (n) {
                    advices_1.forEach(function (adv) {
                        if (adv.propertyKey !== n) {
                            if (_this.matchAspectSelf(n, adv)) {
                                matched.push({
                                    name: n,
                                    fullName: className + "." + n,
                                    advice: adv
                                });
                            }
                        }
                    });
                });
            }
        }
        else { // if (!advisor.hasRegisterAdvices(targetType)) {
            var points_1 = [];
            var decorators_1 = Object.getOwnPropertyDescriptors(targetType.prototype);
            // match method.
            for (var name_1 in decorators_1) {
                points_1.push({
                    name: name_1,
                    fullName: className + "." + name_1
                });
            }
            var allmethods = core_1.getParamerterNames(targetType);
            core_1.lang.forIn(allmethods, function (item, name) {
                if (name === 'constructor') {
                    return;
                }
                if (core_1.isUndefined(decorators_1[name])) {
                    points_1.push({
                        name: name,
                        fullName: className + "." + name
                    });
                }
            });
            Object.getOwnPropertyNames(adviceMetas).forEach(function (name) {
                var advices = adviceMetas[name];
                advices.forEach(function (metadata) {
                    matched = matched.concat(_this.filterPointcut(targetType, points_1, metadata));
                });
            });
        }
        return matched;
    };
    AdviceMatcher.prototype.matchAspectSelf = function (name, metadata) {
        if (metadata.pointcut) {
            var pointcut = metadata.pointcut;
            if (core_1.isString(pointcut)) {
                if (/^execution\(\S+\)$/.test(pointcut)) {
                    pointcut = pointcut.substring(10, pointcut.length - 1);
                    return pointcut === name;
                }
            }
            else if (core_1.isRegExp(pointcut)) {
                return pointcut.test(name);
            }
        }
        return false;
    };
    AdviceMatcher.prototype.filterPointcut = function (type, points, metadata) {
        if (!metadata.pointcut) {
            return [];
        }
        var matchedPointcut;
        if (metadata.pointcut) {
            var match_1 = this.matchTypeFactory(type, metadata.pointcut);
            matchedPointcut = points.filter(function (p) { return match_1(p.name, p.fullName, p); });
        }
        matchedPointcut = matchedPointcut || [];
        return matchedPointcut.map(function (p) {
            return core_1.lang.assign({}, p, { advice: metadata });
        });
    };
    AdviceMatcher.prototype.matchTypeFactory = function (type, pointcut) {
        if (core_1.isString(pointcut)) {
            pointcut = (pointcut || '').trim();
            if (/^@annotation\(\S+\)$/.test(pointcut)) {
                pointcut = pointcut.substring(12, pointcut.length - 1);
                var annotation_1 = /^@/.test(pointcut) ? pointcut : ('@' + pointcut);
                return function (name, fullName) { return core_1.hasOwnMethodMetadata(annotation_1, type, name) && !core_1.hasOwnClassMetadata(decorators.Aspect, type); };
            }
            else {
                if (/^execution\(\S+\)$/.test(pointcut)) {
                    pointcut = pointcut.substring(10, pointcut.length - 1);
                }
                if (pointcut === '*' || pointcut === '*.*') {
                    return function (name, fullName, pointcut) { return !!name && !core_1.hasOwnClassMetadata(decorators.Aspect, type); };
                }
                pointcut = pointcut.replace(/\*\*/gi, '(\\\w+(\\\.|\\\/)){0,}\\\w+')
                    .replace(/\*/gi, '\\\w+')
                    .replace(/\./gi, '\\\.')
                    .replace(/\//gi, '\\\/');
                var matcher_1 = new RegExp(pointcut + "$");
                return function (name, fullName, pointcut) { return matcher_1.test(fullName); };
            }
        }
        else if (core_1.isRegExp(pointcut)) {
            var pointcutReg_1 = pointcut;
            if (/^\^?@\w+/.test(pointcutReg_1.source)) {
                return function (name, fullName, pointcut) {
                    var decName = Reflect.getMetadataKeys(type, name);
                    return decName.some(function (n) { return core_1.isString(n) && pointcutReg_1.test(n); });
                };
            }
            else {
                return function (name, fullName, pointcut) { return pointcutReg_1.test(fullName); };
            }
        }
        return null;
    };
    AdviceMatcher.classAnnations = { "name": "AdviceMatcher", "params": { "constructor": ["container"], "match": ["aspectType", "targetType", "adviceMetas", "instance"], "matchAspectSelf": ["name", "metadata"], "filterPointcut": ["type", "points", "metadata"], "matchTypeFactory": ["type", "pointcut"] } };
    AdviceMatcher = __decorate([
        decorators.NonePointcut(),
        core_1.Singleton(symbols.AopSymbols.IAdviceMatcher),
        __param(0, core_1.Inject(core_1.symbols.IContainer)),
        __metadata("design:paramtypes", [Object])
    ], AdviceMatcher);
    return AdviceMatcher;
}());
exports.AdviceMatcher = AdviceMatcher;


});

unwrapExports(AdviceMatcher_1);
var AdviceMatcher_2 = AdviceMatcher_1.AdviceMatcher;

var AopModule_1 = createCommonjsModule(function (module, exports) {
var __decorate = (commonjsGlobal && commonjsGlobal.__decorate) || function (decorators$$2, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators$$2, target, key, desc);
    else for (var i = decorators$$2.length - 1; i >= 0; i--) if (d = decorators$$2[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (commonjsGlobal && commonjsGlobal.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (commonjsGlobal && commonjsGlobal.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });









/**
 * aop bootstrap main. auto run setup after registered.
 * with @IocModule('setup') decorator.
 * @export
 * @class AopModule
 */
var AopModule = /** @class */ (function () {
    function AopModule(container) {
        this.container = container;
    }
    /**
     * register aop for container.
     *
     * @memberof AopModule
     */
    AopModule.prototype.setup = function () {
        var container = this.container;
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
        var lifeScope = container.get(core_1.symbols.LifeScope);
        var factory = new AopActionFactory_1.AopActionFactory();
        lifeScope.addAction(factory.create(actions.AopActions.registAspect), core_1.IocState.design);
        lifeScope.addAction(factory.create(actions.AopActions.matchPointcut), core_1.IocState.runtime, core_1.LifeState.beforeConstructor);
        lifeScope.addAction(factory.create(actions.AopActions.bindMethodPointcut), core_1.IocState.runtime, core_1.LifeState.AfterInit);
        lifeScope.addAction(factory.create(actions.AopActions.invokeBeforeConstructorAdvices), core_1.IocState.runtime, core_1.LifeState.beforeConstructor);
        lifeScope.addAction(factory.create(actions.AopActions.exetndsInstance), core_1.IocState.runtime, core_1.LifeState.onInit, core_1.LifeState.afterConstructor);
        lifeScope.addAction(factory.create(actions.AopActions.invokeAfterConstructorAdvices), core_1.IocState.runtime, core_1.LifeState.afterConstructor);
        lifeScope.registerDecorator(decorators.Aspect, actions.AopActions.registAspect, actions.AopActions.exetndsInstance);
    };
    /**
     * symbols of aop.
     *
     * @static
     * @memberof AopModule
     */
    AopModule.symbols = symbols.AopSymbols;
    AopModule.classAnnations = { "name": "AopModule", "params": { "constructor": ["container"], "setup": [] } };
    AopModule = __decorate([
        core_1.IocModule('setup'),
        __param(0, core_1.Inject(core_1.symbols.IContainer)),
        __metadata("design:paramtypes", [Object])
    ], AopModule);
    return AopModule;
}());
exports.AopModule = AopModule;


});

unwrapExports(AopModule_1);
var AopModule_2 = AopModule_1.AopModule;

var D__Workspace_Projects_modules_tsioc_packages_aop_lib = createCommonjsModule(function (module, exports) {
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(symbols);
__export(actions);
__export(decorators);
__export(joinpoints);
__export(access);
__export(Advisor_1);
__export(AdviceMatcher_1);
__export(isValideAspectTarget_1);
__export(AopModule_1);


});

var index$4 = unwrapExports(D__Workspace_Projects_modules_tsioc_packages_aop_lib);

return index$4;

})));
