(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('tslib'), require('@ts-ioc/core')) :
	typeof define === 'function' && define.amd ? define(['tslib', '@ts-ioc/core'], factory) :
	(global.aop = global.aop || {}, global.aop.umd = global.aop.umd || {}, global.aop.umd.js = factory(global.tslib_1,global['@ts-ioc/core']));
}(this, (function (tslib_1,core_1) { 'use strict';

tslib_1 = tslib_1 && tslib_1.hasOwnProperty('default') ? tslib_1['default'] : tslib_1;
core_1 = core_1 && core_1.hasOwnProperty('default') ? core_1['default'] : core_1;

function unwrapExports (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var AopActions_1 = createCommonjsModule(function (module, exports) {
var AopActions;Object.defineProperty(exports,"__esModule",{value:!0}), function(t){t.registAspect="registAspect", t.exetndsInstance="exetndsInstance", t.matchPointcut="matchPointcut", t.bindPropertyPointcut="bindPropertyPointcut", t.bindMethodPointcut="bindMethodPointcut", t.invokeBeforeConstructorAdvices="invokeBeforeConstructorAdvices", t.invokeAfterConstructorAdvices="invokeAfterConstructorAdvices";}(AopActions=exports.AopActions||(exports.AopActions={}));



});

unwrapExports(AopActions_1);
var AopActions_2 = AopActions_1.AopActions;

var IAdvisor = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.AdvisorToken=new core_1.InjectToken("DI_IAdvisor");



});

unwrapExports(IAdvisor);
var IAdvisor_1 = IAdvisor.AdvisorToken;

var RegistAspectAction_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var RegistAspectAction=function(t){function e(){return t.call(this,AopActions_1.AopActions.registAspect)||this}return tslib_1.__extends(e,t), e.prototype.working=function(t,e){var o=e.targetType,s=t.getLifeScope().getClassDecorators(function(t){return t.actions.includes(AopActions_1.AopActions.registAspect)&&core_1.hasOwnClassMetadata(t.name,o)}),r=t.get(IAdvisor.AdvisorToken),i=e.raiseContainer||t;s.forEach(function(t){var e=core_1.getOwnTypeMetadata(t.name,o);Array.isArray(e)&&0<e.length&&e.forEach(function(t){core_1.isClass(t.type)&&r.add(t.type,i);});});}, e.classAnnations={name:"RegistAspectAction",params:{constructor:[],working:["container","data"]}}, e}(core_1.ActionComposite);exports.RegistAspectAction=RegistAspectAction;



});

unwrapExports(RegistAspectAction_1);
var RegistAspectAction_2 = RegistAspectAction_1.RegistAspectAction;

var Advice = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});function createAdviceDecorator(t,r,c,o){return core_1.createMethodDecorator("Advice",function(e){r&&r(e), e.next({match:function(e){return core_1.isString(e)||core_1.isRegExp(e)},setMetadata:function(e,t){e.pointcut=t;}}), c&&c(e), e.next({match:function(e){return core_1.isString(e)},setMetadata:function(e,t){e.annotationArgName=t;}}), e.next({match:function(e){return core_1.isString(e)},setMetadata:function(e,t){e.annotationName=t;}});},function(e){return o&&(e=o(e)), e.adviceName=t, e})}exports.createAdviceDecorator=createAdviceDecorator, exports.Advice=createAdviceDecorator("Advice");



});

unwrapExports(Advice);
var Advice_1 = Advice.createAdviceDecorator;
var Advice_2 = Advice.Advice;

var Aspect = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.Aspect=core_1.createClassDecorator("Aspect",function(t){t.next({match:function(t){return core_1.isString(t)},setMetadata:function(t,e){t.annotation=e;}}), t.next({match:function(t){return core_1.isArray(t)||core_1.isClass(t)},setMetadata:function(t,e){t.within=e;}});});



});

unwrapExports(Aspect);
var Aspect_1 = Aspect.Aspect;

var After = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.After=Advice.createAdviceDecorator("After");



});

unwrapExports(After);
var After_1 = After.After;

var AfterReturning = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.AfterReturning=Advice.createAdviceDecorator("AfterReturning",null,function(e){e.next({match:function(e){return core_1.isString(e)},setMetadata:function(e,r){e.returning=r;}});});



});

unwrapExports(AfterReturning);
var AfterReturning_1 = AfterReturning.AfterReturning;

var AfterThrowing = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.AfterThrowing=Advice.createAdviceDecorator("AfterThrowing",null,function(e){e.next({match:function(e){return core_1.isString(e)},setMetadata:function(e,r){e.throwing=r;}});});



});

unwrapExports(AfterThrowing);
var AfterThrowing_1 = AfterThrowing.AfterThrowing;

var Around = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.Around=Advice.createAdviceDecorator("Around",null,function(e){e.next({match:function(e){return core_1.isString(e)},setMetadata:function(e,t){e.args=t;}}), e.next({match:function(e){return core_1.isString(e)},setMetadata:function(e,t){e.returning=t;}}), e.next({match:function(e){return core_1.isString(e)},setMetadata:function(e,t){e.throwing=t;}});});



});

unwrapExports(Around);
var Around_1 = Around.Around;

var Before = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.Before=Advice.createAdviceDecorator("Before");



});

unwrapExports(Before);
var Before_1 = Before.Before;

var Pointcut = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.Pointcut=Advice.createAdviceDecorator("Pointcut");



});

unwrapExports(Pointcut);
var Pointcut_1 = Pointcut.Pointcut;

var NonePointcut = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.NonePointcut=core_1.createClassDecorator("NonePointcut");



});

unwrapExports(NonePointcut);
var NonePointcut_1 = NonePointcut.NonePointcut;

