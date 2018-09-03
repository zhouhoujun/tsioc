(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('tslib'), require('@ts-ioc/core'), require('@ts-ioc/aop')) :
	typeof define === 'function' && define.amd ? define(['tslib', '@ts-ioc/core', '@ts-ioc/aop'], factory) :
	(global.logs = global.logs || {}, global.logs.umd = global.logs.umd || {}, global.logs.umd.js = factory(global.tslib_1,global['@ts-ioc/core'],global['@ts-ioc/aop']));
}(this, (function (tslib_1,core_1,aop_1) { 'use strict';

tslib_1 = tslib_1 && tslib_1.hasOwnProperty('default') ? tslib_1['default'] : tslib_1;
core_1 = core_1 && core_1.hasOwnProperty('default') ? core_1['default'] : core_1;
aop_1 = aop_1 && aop_1.hasOwnProperty('default') ? aop_1['default'] : aop_1;

function unwrapExports (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var Level_1 = createCommonjsModule(function (module, exports) {
var Level,Levels;Object.defineProperty(exports,"__esModule",{value:!0}), function(e){e.log="log", e.trace="trace", e.debug="debug", e.info="info", e.warn="warn", e.error="error", e.fatal="fatal";}(Level=exports.Level||(exports.Level={})), function(e){e[e.trace=0]="trace", e[e.debug=1]="debug", e[e.info=2]="info", e[e.warn=3]="warn", e[e.error=4]="error", e[e.fatal=5]="fatal";}(Levels=exports.Levels||(exports.Levels={}));



});

unwrapExports(Level_1);
var Level_2 = Level_1.Level;
var Level_3 = Level_1.Levels;

var ILoggerManager = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.LoggerManagerToken=new core_1.InjectToken("DI_ILoggerManager");



});

unwrapExports(ILoggerManager);
var ILoggerManager_1 = ILoggerManager.LoggerManagerToken;

var IConfigureLoggerManager = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.ConfigureLoggerManagerToken=new core_1.InjectToken("DI_IConfigureLoggerManager");



});

unwrapExports(IConfigureLoggerManager);
var IConfigureLoggerManager_1 = IConfigureLoggerManager.ConfigureLoggerManagerToken;

var LogConfigure = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.LogConfigureToken=new core_1.InjectToken("DI_LogConfigure");



});

unwrapExports(LogConfigure);
var LogConfigure_1 = LogConfigure.LogConfigureToken;

var ConfigureLoggerManger_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var ConfigureLoggerManger=function(){function e(e,o){this.container=e, this.setLogConfigure(o);}return Object.defineProperty(e.prototype,"config",{get:function(){return this._config||(this.container.has(LogConfigure.LogConfigureToken)?this._config=this.container.resolve(LogConfigure.LogConfigureToken):this._config={adapter:"console"}), this._config},enumerable:!0,configurable:!0}), e.prototype.setLogConfigure=function(e){e&&(core_1.isClass(e)?this.container.has(LogConfigure.LogConfigureToken)?this.container.has(e)||(this.container.register(e), this._config=this.container.get(e)):(this.container.register(LogConfigure.LogConfigureToken,e), this._config=this.container.get(LogConfigure.LogConfigureToken)):this._config=e, this._logManger=null);}, Object.defineProperty(e.prototype,"logManger",{get:function(){if(!this._logManger){var e=this.config||{},o=e.adapter||"console",r=void 0;r=core_1.isString(o)?new core_1.Registration(ILoggerManager.LoggerManagerToken,o):o, this._logManger=this.container.get(r), e.config&&this._logManger.configure(e.config);}return this._logManger},enumerable:!0,configurable:!0}), e.prototype.configure=function(e){this.logManger.configure(e);}, e.prototype.getLogger=function(e){return this.logManger.getLogger(e)}, e.classAnnations={name:"ConfigureLoggerManger",params:{constructor:["container","config"],setLogConfigure:["config"],configure:["config"],getLogger:["name"]}}, e=tslib_1.__decorate([aop_1.NonePointcut(),core_1.Injectable(IConfigureLoggerManager.ConfigureLoggerManagerToken),tslib_1.__param(0,core_1.Inject(core_1.ContainerToken)),tslib_1.__metadata("design:paramtypes",[Object,Object])],e)}();exports.ConfigureLoggerManger=ConfigureLoggerManger;



});