var decorators = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});tslib_1.__exportStar(Advice,exports), tslib_1.__exportStar(Aspect,exports), tslib_1.__exportStar(After,exports), tslib_1.__exportStar(AfterReturning,exports), tslib_1.__exportStar(AfterThrowing,exports), tslib_1.__exportStar(Around,exports), tslib_1.__exportStar(Before,exports), tslib_1.__exportStar(Pointcut,exports), tslib_1.__exportStar(NonePointcut,exports);



});

unwrapExports(decorators);

var isValideAspectTarget_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});function isValideAspectTarget(e){return!(!core_1.isClass(e)||e===Object||e===String||e===Date||e===Boolean||e===Number)&&!core_1.hasOwnClassMetadata(decorators.NonePointcut,e)}exports.isValideAspectTarget=isValideAspectTarget;



});

unwrapExports(isValideAspectTarget_1);
var isValideAspectTarget_2 = isValideAspectTarget_1.isValideAspectTarget;

var IAdvisorChainFactory = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.AdvisorChainFactoryToken=new core_1.InjectToken("DI_IAdvisorChainFactory");



});

unwrapExports(IAdvisorChainFactory);
var IAdvisorChainFactory_1 = IAdvisorChainFactory.AdvisorChainFactoryToken;

var JoinpointState_1 = createCommonjsModule(function (module, exports) {
var JoinpointState;Object.defineProperty(exports,"__esModule",{value:!0}), function(t){t.Before="Before", t.Pointcut="Pointcut", t.After="After", t.AfterReturning="AfterReturning", t.AfterThrowing="AfterThrowing";}(JoinpointState=exports.JoinpointState||(exports.JoinpointState={}));



});

unwrapExports(JoinpointState_1);
var JoinpointState_2 = JoinpointState_1.JoinpointState;

var IJoinpoint = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.JoinpointToken=new core_1.InjectToken("DI_IJoinpoint");



});

unwrapExports(IJoinpoint);
var IJoinpoint_1 = IJoinpoint.JoinpointToken;

var Joinpoint_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var Joinpoint=function(){function t(t){this.provJoinpoint=t.provJoinpoint, this.name=t.name, this.fullName=t.fullName, this.params=t.params||[], this.args=t.args, this.returning=t.returning, this.throwing=t.throwing, this.state=t.state, this.advicer=t.advicer, this.annotations=t.annotations, this.target=t.target, this.targetType=t.targetType;}return t.classAnnations={name:"Joinpoint",params:{constructor:["options"]}}, t=tslib_1.__decorate([core_1.Injectable(IJoinpoint.JoinpointToken),decorators.NonePointcut(),tslib_1.__metadata("design:paramtypes",[Object])],t)}();exports.Joinpoint=Joinpoint;



});

unwrapExports(Joinpoint_1);
var Joinpoint_2 = Joinpoint_1.Joinpoint;

var joinpoints = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});tslib_1.__exportStar(JoinpointState_1,exports), tslib_1.__exportStar(IJoinpoint,exports), tslib_1.__exportStar(Joinpoint_1,exports);



});

unwrapExports(joinpoints);

var IAdvisorChain = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.AdvisorChainToken=new core_1.InjectToken("DI_IAdvisorChain");



});

unwrapExports(IAdvisorChain);
var IAdvisorChain_1 = IAdvisorChain.AdvisorChainToken;

var AdvisorChainFactory_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var AdvisorChainFactory=function(){function i(i,n,t){this.container=i, this.advisor=n, this.advices=t;}return i.prototype.getAdvicers=function(i){return(i?this.advices[i]:null)||[]}, i.prototype.invoaction=function(i,n,t){switch(i.state=n, i.returning=void 0, i.throwing=void 0, n){case joinpoints.JoinpointState.Before:this.before(i);break;case joinpoints.JoinpointState.Pointcut:this.pointcut(i);break;case joinpoints.JoinpointState.After:i.returning=t, this.after(i);break;case joinpoints.JoinpointState.AfterThrowing:i.throwing=t, this.afterThrowing(i);break;case joinpoints.JoinpointState.AfterReturning:i.returning=t, this.afterReturning(i);}}, i.prototype.before=function(i){var n=this,t=core_1.lang.assign({},i);this.getAdvicers("Around").forEach(function(i){n.invokeAdvice(t,i);}), core_1.isUndefined(t.args)||(i.args=t.args), this.getAdvicers("Before").forEach(function(i){n.invokeAdvice(t,i);});}, i.prototype.pointcut=function(i){var n=this,t=core_1.lang.assign({},i);this.getAdvicers("Pointcut").forEach(function(i){n.invokeAdvice(t,i);}), core_1.isUndefined(t.args)||(i.args=t.args);}, i.prototype.after=function(i){var n=this,t=core_1.lang.assign({},i);this.getAdvicers("Around").forEach(function(i){n.invokeAdvice(t,i);}), this.getAdvicers("After").forEach(function(i){n.invokeAdvice(t,i);});}, i.prototype.afterThrowing=function(i){var n=this,t=core_1.lang.assign({},i);this.getAdvicers("Around").forEach(function(i){n.invokeAdvice(t,i);}), this.getAdvicers("AfterThrowing").forEach(function(i){n.invokeAdvice(t,i);});}, i.prototype.afterReturning=function(n){var t=this,i=core_1.lang.assign({},n),e=this.container.resolve(IAdvisorChain.AdvisorChainToken,{joinPoint:i});this.getAdvicers("Around").forEach(function(n){e.next(function(i){return t.invokeAdvice(i,n)});}), this.getAdvicers("AfterReturning").forEach(function(n){e.next(function(i){return t.invokeAdvice(i,n)});}), e.next(function(i){return core_1.isUndefined(i.returning)||(n.returning=i.returning), n}), e.process();}, i.prototype.invokeAdvice=function(e,i){var n,t=this,r=[];r.push(core_1.Provider.createExtends(joinpoints.Joinpoint,e,function(i,n){i._cache_JoinPoint=n.resolve(t.container);}));var o=i.advice;return!core_1.isUndefined(e.args)&&o.args&&r.push(core_1.Provider.create(o.args,e.args)), o.annotationArgName&&r.push(core_1.Provider.create(o.annotationArgName,function(){for(var i=e,n=i.annotations;!n&&e.provJoinpoint;)if((i=e.provJoinpoint)&&i.annotations){n=i.annotations;break}if(core_1.isArray(n)){if(o.annotationName){var t=o.annotationName;return t=/^@/.test(t)?t:"@"+t, n.filter(function(i){return i.decorator===t})}return n}return[]})), !core_1.isUndefined(e.returning)&&o.returning&&r.push(core_1.Provider.create(o.returning,e.returning)), !core_1.isUndefined(e.throwing)&&o.throwing&&r.push(core_1.Provider.create(o.throwing,e.throwing)), (n=this.advisor.getContainer(i.aspectType,this.container)).syncInvoke.apply(n,[i.aspectType,i.advice.propertyKey,null].concat(r))}, i.classAnnations={name:"AdvisorChainFactory",params:{constructor:["container","advisor","advices"],getAdvicers:["adviceType"],invoaction:["joinPoint","state","valueOrthrowing"],before:["joinPoint"],pointcut:["joinPoint"],after:["joinPoint"],afterThrowing:["joinPoint"],afterReturning:["joinPoint"],invokeAdvice:["joinPoint","advicer"]}}, i=tslib_1.__decorate([decorators.NonePointcut(),core_1.Injectable(IAdvisorChainFactory.AdvisorChainFactoryToken),tslib_1.__param(0,core_1.Inject(core_1.ContainerToken)),tslib_1.__param(1,core_1.Inject(IAdvisor.AdvisorToken)),tslib_1.__metadata("design:paramtypes",[Object,Object,Object])],i)}();exports.AdvisorChainFactory=AdvisorChainFactory;



});

unwrapExports(AdvisorChainFactory_1);
var AdvisorChainFactory_2 = AdvisorChainFactory_1.AdvisorChainFactory;

var IAdvisorProceeding = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.AdvisorProceedingToken=new core_1.InjectToken("DI_IAdvisorProceeding");



});

unwrapExports(IAdvisorProceeding);
var IAdvisorProceeding_1 = IAdvisorProceeding.AdvisorProceedingToken;

var AdvisorChain_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var AdvisorChain=function(){function o(o){this.joinPoint=o, this.actions=[];}return o.prototype.next=function(o){this.actions.push(o);}, o.prototype.getRecognizer=function(){return this.container.get(core_1.RecognizerToken,this.joinPoint.state)}, o.prototype.process=function(){var o,e=this.getRecognizer().recognize(this.joinPoint.returning);(o=this.container.get(IAdvisorProceeding.AdvisorProceedingToken,e)).proceeding.apply(o,[this.joinPoint].concat(this.actions));}, o.classAnnations={name:"AdvisorChain",params:{constructor:["joinPoint"],next:["action"],getRecognizer:[],process:[]}}, tslib_1.__decorate([core_1.Inject(core_1.ContainerToken),tslib_1.__metadata("design:type",Object)],o.prototype,"container",void 0), o=tslib_1.__decorate([decorators.NonePointcut(),core_1.Injectable(IAdvisorChain.AdvisorChainToken),tslib_1.__metadata("design:paramtypes",[joinpoints.Joinpoint])],o)}();exports.AdvisorChain=AdvisorChain;



});

unwrapExports(AdvisorChain_1);
var AdvisorChain_2 = AdvisorChain_1.AdvisorChain;

var IProxyMethod = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.ProxyMethodToken=new core_1.InjectToken("DI_IProxyMethod");



});

unwrapExports(IProxyMethod);
var IProxyMethod_1 = IProxyMethod.ProxyMethodToken;