unwrapExports(ConfigureLoggerManger_1);
var ConfigureLoggerManger_2 = ConfigureLoggerManger_1.ConfigureLoggerManger;

var ConsoleLogManager_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var ConsoleLogManager=function(){function e(){this.logger=new ConsoleLog;}return e.prototype.configure=function(e){e&&e.level&&(this.logger.level=e.level);}, e.prototype.getLogger=function(e){return this.logger}, e.classAnnations={name:"ConsoleLogManager",params:{constructor:[],configure:["config"],getLogger:["name"]}}, e=tslib_1.__decorate([aop_1.NonePointcut(),core_1.Singleton(),core_1.Injectable(ILoggerManager.LoggerManagerToken,"console"),tslib_1.__metadata("design:paramtypes",[])],e)}();exports.ConsoleLogManager=ConsoleLogManager;var ConsoleLog=function(){function e(){}return e.prototype.log=function(e){for(var o=[],n=1;n<arguments.length;n++)o[n-1]=arguments[n];console.log.apply(console,[e].concat(o));}, e.prototype.trace=function(e){for(var o=[],n=1;n<arguments.length;n++)o[n-1]=arguments[n];this.level&&0!==Level_1.Levels[this.level]||console.debug.apply(console,[e].concat(o));}, e.prototype.debug=function(e){for(var o=[],n=1;n<arguments.length;n++)o[n-1]=arguments[n];(!this.level||Level_1.Levels[this.level]<=1)&&console.debug.apply(console,[e].concat(o));}, e.prototype.info=function(e){for(var o=[],n=1;n<arguments.length;n++)o[n-1]=arguments[n];(!this.level||Level_1.Levels[this.level]<=2)&&console.info.apply(console,[e].concat(o));}, e.prototype.warn=function(e){for(var o=[],n=1;n<arguments.length;n++)o[n-1]=arguments[n];(!this.level||Level_1.Levels[this.level]<=3)&&console.warn.apply(console,[e].concat(o));}, e.prototype.error=function(e){for(var o=[],n=1;n<arguments.length;n++)o[n-1]=arguments[n];(!this.level||Level_1.Levels[this.level]<=4)&&console.error.apply(console,[e].concat(o));}, e.prototype.fatal=function(e){for(var o=[],n=1;n<arguments.length;n++)o[n-1]=arguments[n];(!this.level||Level_1.Levels[this.level]<=5)&&console.error.apply(console,[e].concat(o));}, e.classAnnations={name:"ConsoleLog",params:{constructor:[],log:["message","args"],trace:["message","args"],debug:["message","args"],info:["message","args"],warn:["message","args"],error:["message","args"],fatal:["message","args"]}}, e}();



});

unwrapExports(ConsoleLogManager_1);
var ConsoleLogManager_2 = ConsoleLogManager_1.ConsoleLogManager;