var ProxyMethod_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var joinpoints_2=joinpoints,ProxyMethod=function(){function t(t){this.container=t;}return Object.defineProperty(t.prototype,"advisor",{get:function(){return this._advisor||(this._advisor=this.container.get(IAdvisor.AdvisorToken)), this._advisor},enumerable:!0,configurable:!0}), Object.defineProperty(t.prototype,"liefScope",{get:function(){return this._liefScope||(this._liefScope=this.container.getLifeScope()), this._liefScope},enumerable:!0,configurable:!0}), t.prototype.proceed=function(t,o,e,r){var i=this.advisor,n=e.fullName,a=e.name,s=i.getAdvices(n);if(s&&e)if(e.descriptor&&(e.descriptor.get||e.descriptor.set)){if(e.descriptor.get){var c=e.descriptor.get.bind(t);e.descriptor.get=this.proxy(c,s,t,o,e,r);}if(e.descriptor.set){var p=e.descriptor.set.bind(t);e.descriptor.set=this.proxy(p,s,t,o,e,r);}Object.defineProperty(t,a,e.descriptor);}else if(core_1.isFunction(t[a])){var d=t[a].bind(t);t[a]=this.proxy(d,s,t,o,e,r);}}, t.prototype.proxy=function(a,s,c,p,t,d){var _=this,u=t.fullName,v=t.name,h=this.liefScope,f=this.container;return function(){for(var t=[],o=0;o<arguments.length;o++)t[o]=arguments[o];var e,r,i=_.container.resolve(joinpoints_2.Joinpoint,core_1.Provider.create("options",{name:v,fullName:u,provJoinpoint:d,annotations:d?null:h.getMethodMetadatas(p,v),params:h.getMethodParameters(p,c,v),args:t,target:c,targetType:p})),n=f.resolve(IAdvisorChainFactory.AdvisorChainFactoryToken,{container:f,advisor:_.advisor,advices:s});n.invoaction(i,joinpoints.JoinpointState.Before), n.invoaction(i,joinpoints.JoinpointState.Pointcut);try{e=a.apply(void 0,i.args);}catch(t){r=t;}if(n.invoaction(i,joinpoints.JoinpointState.After,e), !r)return n.invoaction(i,joinpoints.JoinpointState.AfterReturning,e), i.returning;n.invoaction(i,joinpoints.JoinpointState.AfterThrowing,r);}}, t.classAnnations={name:"ProxyMethod",params:{constructor:["container"],proceed:["target","targetType","pointcut","provJoinpoint"],proxy:["propertyMethod","advices","target","targetType","pointcut","provJoinpoint"]}}, t=tslib_1.__decorate([decorators.NonePointcut(),core_1.Singleton(IProxyMethod.ProxyMethodToken),tslib_1.__param(0,core_1.Inject(core_1.ContainerToken)),tslib_1.__metadata("design:paramtypes",[Object])],t)}();exports.ProxyMethod=ProxyMethod;



});

unwrapExports(ProxyMethod_1);
var ProxyMethod_2 = ProxyMethod_1.ProxyMethod;

var ReturningType_1 = createCommonjsModule(function (module, exports) {
var ReturningType;Object.defineProperty(exports,"__esModule",{value:!0}), function(e){e.sync="sync", e.promise="promise", e.observable="observable";}(ReturningType=exports.ReturningType||(exports.ReturningType={}));



});

unwrapExports(ReturningType_1);
var ReturningType_2 = ReturningType_1.ReturningType;

var AsyncPromiseProceeding_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var AsyncPromiseProceeding=function(){function e(){}return e.prototype.proceeding=function(n){for(var e=[],r=1;r<arguments.length;r++)e[r-1]=arguments[r];n.returning&&e.forEach(function(r){n.returning=n.returning.then(function(e){return n.returningValue=e, Promise.resolve(r(n)).then(function(){return n.returningValue})});});}, e.classAnnations={name:"AsyncPromiseProceeding",params:{constructor:[],proceeding:["joinPoint","actions"]}}, e=tslib_1.__decorate([decorators.NonePointcut(),core_1.Singleton(IAdvisorProceeding.AdvisorProceedingToken,ReturningType_1.ReturningType.promise),tslib_1.__metadata("design:paramtypes",[])],e)}();exports.AsyncPromiseProceeding=AsyncPromiseProceeding;



});

unwrapExports(AsyncPromiseProceeding_1);
var AsyncPromiseProceeding_2 = AsyncPromiseProceeding_1.AsyncPromiseProceeding;

var AsyncObservableProceeding_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var AsyncObservableProceeding=function(){function e(){}return e.prototype.proceeding=function(n){for(var e=[],r=1;r<arguments.length;r++)e[r-1]=arguments[r];core_1.isFunction(n.returning.flatMap)?e.forEach(function(r){n.returning=n.returning.flatMap(function(e){return n.returningValue=e, r(n), core_1.isObservable(n.returningValue)?n.returningValue:core_1.isPromise(n.returningValue)?n.returningValue:Promise.resolve(n.returningValue)});}):e.forEach(function(e){e(n);});}, e.classAnnations={name:"AsyncObservableProceeding",params:{constructor:[],proceeding:["joinPoint","actions"]}}, e=tslib_1.__decorate([decorators.NonePointcut(),core_1.Singleton(IAdvisorProceeding.AdvisorProceedingToken,ReturningType_1.ReturningType.observable),tslib_1.__metadata("design:paramtypes",[])],e)}();exports.AsyncObservableProceeding=AsyncObservableProceeding;



});

unwrapExports(AsyncObservableProceeding_1);
var AsyncObservableProceeding_2 = AsyncObservableProceeding_1.AsyncObservableProceeding;

var ReturningRecognizer_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var ReturningRecognizer=function(){function e(){}return e.prototype.recognize=function(e){return core_1.isPromise(e)?ReturningType_1.ReturningType.promise:core_1.isObservable(e)?ReturningType_1.ReturningType.observable:ReturningType_1.ReturningType.sync}, e.classAnnations={name:"ReturningRecognizer",params:{constructor:[],recognize:["value"]}}, e=tslib_1.__decorate([decorators.NonePointcut(),core_1.Singleton(core_1.RecognizerToken,joinpoints.JoinpointState.AfterReturning),tslib_1.__metadata("design:paramtypes",[])],e)}();exports.ReturningRecognizer=ReturningRecognizer;



});

unwrapExports(ReturningRecognizer_1);
var ReturningRecognizer_2 = ReturningRecognizer_1.ReturningRecognizer;

var SyncProceeding_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var SyncProceeding=function(){function e(){}return e.prototype.proceeding=function(r){for(var e=[],n=1;n<arguments.length;n++)e[n-1]=arguments[n];r.returningValue=r.returning, e.forEach(function(e){e(r);});}, e.classAnnations={name:"SyncProceeding",params:{proceeding:["joinPoint","actions"]}}, e=tslib_1.__decorate([decorators.NonePointcut(),core_1.Singleton(IAdvisorProceeding.AdvisorProceedingToken,ReturningType_1.ReturningType.sync)],e)}();exports.SyncProceeding=SyncProceeding;



});

unwrapExports(SyncProceeding_1);
var SyncProceeding_2 = SyncProceeding_1.SyncProceeding;

var access = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});tslib_1.__exportStar(IAdvisorChainFactory,exports), tslib_1.__exportStar(AdvisorChainFactory_1,exports), tslib_1.__exportStar(IAdvisorChain,exports), tslib_1.__exportStar(AdvisorChain_1,exports), tslib_1.__exportStar(IProxyMethod,exports), tslib_1.__exportStar(ProxyMethod_1,exports), tslib_1.__exportStar(AsyncPromiseProceeding_1,exports), tslib_1.__exportStar(AsyncObservableProceeding_1,exports), tslib_1.__exportStar(IAdvisorProceeding,exports), tslib_1.__exportStar(ReturningRecognizer_1,exports), tslib_1.__exportStar(ReturningType_1,exports), tslib_1.__exportStar(SyncProceeding_1,exports);



});

unwrapExports(access);

var BindMethodPointcutAction_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var BindMethodPointcutAction=function(e){function t(){return e.call(this,AopActions_1.AopActions.bindMethodPointcut)||this}return tslib_1.__extends(t,e), t.prototype.working=function(e,t){if(t.target&&isValideAspectTarget_1.isValideAspectTarget(t.targetType)&&e.hasRegister(access.ProxyMethodToken.toString())){var o=e.get(access.ProxyMethodToken),r=t.target,i=t.targetType,n=core_1.getClassName(i),c=[],s=Object.getOwnPropertyDescriptors(i.prototype);core_1.lang.forIn(s,function(e,t){"constructor"!==t&&c.push({name:t,fullName:n+"."+t,descriptor:e});});var a=core_1.getParamerterNames(i);core_1.lang.forIn(a,function(e,t){"constructor"!==t&&core_1.isUndefined(s[t])&&c.push({name:t,fullName:n+"."+t});}), c.forEach(function(e){o.proceed(r,i,e,r._cache_JoinPoint);});}}, t.classAnnations={name:"BindMethodPointcutAction",params:{constructor:[],working:["container","data"]}}, t}(core_1.ActionComposite);exports.BindMethodPointcutAction=BindMethodPointcutAction;



});

unwrapExports(BindMethodPointcutAction_1);
var BindMethodPointcutAction_2 = BindMethodPointcutAction_1.BindMethodPointcutAction;

var InvokeBeforeConstructorAction_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var InvokeBeforeConstructorAction=function(e){function t(){return e.call(this,AopActions_1.AopActions.registAspect)||this}return tslib_1.__extends(t,e), t.prototype.working=function(o,e){if(isValideAspectTarget_1.isValideAspectTarget(e.targetType)){var r=o.get(IAdvisor.AdvisorToken),t=core_1.getClassName(e.targetType),n=r.getAdvices(t+".constructor");if(n){var i=e.targetType,s=e.target,c=o.resolve(joinpoints.Joinpoint,core_1.Provider.create("options",{name:"constructor",state:joinpoints.JoinpointState.Before,fullName:t+".constructor",target:s,args:e.args,params:e.params,targetType:i})),a=[core_1.Provider.create(joinpoints.Joinpoint,c)];e.providerMap&&a.push(e.providerMap), n.Before.forEach(function(e){var t;(t=r.getContainer(e.aspectType,o)).syncInvoke.apply(t,[e.aspectType,e.advice.propertyKey,null].concat(a));}), n.Around.forEach(function(e){var t;(t=r.getContainer(e.aspectType,o)).syncInvoke.apply(t,[e.aspectType,e.advice.propertyKey,null].concat(a));});}}}, t.classAnnations={name:"InvokeBeforeConstructorAction",params:{constructor:[],working:["container","data"]}}, t}(core_1.ActionComposite);exports.InvokeBeforeConstructorAction=InvokeBeforeConstructorAction;



});

unwrapExports(InvokeBeforeConstructorAction_1);
var InvokeBeforeConstructorAction_2 = InvokeBeforeConstructorAction_1.InvokeBeforeConstructorAction;

var InvokeAfterConstructorAction_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var InvokeAfterConstructorAction=function(e){function t(){return e.call(this,AopActions_1.AopActions.invokeAfterConstructorAdvices)||this}return tslib_1.__extends(t,e), t.prototype.working=function(r,e){if(e.target&&isValideAspectTarget_1.isValideAspectTarget(e.targetType)){var o=r.get(IAdvisor.AdvisorToken),t=core_1.getClassName(e.targetType),n=o.getAdvices(t+".constructor");if(n){var i=e.targetType,s=e.target,c=r.resolve(joinpoints.Joinpoint,core_1.Provider.create("options",{name:"constructor",state:joinpoints.JoinpointState.After,fullName:t+".constructor",target:s,args:e.args,params:e.params,targetType:i})),a=[core_1.Provider.create(joinpoints.Joinpoint,c)];e.providerMap&&a.push(e.providerMap), n.After.forEach(function(e){var t;(t=o.getContainer(e.aspectType,r)).syncInvoke.apply(t,[e.aspectType,e.advice.propertyKey,null].concat(a));}), n.Around.forEach(function(e){var t;(t=o.getContainer(e.aspectType,r)).syncInvoke.apply(t,[e.aspectType,e.advice.propertyKey,null].concat(a));});}}}, t.classAnnations={name:"InvokeAfterConstructorAction",params:{constructor:[],working:["container","data"]}}, t}(core_1.ActionComposite);exports.InvokeAfterConstructorAction=InvokeAfterConstructorAction;



});