var LogFormater_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.LogFormaterToken=new core_1.InjectToken("DI_LogFormater");var LogFormater=function(){function t(){}return t.prototype.format=function(t,r){var e;switch(t.state){case aop_1.JoinpointState.Before:case aop_1.JoinpointState.Pointcut:e=t.state+' invoke method "'+t.fullName+'" with args '+this.stringifyArgs(t.params,t.args)+".";break;case aop_1.JoinpointState.After:e=t.state+'  invoke method "'+t.fullName+'".';break;case aop_1.JoinpointState.AfterReturning:e='Invoke method "'+t.fullName+'" returning value '+this.stringify(t.returningValue)+".";break;case aop_1.JoinpointState.AfterThrowing:e='Invoke method "'+t.fullName+'" throw error '+this.stringify(t.throwing)+".";break;default:e="";}return this.joinMessage([e,r])}, t.prototype.stringifyArgs=function(t,o){var i=this,r=t.map(function(t,r){var e=o.length>=r?o[r]:null;return'<param name: "'+(t.name||"")+'", param type: "'+i.stringify(t.type)+'"> '+i.stringify(e)}).join(", ");return r?this.joinMessage(["[",r,"]"]," "):"[]"}, t.prototype.joinMessage=function(t,r){return void 0===r&&(r="; "), t.filter(function(t){return t}).map(function(t){return core_1.isString(t)?t:t.toString()}).join(r)}, t.prototype.stringifyArray=function(t){var r=this;return t.length?"[ "+t.map(function(t){return r.stringify(t)}).join(", ")+" ]":"[]"}, t.prototype.stringify=function(r){if(core_1.isString(r))return r;if(core_1.isArray(r))return this.stringifyArray(r);if(core_1.isBaseType(r))return r;if(core_1.isClass(r))return"[class "+core_1.getClassName(r)+"]";if(core_1.isFunction(r)||core_1.isDate(r)||core_1.isSymbol(r))return r.toString();if(core_1.isObject(r))try{return JSON.stringify(r)}catch(t){if(core_1.isFunction(r.toString))return r.toString()}return""}, t.classAnnations={name:"LogFormater",params:{constructor:[],format:["joinPoint","message"],stringifyArgs:["params","args"],joinMessage:["messgs","separator"],stringifyArray:["args"],stringify:["target"]}}, t=tslib_1.__decorate([aop_1.NonePointcut(),core_1.Singleton(exports.LogFormaterToken,"default"),tslib_1.__metadata("design:paramtypes",[])],t)}();exports.LogFormater=LogFormater;



});

unwrapExports(LogFormater_1);
var LogFormater_2 = LogFormater_1.LogFormaterToken;
var LogFormater_3 = LogFormater_1.LogFormater;

var LoggerAspect_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var LoggerAspect=function(){function e(e,r){this.container=e, this.config=r;}return Object.defineProperty(e.prototype,"logger",{get:function(){return this._logger||(this._logger=this.logManger.getLogger()), this._logger},enumerable:!0,configurable:!0}), Object.defineProperty(e.prototype,"logManger",{get:function(){return this._logManger||(this._logManger=this.container.resolve(IConfigureLoggerManager.ConfigureLoggerManagerToken,{config:this.config})), this._logManger},enumerable:!0,configurable:!0}), e.prototype.processLog=function(o,e,t,n){var i=this;e&&e.length?e.forEach(function(e){var r=!1;e.express&&e.express(o)?r=!0:e.express||(r=!0), r&&i.writeLog(e.logname?i.logManger.getLogger(e.logname):i.logger,o,i.joinMessage(t,e.message),e.level||n);}):this.writeLog(this.logger,o,t,n);}, e.prototype.formatMessage=function(e,r){var o=this.logManger.config;if(core_1.isClass(o.format))return this.container.has(o.format)||this.container.register(o.format), this.container.resolve(o.format).format(e,r);if(core_1.isFunction(o.format))return o.format(e,r);if(core_1.isObject(o.format)&&core_1.isFunction(o.format))return o.format.format(e,r);var t=core_1.isString(o.format)?o.format:"",n=this.container.resolve(new core_1.Registration(LogFormater_1.LogFormaterToken,t||"default"));return n?n.format(e,r):""}, e.prototype.joinMessage=function(){for(var e=[],r=0;r<arguments.length;r++)e[r]=arguments[r];return e.filter(function(e){return e}).map(function(e){return core_1.isString(e)?e:e.toString()}).join("; ")}, e.prototype.writeLog=function(e,r,o,t){var n=this.formatMessage(r,o);if(t)e[t](n);else switch(r.state){case aop_1.JoinpointState.Before:case aop_1.JoinpointState.After:case aop_1.JoinpointState.AfterReturning:e.debug(n);break;case aop_1.JoinpointState.Pointcut:e.info(n);break;case aop_1.JoinpointState.AfterThrowing:e.error(n);}}, e.classAnnations={name:"LoggerAspect",params:{constructor:["container","config"],processLog:["joinPoint","annotation","message","level"],formatMessage:["joinPoint","message"],joinMessage:["messgs"],writeLog:["logger","joinPoint","message","level"]}}, e=tslib_1.__decorate([core_1.Abstract(),tslib_1.__metadata("design:paramtypes",[Object,Object])],e)}();exports.LoggerAspect=LoggerAspect;



});