unwrapExports(InvokeAfterConstructorAction_1);
var InvokeAfterConstructorAction_2 = InvokeAfterConstructorAction_1.InvokeAfterConstructorAction;

var IAdviceMatcher = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.AdviceMatcherToken=new core_1.InjectToken("DI_IAdviceMatcher");



});

unwrapExports(IAdviceMatcher);
var IAdviceMatcher_1 = IAdviceMatcher.AdviceMatcherToken;

var MatchPointcutAction_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var MatchPointcutAction=function(e){function t(){return e.call(this,AopActions_1.AopActions.matchPointcut)||this}return tslib_1.__extends(t,e), t.prototype.working=function(e,t){var n=this;if(isValideAspectTarget_1.isValideAspectTarget(t.targetType)){var a=e.get(IAdvisor.AdvisorToken),i=e.get(IAdviceMatcher.AdviceMatcherToken);a.aspects.forEach(function(e,o){i.match(o,t.targetType,e,t.target).forEach(function(e){var t=e.fullName,i=e.advice,r=a.getAdvices(t);r||(r={Before:[],Pointcut:[],After:[],Around:[],AfterThrowing:[],AfterReturning:[]}, a.setAdvices(t,r));var c=core_1.lang.assign(e,{aspectType:o});"Before"===i.adviceName?r.Before.some(function(e){return n.isAdviceEquals(e.advice,i)})||r.Before.push(c):"Pointcut"===i.adviceName?r.Pointcut.some(function(e){return n.isAdviceEquals(e.advice,i)})||r.Pointcut.push(c):"Around"===i.adviceName?r.Around.some(function(e){return n.isAdviceEquals(e.advice,i)})||r.Around.push(c):"After"===i.adviceName?r.After.some(function(e){return n.isAdviceEquals(e.advice,i)})||r.After.push(c):"AfterThrowing"===i.adviceName?r.AfterThrowing.some(function(e){return n.isAdviceEquals(e.advice,i)})||r.AfterThrowing.push(c):"AfterReturning"===i.adviceName&&(r.AfterReturning.some(function(e){return n.isAdviceEquals(e.advice,i)})||r.AfterReturning.push(c));});});}}, t.prototype.isAdviceEquals=function(e,t){return!(!e||!t)&&(e===t||e.adviceName===t.adviceName&&e.pointcut===t.pointcut&&e.propertyKey===t.propertyKey)}, t.classAnnations={name:"MatchPointcutAction",params:{constructor:[],working:["container","data"],isAdviceEquals:["advice1","advice2"]}}, t}(core_1.ActionComposite);exports.MatchPointcutAction=MatchPointcutAction;



});

unwrapExports(MatchPointcutAction_1);
var MatchPointcutAction_2 = MatchPointcutAction_1.MatchPointcutAction;

var AopActionFactory_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var AopActionFactory=function(){function t(){}return t.prototype.create=function(t){var o;switch(t){case AopActions_1.AopActions.registAspect:o=new RegistAspectAction_1.RegistAspectAction;break;case AopActions_1.AopActions.matchPointcut:o=new actions.MatchPointcutAction;break;case AopActions_1.AopActions.invokeBeforeConstructorAdvices:o=new actions.InvokeBeforeConstructorAction;break;case AopActions_1.AopActions.invokeAfterConstructorAdvices:o=new actions.InvokeAfterConstructorAction;break;case AopActions_1.AopActions.bindMethodPointcut:o=new actions.BindMethodPointcutAction;break;case AopActions_1.AopActions.exetndsInstance:o=new actions.ExetndsInstanceAction;}return o}, t.classAnnations={name:"AopActionFactory",params:{create:["type"]}}, t}();exports.AopActionFactory=AopActionFactory;



});

unwrapExports(AopActionFactory_1);
var AopActionFactory_2 = AopActionFactory_1.AopActionFactory;

var ExetndsInstanceAction_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var ExetndsInstanceAction=function(t){function e(){return t.call(this,AopActions_1.AopActions.registAspect)||this}return tslib_1.__extends(e,t), e.prototype.working=function(t,e){!e.target||!e.providers||e.providers.length<1||e.providers.forEach(function(t){t&&t instanceof core_1.ExtendsProvider&&t.extends(e.target);});}, e.classAnnations={name:"ExetndsInstanceAction",params:{constructor:[],working:["container","data"]}}, e}(core_1.ActionComposite);exports.ExetndsInstanceAction=ExetndsInstanceAction;



});

unwrapExports(ExetndsInstanceAction_1);
var ExetndsInstanceAction_2 = ExetndsInstanceAction_1.ExetndsInstanceAction;

var actions = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});tslib_1.__exportStar(AopActions_1,exports), tslib_1.__exportStar(RegistAspectAction_1,exports), tslib_1.__exportStar(BindMethodPointcutAction_1,exports), tslib_1.__exportStar(InvokeBeforeConstructorAction_1,exports), tslib_1.__exportStar(InvokeAfterConstructorAction_1,exports), tslib_1.__exportStar(MatchPointcutAction_1,exports), tslib_1.__exportStar(AopActionFactory_1,exports), tslib_1.__exportStar(ExetndsInstanceAction_1,exports);



});

unwrapExports(actions);

var Advisor_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var Advisor=function(){function e(){this.aspects=new core_1.MapSet, this.aspectIocs=new core_1.MapSet, this.advices=new core_1.MapSet;}return e.prototype.setAdvices=function(e,t){this.advices.has(e)||this.advices.set(e,t);}, e.prototype.getAdvices=function(e){return this.advices.has(e)?this.advices.get(e):null}, e.prototype.hasRegisterAdvices=function(e){var t=this,s=core_1.lang.keys(Object.getOwnPropertyDescriptors(e.prototype)),r=core_1.getClassName(e);return s.some(function(e){return t.advices.has(r+"."+e)})}, e.prototype.add=function(e,t){if(!this.aspects.has(e)){var s=core_1.getOwnMethodMetadata(decorators.Advice,e);this.aspects.set(e,s), this.aspectIocs.set(e,t);}}, e.prototype.getContainer=function(e,t){return this.aspectIocs.has(e)&&this.aspectIocs.get(e)||t}, e.prototype.resolve=function(e){for(var t,s=[],r=1;r<arguments.length;r++)s[r-1]=arguments[r];return this.aspectIocs.has(e)?(t=this.aspectIocs.get(e)).resolve.apply(t,[e].concat(s)):null}, e.classAnnations={name:"Advisor",params:{constructor:[],setAdvices:["key","advices"],getAdvices:["key"],hasRegisterAdvices:["targetType"],add:["aspect","raiseContainer"],getContainer:["aspect","defaultContainer"],resolve:["aspect","providers"]}}, e=tslib_1.__decorate([decorators.NonePointcut(),core_1.Singleton(IAdvisor.AdvisorToken),tslib_1.__metadata("design:paramtypes",[])],e)}();exports.Advisor=Advisor;



});

unwrapExports(Advisor_1);
var Advisor_2 = Advisor_1.Advisor;