unwrapExports(LoggerAspect_1);
var LoggerAspect_2 = LoggerAspect_1.LoggerAspect;

var AnnotationLogerAspect_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var AnnotationLogerAspect=function(e){function t(t){return e.call(this,t)||this}return tslib_1.__extends(t,e), t.prototype.logging=function(t,e){this.processLog(t,e);}, t.classAnnations={name:"AnnotationLogerAspect",params:{constructor:["container"],logging:["joinPoint","annotation"]}}, tslib_1.__decorate([aop_1.Pointcut("@annotation(Logger)","annotation"),tslib_1.__metadata("design:type",Function),tslib_1.__metadata("design:paramtypes",[aop_1.Joinpoint,Array]),tslib_1.__metadata("design:returntype",void 0)],t.prototype,"logging",null), t=tslib_1.__decorate([core_1.Singleton(),aop_1.Aspect(),tslib_1.__param(0,core_1.Inject(core_1.ContainerToken)),tslib_1.__metadata("design:paramtypes",[Object])],t)}(LoggerAspect_1.LoggerAspect);exports.AnnotationLogerAspect=AnnotationLogerAspect;



});

unwrapExports(AnnotationLogerAspect_1);
var AnnotationLogerAspect_2 = AnnotationLogerAspect_1.AnnotationLogerAspect;

var Logger = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.Logger=core_1.createClassMethodDecorator("Logger",function(e){e.next({isMetadata:function(e){return core_1.isClassMetadata(e,["logname"])},match:function(e){return core_1.isString(e)},setMetadata:function(e,t){e.logname=t;}}), e.next({match:function(e){return core_1.isFunction(e)},setMetadata:function(e,t){e.express=t;}}), e.next({match:function(e){return core_1.isString(e)},setMetadata:function(e,t){e.message=t;}}), e.next({match:function(e){return core_1.isString(e)},setMetadata:function(e,t){e.level=Level_1.Level[t];}});});



});

unwrapExports(Logger);
var Logger_1 = Logger.Logger;

var LogModule_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var LogModule=function(){function e(e){this.container=e;}return e.prototype.setup=function(){var e=this.container;e.has(aop_1.AopModule)||e.register(aop_1.AopModule), e.get(core_1.LifeScopeToken).registerDecorator(Logger.Logger,core_1.LifeState.onInit,core_1.CoreActions.bindParameterProviders), e.register(ConfigureLoggerManger_1.ConfigureLoggerManger), e.register(AnnotationLogerAspect_1.AnnotationLogerAspect), e.register(LogFormater_1.LogFormater), e.register(ConsoleLogManager_1.ConsoleLogManager);}, e.classAnnations={name:"LogModule",params:{constructor:["container"],setup:[]}}, e=tslib_1.__decorate([core_1.IocExt("setup"),tslib_1.__param(0,core_1.Inject(core_1.ContainerToken)),tslib_1.__metadata("design:paramtypes",[Object])],e)}();exports.LogModule=LogModule;



});

unwrapExports(LogModule_1);
var LogModule_2 = LogModule_1.LogModule;

var D__workspace_github_tsioc_packages_logs_lib = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});tslib_1.__exportStar(Level_1,exports), tslib_1.__exportStar(ILoggerManager,exports), tslib_1.__exportStar(IConfigureLoggerManager,exports), tslib_1.__exportStar(ConfigureLoggerManger_1,exports), tslib_1.__exportStar(ConsoleLogManager_1,exports), tslib_1.__exportStar(LogConfigure,exports), tslib_1.__exportStar(LogFormater_1,exports), tslib_1.__exportStar(LoggerAspect_1,exports), tslib_1.__exportStar(AnnotationLogerAspect_1,exports), tslib_1.__exportStar(Logger,exports), tslib_1.__exportStar(LogModule_1,exports);



});

var index = unwrapExports(D__workspace_github_tsioc_packages_logs_lib);

return index;

})));