var AdviceMatcher_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var AdviceMatcher=function(){function t(t){this.container=t;}return t.prototype.match=function(t,e,r,n){var i=this,s=core_1.lang.first(core_1.getOwnTypeMetadata(decorators.Aspect,t));if(s){if(s.within)if((core_1.isArray(s.within)?s.within:[s.within]).indexOf(e)<0)return[];if(s.annotation){var a=core_1.isFunction(s.annotation)?s.annotation.toString():s.annotation,o=(/^\^?@\w+/.test(a)?"":"@")+a;if(!core_1.hasOwnClassMetadata(o,e))return[]}}var c=core_1.getClassName(e);r=r||core_1.getOwnMethodMetadata(decorators.Advice,e);var u=[];if(e===t){var p=core_1.lang.keys(r);if(1<p.length){var f=[];p.forEach(function(t){f=f.concat(r[t]);}), p.forEach(function(e){f.forEach(function(t){t.propertyKey!==e&&i.matchAspectSelf(e,t)&&u.push({name:e,fullName:c+"."+e,advice:t});});});}}else{var h=[],l=Object.getOwnPropertyDescriptors(e.prototype);for(var g in l)h.push({name:g,fullName:c+"."+g});var d=core_1.getParamerterNames(e);core_1.lang.forIn(d,function(t,e){"constructor"!==e&&core_1.isUndefined(l[e])&&h.push({name:e,fullName:c+"."+e});}), Object.getOwnPropertyNames(r).forEach(function(t){r[t].forEach(function(t){u=u.concat(i.filterPointcut(e,h,t));});});}return u}, t.prototype.matchAspectSelf=function(t,e){if(e.pointcut){var r=e.pointcut;if(core_1.isString(r))return/^execution\(\S+\)$/.test(r)&&(r=r.substring(10,r.length-1)), r.startsWith(t);if(core_1.isRegExp(r))return r.test(t)}return!1}, t.prototype.filterPointcut=function(e,t,r,n){if(!r.pointcut)return[];var i;if(r.pointcut){var s=this.matchTypeFactory(e,r);i=t.filter(function(t){return s(t.name,t.fullName,e,n,t)});}return(i=i||[]).map(function(t){return core_1.lang.assign({},t,{advice:r})})}, t.prototype.matchTypeFactory=function(n,i){var t=i.pointcut,e=[];if(i.within&&(e.push(function(t,e,r){return core_1.isArray(i.within)?0<=i.within.indexOf(r):i.within===r}), e.push("&&")), i.target&&(e.push(function(t,e,r,n){return i.target=n}), e.push("&&")), i.annotation&&(e.push(function(t,e,r,n){return core_1.hasOwnMethodMetadata(i.annotation,r,t)}), e.push("&&")), core_1.isString(t)){var r=(t||"").trim();e.push(this.tranlateExpress(n,r));}else if(core_1.isRegExp(t)){var s=t;/^\^?@\w+/.test(s.source)?e.push(function(t,e,r){return Reflect.getMetadataKeys(n,t).some(function(t){return core_1.isString(t)&&s.test(t)})}):e.push(function(t,e){return s.test(e)});}return this.mergeExpress.apply(this,e)}, t.prototype.spiltBrace=function(t){return t=t.trim(), /^\(/.test(t)&&/\)$/.test(t)&&(t=t.substring(1,t.length-1).trim()), /^\(/.test(t)&&/\)$/.test(t)?this.spiltBrace(t):t}, t.prototype.expressToFunc=function(r,t){var n=this;if(/^@annotation\(.*\)$/.test(t)){var e=t.substring(12,t.length-1),i=/^@/.test(e)?e:"@"+e;return function(t,e){return core_1.hasOwnMethodMetadata(i,r,t)&&!core_1.hasOwnClassMetadata(decorators.Aspect,r)}}if(/^execution\(.*\)$/.test(t)){if("*"===(e=t.substring(10,t.length-1))||"*.*"===e)return function(t,e){return!!t&&!core_1.hasOwnClassMetadata(decorators.Aspect,r)};if(/^\w+(\((\s*\w+\s*,)*\s*\w*\))?$/.test(e))return function(){return!1};if(/^([\w\*]+\.)+[\w\*]+(\((\s*\w+\s*,)*\s*\w*\))?$/.test(e)){e=e.replace(/\*\*/gi,"(\\w+(\\.|\\/)){0,}\\w+").replace(/\*/gi,"\\w+").replace(/\./gi,"\\.").replace(/\//gi,"\\/");var s=new RegExp(e+"$");return function(t,e){return s.test(e)}}return function(){return!1}}if(/^@within\(\s*\w+/.test(t)){var a=t.substring(t.indexOf("(")+1,t.length-1).split(",").map(function(t){return t.trim()});return function(t,e,r){return 0<=a.indexOf(core_1.getClassName(r))}}if(/^@target\(\s*\w+/.test(t)){var o=t.substring(t.indexOf("(")+1,t.length-1).trim();return function(t,e,r){return n.container.getTokenImpl(o)===r}}return function(){return!1}}, t.prototype.tranlateExpress=function(t,e){var r=[],n=e.indexOf("||"),i=e.indexOf("&&");if(i<0&&n<0)r.push(this.expressToFunc(t,this.spiltBrace(e)));else if(i<n)(s=this.spiltBrace(e.substring(0,n)))&&r.push(this.tranlateExpress(t,s)), (a=this.spiltBrace(e.substring(n+2)))&&(r.push("||"), r.push(this.tranlateExpress(t,a)));else if(n<i){var s,a;(s=this.spiltBrace(e.substring(0,i)))&&r.push(this.tranlateExpress(t,s)), (a=this.spiltBrace(e.substring(i+2)))&&(r.push("&&"), r.push(this.tranlateExpress(t,a)));}return this.mergeExpress.apply(this,r)}, t.prototype.mergeExpress=function(){for(var c=[],t=0;t<arguments.length;t++)c[t]=arguments[t];return function(n,i,s,a){var o;return c.forEach(function(t,e){if(core_1.isUndefined(o)&&core_1.isFunction(t)){var r=t(n,i,s,a);e<c.length-2?(r||"&&"!==t[e+1]||(o=!1), r&&"||"===t[e+1]&&(o=!0)):o=r;}}), o}}, t.classAnnations={name:"AdviceMatcher",params:{constructor:["container"],match:["aspectType","targetType","adviceMetas","target"],matchAspectSelf:["name","metadata"],filterPointcut:["type","points","metadata","target"],matchTypeFactory:["type","metadata"],spiltBrace:["strExp"],expressToFunc:["type","strExp"],tranlateExpress:["type","strExp"],mergeExpress:["expresses"]}}, t=tslib_1.__decorate([decorators.NonePointcut(),core_1.Singleton(IAdviceMatcher.AdviceMatcherToken),tslib_1.__param(0,core_1.Inject(core_1.ContainerToken)),tslib_1.__metadata("design:paramtypes",[Object])],t)}();exports.AdviceMatcher=AdviceMatcher;



});

unwrapExports(AdviceMatcher_1);
var AdviceMatcher_2 = AdviceMatcher_1.AdviceMatcher;

var AopModule_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var AopModule=function(){function e(e){this.container=e;}return e.prototype.setup=function(){var e=this.container;e.register(joinpoints.Joinpoint), e.register(access.AdvisorChainFactory), e.register(access.ReturningRecognizer), e.register(access.SyncProceeding), e.register(access.AsyncPromiseProceeding), e.register(access.AsyncObservableProceeding), e.register(access.AdvisorChain), e.register(access.ProxyMethod), e.register(Advisor_1.Advisor), e.register(AdviceMatcher_1.AdviceMatcher);var t=e.get(core_1.LifeScopeToken),o=new AopActionFactory_1.AopActionFactory;t.addAction(o.create(actions.AopActions.registAspect),core_1.IocState.design), t.addAction(o.create(actions.AopActions.matchPointcut),core_1.IocState.runtime,core_1.LifeState.beforeConstructor), t.addAction(o.create(actions.AopActions.bindMethodPointcut),core_1.IocState.runtime,core_1.LifeState.AfterInit), t.addAction(o.create(actions.AopActions.invokeBeforeConstructorAdvices),core_1.IocState.runtime,core_1.LifeState.beforeConstructor), t.addAction(o.create(actions.AopActions.exetndsInstance),core_1.IocState.runtime,core_1.LifeState.onInit,core_1.LifeState.afterConstructor), t.addAction(o.create(actions.AopActions.invokeAfterConstructorAdvices),core_1.IocState.runtime,core_1.LifeState.afterConstructor), t.registerDecorator(decorators.Aspect,actions.AopActions.registAspect,actions.AopActions.exetndsInstance);}, e.classAnnations={name:"AopModule",params:{constructor:["container"],setup:[]}}, e=tslib_1.__decorate([core_1.IocExt("setup"),tslib_1.__param(0,core_1.Inject(core_1.ContainerToken)),tslib_1.__metadata("design:paramtypes",[Object])],e)}();exports.AopModule=AopModule;



});

unwrapExports(AopModule_1);
var AopModule_2 = AopModule_1.AopModule;

var D__workspace_github_tsioc_packages_aop_lib = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});tslib_1.__exportStar(actions,exports), tslib_1.__exportStar(decorators,exports), tslib_1.__exportStar(joinpoints,exports), tslib_1.__exportStar(access,exports), tslib_1.__exportStar(IAdvisor,exports), tslib_1.__exportStar(Advisor_1,exports), tslib_1.__exportStar(AdviceMatcher_1,exports), tslib_1.__exportStar(isValideAspectTarget_1,exports), tslib_1.__exportStar(AopModule_1,exports);



});

var index$4 = unwrapExports(D__workspace_github_tsioc_packages_aop_lib);

return index$4;

})));
