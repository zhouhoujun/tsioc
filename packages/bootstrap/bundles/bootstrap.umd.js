(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('tslib'), require('@ts-ioc/core'), require('reflect-metadata')) :
	typeof define === 'function' && define.amd ? define(['tslib', '@ts-ioc/core', 'reflect-metadata'], factory) :
	(global.bootstrap = global.bootstrap || {}, global.bootstrap.umd = global.bootstrap.umd || {}, global.bootstrap.umd.js = factory(global.tslib_1,global.core_1,global.Reflect));
}(this, (function (tslib_1,core_1,reflectMetadata) { 'use strict';

tslib_1 = tslib_1 && tslib_1.hasOwnProperty('default') ? tslib_1['default'] : tslib_1;
core_1 = core_1 && core_1.hasOwnProperty('default') ? core_1['default'] : core_1;
reflectMetadata = reflectMetadata && reflectMetadata.hasOwnProperty('default') ? reflectMetadata['default'] : reflectMetadata;

function unwrapExports (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var Annotation = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});function createAnnotationDecorator(t,o,e,n){return core_1.createClassDecorator(t,function(t){e&&e(t);},function(t){return n&&(t=n(t)), o&&!t.annotationBuilder&&(t.annotationBuilder=o), t})}exports.createAnnotationDecorator=createAnnotationDecorator, exports.Annotation=createAnnotationDecorator("Annotation");



});

unwrapExports(Annotation);
var Annotation_1 = Annotation.createAnnotationDecorator;
var Annotation_2 = Annotation.Annotation;

var DIModule = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});function createDIModuleDecorator(o,r,t,n,a){return core_1.createClassDecorator(o,function(e){n&&n(e);},function(e){(a&&(e=a(e)), !e.name&&core_1.isClass(e.token))&&(/^[a-z]$/.test(e.token.name)&&e.token.classAnnations?e.name=e.token.classAnnations.name:e.name=e.token.name);return e.decorType=o, r&&!e.builder&&(e.builder=r), t&&!e.annotationBuilder&&(e.annotationBuilder=t), e})}exports.createDIModuleDecorator=createDIModuleDecorator, exports.DIModule=createDIModuleDecorator("DIModule");



});

unwrapExports(DIModule);
var DIModule_1 = DIModule.createDIModuleDecorator;
var DIModule_2 = DIModule.DIModule;

var Bootstrap = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});function createBootstrapDecorator(e,r,o,t,a){return DIModule.createDIModuleDecorator(e,r,o,t,function(o){return a&&a(o), o.builder&&setTimeout(function(){var e,r=o.builder;core_1.isClass(r)?e=core_1.isFunction(r.create)?r.create():new r:core_1.isObject(r)&&(e=r), e&&(o.globals&&e.use.apply(e,o.globals), e.bootstrap(o.type));},500), o})}exports.createBootstrapDecorator=createBootstrapDecorator, exports.Bootstrap=createBootstrapDecorator("Bootstrap");



});

unwrapExports(Bootstrap);
var Bootstrap_1 = Bootstrap.createBootstrapDecorator;
var Bootstrap_2 = Bootstrap.Bootstrap;

var decorators = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});tslib_1.__exportStar(Annotation,exports), tslib_1.__exportStar(DIModule,exports), tslib_1.__exportStar(Bootstrap,exports);



});

unwrapExports(decorators);

var AppConfigure = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.AppConfigureToken=new core_1.InjectToken("DI_APP_Configuration"), exports.DefaultConfigureToken=new core_1.InjectToken("DI_Default_Configuration"), exports.AppConfigureLoaderToken=new core_1.InjectToken("DI_Configure_Loader");



});

unwrapExports(AppConfigure);
var AppConfigure_1 = AppConfigure.AppConfigureToken;
var AppConfigure_2 = AppConfigure.DefaultConfigureToken;
var AppConfigure_3 = AppConfigure.AppConfigureLoaderToken;

var DIModuleValidate = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.DIModuelValidateToken=new core_1.InjectModuleValidateToken(decorators.DIModule.toString());var DIModuelValidate=function(e){function t(){return null!==e&&e.apply(this,arguments)||this}return tslib_1.__extends(t,e), t.prototype.getDecorator=function(){return decorators.DIModule.toString()}, t.classAnnations={name:"DIModuelValidate",params:{getDecorator:[]}}, t=tslib_1.__decorate([core_1.Singleton(exports.DIModuelValidateToken)],t)}(core_1.BaseModuelValidate);exports.DIModuelValidate=DIModuelValidate;



});

unwrapExports(DIModuleValidate);
var DIModuleValidate_1 = DIModuleValidate.DIModuelValidateToken;
var DIModuleValidate_2 = DIModuleValidate.DIModuelValidate;

var ContainerPool_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var ContainerPool=function(){function t(t){this.containerBuilder=t, this.pools=new core_1.MapSet;}return t.prototype.createContainer=function(){return this.containerBuilder.create()}, t.prototype.getTokenKey=function(t){return t instanceof core_1.Registration?t.toString():t}, t.prototype.isDefault=function(t){return t===this._default}, t.prototype.hasDefault=function(){return!!this._default}, t.prototype.getDefault=function(){return this._default||(this._default=this.createContainer()), this._default}, t.prototype.set=function(t,e){this.getTokenKey(t);this.pools.has(t)&&console.log(t.toString()+" module has loaded"), this.pools.set(t,e);}, t.prototype.get=function(t){var e=this.getTokenKey(t);return this.has(e)?this.pools.get(t):null}, t.prototype.has=function(t){return this.pools.has(this.getTokenKey(t))}, t.prototype.create=function(t){var e=(t=t||this.getDefault()).getBuilder().create();return this.setParent(e,t), e}, t.prototype.setParent=function(t,e){this.isDefault(t)||(t.parent=e&&e!==t?e:this.getDefault());}, t.classAnnations={name:"ContainerPool",params:{constructor:["containerBuilder"],createContainer:[],getTokenKey:["token"],isDefault:["container"],hasDefault:[],getDefault:[],set:["token","container"],get:["token"],has:["token"],create:["parent"],setParent:["container","parent"]}}, t}();exports.ContainerPool=ContainerPool, exports.ContainerPoolToken=new core_1.InjectToken("ContainerPool");



});

unwrapExports(ContainerPool_1);
var ContainerPool_2 = ContainerPool_1.ContainerPool;
var ContainerPool_3 = ContainerPool_1.ContainerPoolToken;

var Events_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var Events=function(){function e(){this.eventsMap={};}return e.prototype.on=function(e,t){return this.eventsMap[e]=this.eventsMap[e]||[], this.eventsMap[e].indexOf(t)<0&&this.eventsMap[e].push(t), this}, e.prototype.off=function(e,t){return this.eventsMap[e]&&(t?this.eventsMap[e].splice(this.eventsMap[e].indexOf(t),1):delete this.eventsMap[e]), this}, e.prototype.emit=function(e){for(var t=[],n=1;n<arguments.length;n++)t[n-1]=arguments[n];var s=this.eventsMap[e];core_1.isArray(s)&&s.forEach(function(e){e.apply(void 0,t);});}, e.classAnnations={name:"Events",params:{constructor:[],on:["name","event"],off:["name","event"],emit:["name","args"]}}, e}();exports.Events=Events;



});

unwrapExports(Events_1);
var Events_2 = Events_1.Events;

var utils = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});tslib_1.__exportStar(ContainerPool_1,exports), tslib_1.__exportStar(Events_1,exports);



});

unwrapExports(utils);

var InjectedModule_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var InjectedModule=function(){function e(e,t,n,o,r,s){this.token=e, this.config=t, this.container=n, this.type=o, this.exports=r, this.providers=s;}return e.classAnnations={name:"InjectedModule",params:{constructor:["token","config","container","type","exports","providers"]}}, e}();exports.InjectedModule=InjectedModule;var InjectedModuleToken=function(t){function e(e){return t.call(this,e,"InjectedModule")||this}return tslib_1.__extends(e,t), e.classAnnations={name:"InjectedModuleToken",params:{constructor:["type"]}}, e}(core_1.Registration);exports.InjectedModuleToken=InjectedModuleToken;



});

unwrapExports(InjectedModule_1);
var InjectedModule_2 = InjectedModule_1.InjectedModule;
var InjectedModule_3 = InjectedModule_1.InjectedModuleToken;

var DIModuleInjector_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var exportsProvidersFiled="__exportProviders";exports.DIModuleInjectorToken=new core_1.InjectModuleInjectorToken(decorators.DIModule.toString());var DIModuleInjector=function(r){function e(e){return r.call(this,e)||this}return tslib_1.__extends(e,r), e.prototype.setup=function(r,t){return tslib_1.__awaiter(this,void 0,void 0,function(){return tslib_1.__generator(this,function(e){switch(e.label){case 0:return[4,this.importModule(r,t)];case 1:return e.sent(), [2]}})})}, e.prototype.import=function(r,t){return tslib_1.__awaiter(this,void 0,void 0,function(){return tslib_1.__generator(this,function(e){switch(e.label){case 0:return this.validate.validate(t)?[4,this.importModule(r,t)]:[3,2];case 1:return[2,e.sent()];case 2:return[2,null]}})})}, e.prototype.importByConfig=function(r,t){return tslib_1.__awaiter(this,void 0,void 0,function(){return tslib_1.__generator(this,function(e){switch(e.label){case 0:return[4,this.registerConfgureDepds(r,t)];case 1:return e.sent(), core_1.isArray(t.providers)&&t.providers.length?[4,this.bindProvider(r,t.providers)]:[3,3];case 2:e.sent(), e.label=3;case 3:return[2,null]}})})}, e.prototype.importModule=function(n,s){return tslib_1.__awaiter(this,void 0,void 0,function(){var r,t,o,i;return tslib_1.__generator(this,function(e){switch(e.label){case 0:return r=n.get(utils.ContainerPoolToken), (t=r.create(n)).register(s), o=this.validate.getMetaConfig(s,t), [4,this.registerConfgureDepds(t,o)];case 1:return o=e.sent(), i=new InjectedModule_1.InjectedModule(o.token||s,o,t,s,o.exports||[],o[exportsProvidersFiled]), n.bindProvider(new InjectedModule_1.InjectedModuleToken(s),i), [4,this.importConfigExports(n,t,i)];case 2:return e.sent(), [2,i]}})})}, e.prototype.registerConfgureDepds=function(r,t){return tslib_1.__awaiter(this,void 0,void 0,function(){return tslib_1.__generator(this,function(e){switch(e.label){case 0:return core_1.isArray(t.imports)&&t.imports.length?[4,r.loadModule.apply(r,t.imports)]:[3,2];case 1:e.sent(), e.label=2;case 2:return core_1.isArray(t.providers)&&t.providers.length&&(t[exportsProvidersFiled]=this.bindProvider(r,t.providers)), [2,t]}})})}, e.prototype.importConfigExports=function(r,t,o){return tslib_1.__awaiter(this,void 0,void 0,function(){return tslib_1.__generator(this,function(e){return r===t||o&&(r.resolvers.next(o), o.exports&&o.exports.length&&t.resolvers.toArray().filter(function(e){return!(e instanceof core_1.Container)&&0<=o.exports.indexOf(e.type)}).forEach(function(e){r.resolvers.next(e);})), [2,r]})})}, e.prototype.bindProvider=function(i,e){var n=[];return e.forEach(function(t,e){if(!core_1.isUndefined(t)&&!core_1.isNull(t))if(core_1.isProviderMap(t))t.forEach(function(e,r){n.push(e), i.bindProvider(e,r);});else if(t instanceof core_1.Provider)n.push(t.type), i.bindProvider(t.type,function(){for(var e=[],r=0;r<arguments.length;r++)e[r]=arguments[r];return t.resolve.apply(t,[i].concat(e))});else if(core_1.isClass(t))i.has(t)||(n.push(t), i.register(t));else if(core_1.isBaseObject(t)){var r=t,o=!1;core_1.isToken(r.provide)?(core_1.isArray(r.deps)&&r.deps.length&&r.deps.forEach(function(e){core_1.isClass(e)&&!i.has(e)&&i.register(e);}), core_1.isUndefined(r.useValue)?core_1.isClass(r.useClass)?(i.has(r.useClass)||i.register(r.useClass), n.push(r.provide), i.bindProvider(r.provide,r.useClass)):core_1.isFunction(r.useFactory)?(n.push(r.provide), i.bindProvider(r.provide,function(){var e=[];return core_1.isArray(r.deps)&&r.deps.length&&(e=r.deps.map(function(e){return core_1.isClass(e)?i.get(e):e})), r.useFactory.apply(r,e)})):core_1.isToken(r.useExisting)?i.has(r.useExisting)?(n.push(r.provide), i.bindProvider(r.provide,r.useExisting)):console.log("has not register:",r.useExisting):o=!0:(n.push(r.provide), i.bindProvider(r.provide,function(){return r.useValue}))):o=!0, o&&core_1.lang.forIn(t,function(e,r){core_1.isUndefined(e)||(core_1.isClass(e)?i.bindProvider(r,e):core_1.isFunction(e)||core_1.isString(e)?i.bindProvider(r,function(){return e}):i.bindProvider(r,e), n.push(r));});}else core_1.isFunction(t)&&(n.push(name), i.bindProvider(name,function(){return t}));}), n}, e.classAnnations={name:"DIModuleInjector",params:{constructor:["validate"],setup:["container","type"],import:["container","type"],importByConfig:["container","config"],importModule:["container","type"],registerConfgureDepds:["container","config"],importConfigExports:["container","providerContainer","injMd"],bindProvider:["container","providers"]}}, e=tslib_1.__decorate([core_1.Injectable(exports.DIModuleInjectorToken),tslib_1.__param(0,core_1.Inject(DIModuleValidate.DIModuelValidateToken)),tslib_1.__metadata("design:paramtypes",[Object])],e)}(core_1.ModuleInjector);exports.DIModuleInjector=DIModuleInjector;



});

unwrapExports(DIModuleInjector_1);
var DIModuleInjector_2 = DIModuleInjector_1.DIModuleInjectorToken;
var DIModuleInjector_3 = DIModuleInjector_1.DIModuleInjector;

var IModuleBuilder = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var moduleBuilderDesc="DI_ModuleBuilder",InjectModuleBuilderToken=function(o){function e(e){return o.call(this,e,moduleBuilderDesc)||this}return tslib_1.__extends(e,o), e.classAnnations={name:"InjectModuleBuilderToken",params:{constructor:["type"]}}, e}(core_1.Registration);exports.InjectModuleBuilderToken=InjectModuleBuilderToken, exports.DefaultModuleBuilderToken=new InjectModuleBuilderToken(Object), exports.ModuleBuilderToken=new core_1.Registration("any",moduleBuilderDesc);



});

unwrapExports(IModuleBuilder);
var IModuleBuilder_1 = IModuleBuilder.InjectModuleBuilderToken;
var IModuleBuilder_2 = IModuleBuilder.DefaultModuleBuilderToken;
var IModuleBuilder_3 = IModuleBuilder.ModuleBuilderToken;

var IRunner = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var Runner=function(){function n(n,e,t){this.token=n, this.instance=e, this.config=t;}return n.classAnnations={name:"Runner",params:{constructor:["token","instance","config"],run:["data"]}}, n}(),Boot=function(r){function n(n,e,t){var o=r.call(this,n,e,t)||this;return o.token=n, o.instance=e, o.config=t, o}return tslib_1.__extends(n,r), n.classAnnations={name:"Boot",params:{constructor:["token","instance","config"]}}, n}(exports.Runner=Runner);exports.Boot=Boot;var InjectRunnerToken=function(e){function n(n){return e.call(this,n,"boot__runner")||this}return tslib_1.__extends(n,e), n.classAnnations={name:"InjectRunnerToken",params:{constructor:["type"]}}, n}(core_1.Registration);exports.InjectRunnerToken=InjectRunnerToken, exports.DefaultRunnerToken=new InjectRunnerToken("default");



});

unwrapExports(IRunner);
var IRunner_1 = IRunner.Runner;
var IRunner_2 = IRunner.Boot;
var IRunner_3 = IRunner.InjectRunnerToken;
var IRunner_4 = IRunner.DefaultRunnerToken;

var Service_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var Service=function(){function e(e,t,n){this.token=e, this.instance=t, this.config=n;}return e.classAnnations={name:"Service",params:{constructor:["token","instance","config"],start:["data"],stop:[]}}, e}();exports.Service=Service;var InjectServiceToken=function(t){function e(e){return t.call(this,e,"boot__service")||this}return tslib_1.__extends(e,t), e.classAnnations={name:"InjectServiceToken",params:{constructor:["type"]}}, e}(core_1.Registration);exports.InjectServiceToken=InjectServiceToken, exports.DefaultServiceToken=new InjectServiceToken("default");



});

unwrapExports(Service_1);
var Service_2 = Service_1.Service;
var Service_3 = Service_1.InjectServiceToken;
var Service_4 = Service_1.DefaultServiceToken;

var runnable = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});tslib_1.__exportStar(IRunner,exports), tslib_1.__exportStar(Service_1,exports);



});

unwrapExports(runnable);

var IAnnotationBuilder = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var annoBuilderDesc="DI_AnnotationBuilder",InjectAnnotationBuilder=function(n){function e(e){return n.call(this,e,annoBuilderDesc)||this}return tslib_1.__extends(e,n), e.classAnnations={name:"InjectAnnotationBuilder",params:{constructor:["type"]}}, e}(core_1.Registration);exports.InjectAnnotationBuilder=InjectAnnotationBuilder, exports.AnnotationBuilderToken=new core_1.Registration(Object,annoBuilderDesc), exports.DefaultAnnotationBuilderToken=new InjectAnnotationBuilder("default");



});

unwrapExports(IAnnotationBuilder);
var IAnnotationBuilder_1 = IAnnotationBuilder.InjectAnnotationBuilder;
var IAnnotationBuilder_2 = IAnnotationBuilder.AnnotationBuilderToken;
var IAnnotationBuilder_3 = IAnnotationBuilder.DefaultAnnotationBuilderToken;

var AnnotationBuilder_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var AnnotationBuilder=function(){function t(){}var i;return(i=t).prototype.build=function(o,i,r){return tslib_1.__awaiter(this,void 0,void 0,function(){var n,e;return tslib_1.__generator(this,function(t){switch(t.label){case 0:return core_1.isClass(o)&&!this.container.hasRegister(o)&&this.container.register(o), i=this.getTokenMetaConfig(o,i), n=this.getBuilder(o,i), this.isEqual(n)?[3,1]:[2,n.build(o,i,r)];case 1:return[4,this.registerExts(i)];case 2:return t.sent(), [4,this.createInstance(o,i,r)];case 3:return(e=t.sent())?core_1.isFunction(e.anBeforeInit)?[4,Promise.resolve(e.anBeforeInit(i))]:[3,5]:[2,null];case 4:t.sent(), t.label=5;case 5:return[4,this.buildStrategy(e,i)];case 6:return e=t.sent(), core_1.isFunction(e.anAfterInit)?[4,Promise.resolve(e.anAfterInit(i))]:[3,8];case 7:t.sent(), t.label=8;case 8:return[2,e]}})})}, t.prototype.buildByConfig=function(e,o){return tslib_1.__awaiter(this,void 0,void 0,function(){var n;return tslib_1.__generator(this,function(t){return core_1.isToken(e)?(n=e, [2,this.build(n,null,o)]):(n=this.getType(e), [2,this.build(n,e,o)])})})}, t.prototype.createInstance=function(n,t,e){return tslib_1.__awaiter(this,void 0,void 0,function(){return tslib_1.__generator(this,function(t){return n?this.container.has(n)?[2,this.resolveToken(n,e)]:(console.log("can not find token "+(n?n.toString():null)+" in container."), [2,null]):(console.log("can not find annotation token."), [2,null])})})}, t.prototype.getBuilder=function(t,n){var e,o=this;return n&&n.annotationBuilder&&(core_1.isClass(n.annotationBuilder)&&(this.container.has(n.annotationBuilder)||this.container.register(n.annotationBuilder)), core_1.isToken(n.annotationBuilder)?e=this.container.resolve(n.annotationBuilder,{container:this.container}):n.annotationBuilder instanceof i&&(e=n.annotationBuilder)), !e&&t&&this.container.getTokenExtendsChain(t).forEach(function(t){if(e)return!1;var n=new IAnnotationBuilder.InjectAnnotationBuilder(t);return o.container.has(n)&&(e=o.container.resolve(n,{container:o.container})), !0}), e&&!e.container&&(e.container=this.container), e||this}, t.prototype.buildStrategy=function(n,t){return tslib_1.__awaiter(this,void 0,void 0,function(){return tslib_1.__generator(this,function(t){return[2,n]})})}, t.prototype.getType=function(t){return t.token||t.type}, t.prototype.registerExts=function(t){return tslib_1.__awaiter(this,void 0,void 0,function(){return tslib_1.__generator(this,function(t){return[2]})})}, t.prototype.getTokenMetaConfig=function(t,n){var e;if(core_1.isClass(t))e=this.getMetaConfig(t);else if(core_1.isToken(t)){var o=this.container?this.container.getTokenImpl(t):t;core_1.isClass(o)&&(e=this.getMetaConfig(o));}return e?core_1.lang.assign({},e,n||{}):n||{}}, t.prototype.getDecorator=function(){return decorators.Annotation.toString()}, t.prototype.getMetaConfig=function(t){var n=this.container.resolve(core_1.AnnotationMetaAccessorToken,{decorator:this.getDecorator()});return n?n.getMetadata(t,this.container):null}, t.prototype.isEqual=function(t){return!!t&&(t===this||t.constructor===this.constructor)}, t.prototype.resolveToken=function(t,n){return this.container.resolve(t)}, t.classAnnations={name:"AnnotationBuilder",params:{constructor:[],build:["token","config","data"],buildByConfig:["config","data"],createInstance:["token","config","data"],getBuilder:["token","config"],buildStrategy:["instance","config"],getType:["config"],registerExts:["config"],getTokenMetaConfig:["token","config"],getDecorator:[],getMetaConfig:["token"],isEqual:["build"],resolveToken:["token","data"]}}, tslib_1.__decorate([core_1.Inject(core_1.ContainerToken),tslib_1.__metadata("design:type",Object)],t.prototype,"container",void 0), t=i=tslib_1.__decorate([core_1.Injectable(IAnnotationBuilder.AnnotationBuilderToken),tslib_1.__metadata("design:paramtypes",[])],t)}();exports.AnnotationBuilder=AnnotationBuilder;



});

unwrapExports(AnnotationBuilder_1);
var AnnotationBuilder_2 = AnnotationBuilder_1.AnnotationBuilder;

var annotations = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});tslib_1.__exportStar(AnnotationBuilder_1,exports), tslib_1.__exportStar(IAnnotationBuilder,exports);



});

unwrapExports(annotations);

var ModuleBuilder_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var InjectModuleLoadToken=function(t){function e(e){return t.call(this,e,"module_loader")||this}return tslib_1.__extends(e,t), e.classAnnations={name:"InjectModuleLoadToken",params:{constructor:["token"]}}, e}(core_1.Registration);exports.InjectModuleLoadToken=InjectModuleLoadToken;var ModuleBuilder=function(){function e(){}return e.prototype.getPools=function(){return this.pools}, e.prototype.build=function(u,s,l){return tslib_1.__awaiter(this,void 0,void 0,function(){var t,n,r,o,a,i;return tslib_1.__generator(this,function(e){switch(e.label){case 0:return[4,this.load(u,s)];case 1:return t=e.sent(), n=t.container, r=t.config, o=this.getAnnoBuilder(n,t.token,r.annotationBuilder), t.token?[3,3]:[4,o.buildByConfig(r,l)];case 2:return[2,a=e.sent()];case 3:return[4,o.build(t.token,r,l)];case 4:return a=e.sent(), (i=a)&&core_1.isFunction(i.mdOnInit)&&i.mdOnInit(t), [2,a]}})})}, e.prototype.bootstrap=function(l,c,d){return tslib_1.__awaiter(this,void 0,void 0,function(){var t,n,r,o,a,i,u,s;return tslib_1.__generator(this,function(e){switch(e.label){case 0:return[4,this.load(l,c)];case 1:return t=e.sent(), n=t.config, r=t.container, [4,this.build(l,t,d)];case 2:return o=e.sent(), a=this.getBootType(n), i=this.getAnnoBuilder(r,a,n.annotationBuilder), [4,a?i.build(a,n,d):i.buildByConfig(n,d)];case 3:return(u=e.sent())?[4,this.autoRun(r,a||i.getType(n),n,u,d)]:[3,7];case 4:return s=e.sent(), o&&core_1.isFunction(o.mdOnStart)?[4,Promise.resolve(o.mdOnStart(u))]:[3,6];case 5:e.sent(), e.label=6;case 6:return[3,9];case 7:return[4,this.autoRun(r,t.token,n,o,d)];case 8:s=e.sent(), e.label=9;case 9:return[2,s]}})})}, e.prototype.import=function(r,o){return tslib_1.__awaiter(this,void 0,void 0,function(){var t,n;return tslib_1.__generator(this,function(e){switch(e.label){case 0:return o?[3,2]:[4,this.getParentContainer()];case 1:o=e.sent(), e.label=2;case 2:return t=core_1.isClass(r)?r:o.getTokenImpl(r), core_1.isClass(t)?(n=new InjectedModule_1.InjectedModuleToken(t), o.hasRegister(n.toString())?[2,o.get(n)]:[3,3]):[3,5];case 3:return[4,o.loadModule(t)];case 4:if(e.sent(), o.has(n))return[2,o.get(n)];e.label=5;case 5:return[2,null]}})})}, e.prototype.load=function(i,u){return tslib_1.__awaiter(this,void 0,void 0,function(){var t,n,r,o,a;return tslib_1.__generator(this,function(e){switch(e.label){case 0:return u instanceof InjectedModule_1.InjectedModule?[2,u]:(t=null, [4,this.getParentContainer(u)]);case 1:return n=e.sent(), core_1.isToken(i)?[4,this.import(i,n)]:[3,3];case 2:return(t=e.sent())||(r=n.get(core_1.AnnotationMetaAccessorToken).getMetadata(i,n), t=new InjectedModule_1.InjectedModule(i,r,n)), [3,10];case 3:return o=this.getType(i), core_1.isToken(o)?[4,this.import(o,n)]:[3,7];case 4:return(t=e.sent())instanceof InjectedModule_1.InjectedModule?(a=t.container, [4,a.get(DIModuleInjector_1.DIModuleInjectorToken).importByConfig(a,i)]):[3,6];case 5:e.sent(), t.config=core_1.lang.assign(t.config,i), e.label=6;case 6:return[3,8];case 7:o=null, e.label=8;case 8:return t?[3,10]:[4,n.get(DIModuleInjector_1.DIModuleInjectorToken).importByConfig(n,i)];case 9:e.sent(), t=new InjectedModule_1.InjectedModule(o,i,n), e.label=10;case 10:return[2,t]}})})}, e.prototype.getParentContainer=function(n){return tslib_1.__awaiter(this,void 0,void 0,function(){var t;return tslib_1.__generator(this,function(e){return n&&(n instanceof core_1.Container?t=n:n instanceof InjectedModule_1.InjectedModule&&(t=n.container.parent)), t||(t=this.getPools().getDefault()), [2,t]})})}, e.prototype.autoRun=function(i,t,n,u,s){return tslib_1.__awaiter(this,void 0,void 0,function(){var r,o,a;return tslib_1.__generator(this,function(e){switch(e.label){case 0:return u?u instanceof runnable.Runner?[4,u.run(s)]:[3,2]:[2,null];case 1:return e.sent(), [2,u];case 2:return u instanceof runnable.Service?[4,u.start(s)]:[3,4];case 3:return e.sent(), [2,u];case 4:return a={token:t,instance:u,config:n}, i.getTokenExtendsChain(t).forEach(function(e){if(r||o)return!1;var t=new runnable.InjectRunnerToken(e);i.has(t)&&(r=i.resolve(t,a));var n=new runnable.InjectServiceToken(e);return i.has(n)&&(o=i.resolve(n,a)), !0}), r||this.getDefaultRunner(i,a), r||o||this.getDefaultService(i,a), r?[4,r.run(s)]:[3,6];case 5:return e.sent(), [2,r];case 6:return o?[4,o.start(s)]:[3,8];case 7:return e.sent(), [2,o];case 8:return t&&n.autorun?[4,i.invoke(t,n.autorun,u,{data:s})]:[3,10];case 9:return e.sent(), [2,u];case 10:return[2,u]}})})}, e.prototype.getDefaultRunner=function(e){for(var t=[],n=1;n<arguments.length;n++)t[n-1]=arguments[n];return e.has(runnable.DefaultRunnerToken)?e.resolve.apply(e,[runnable.DefaultRunnerToken].concat(t)):null}, e.prototype.getDefaultService=function(e){for(var t=[],n=1;n<arguments.length;n++)t[n-1]=arguments[n];return e.has(runnable.DefaultServiceToken)?e.resolve.apply(e,[runnable.DefaultServiceToken].concat(t)):null}, e.prototype.getAnnoBuilder=function(n,e,t){var r;return core_1.isClass(t)&&(n.has(t)||n.register(t)), core_1.isToken(t)?r=n.resolve(t):t instanceof annotations.AnnotationBuilder&&(r=t), !r&&e&&n.getTokenExtendsChain(e).forEach(function(e){if(r)return!1;var t=new annotations.InjectAnnotationBuilder(e);return n.has(t)&&(r=n.resolve(t)), !0}), r||(r=this.getDefaultAnnBuilder(n)), r&&(r.container=n), r}, e.prototype.getDefaultAnnBuilder=function(e){return e.has(annotations.DefaultAnnotationBuilderToken)?e.resolve(annotations.DefaultAnnotationBuilderToken):e.resolve(annotations.AnnotationBuilderToken)}, e.prototype.getType=function(e){return e.token||e.type}, e.prototype.getBootType=function(e){return e.bootstrap}, e.classAnnations={name:"ModuleBuilder",params:{constructor:[],getPools:[],build:["token","env","data"],bootstrap:["token","env","data"],import:["token","parent"],load:["token","env"],getParentContainer:["env"],autoRun:["container","token","cfg","instance","data"],getDefaultRunner:["container","providers"],getDefaultService:["container","providers"],getAnnoBuilder:["container","token","annBuilder"],getDefaultAnnBuilder:["container"],getType:["cfg"],getBootType:["cfg"]}}, tslib_1.__decorate([core_1.Inject(utils.ContainerPoolToken),tslib_1.__metadata("design:type",utils.ContainerPool)],e.prototype,"pools",void 0), e=tslib_1.__decorate([core_1.Singleton(IModuleBuilder.ModuleBuilderToken),tslib_1.__metadata("design:paramtypes",[])],e)}();exports.ModuleBuilder=ModuleBuilder;



});

unwrapExports(ModuleBuilder_1);
var ModuleBuilder_2 = ModuleBuilder_1.InjectModuleLoadToken;
var ModuleBuilder_3 = ModuleBuilder_1.ModuleBuilder;

var modules = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});tslib_1.__exportStar(DIModuleInjector_1,exports), tslib_1.__exportStar(DIModuleValidate,exports), tslib_1.__exportStar(InjectedModule_1,exports), tslib_1.__exportStar(IModuleBuilder,exports), tslib_1.__exportStar(ModuleBuilder_1,exports);



});

unwrapExports(modules);

var BootModule_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var BootModule=function(){function o(o){this.container=o;}return o.prototype.setup=function(){var o=this.container,e=o.get(core_1.LifeScopeToken);e.registerDecorator(decorators.DIModule,core_1.CoreActions.bindProvider,core_1.CoreActions.cache,core_1.CoreActions.componentBeforeInit,core_1.CoreActions.componentInit,core_1.CoreActions.componentAfterInit), e.registerDecorator(decorators.Bootstrap,core_1.CoreActions.bindProvider,core_1.CoreActions.cache,core_1.CoreActions.componentBeforeInit,core_1.CoreActions.componentInit,core_1.CoreActions.componentAfterInit), o.use(annotations,modules,boot);}, o.classAnnations={name:"BootModule",params:{constructor:["container"],setup:[]}}, o=tslib_1.__decorate([core_1.IocExt("setup"),tslib_1.__param(0,core_1.Inject(core_1.ContainerToken)),tslib_1.__metadata("design:paramtypes",[Object])],o)}();exports.BootModule=BootModule;



});

unwrapExports(BootModule_1);
var BootModule_2 = BootModule_1.BootModule;

var ApplicationBuilder = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var ApplicationEvents;!function(t){t.onRootContainerCreated="onRootContainerCreated", t.onRootContainerInited="onRooConatianerInited";}(ApplicationEvents=exports.ApplicationEvents||(exports.ApplicationEvents={}));var DefaultApplicationBuilder=function(i){function e(t){var e=i.call(this)||this;return e.baseURL=t, e.inited=!1, e.customRegs=[], e.globalModules=[], e.configs=[], e.beforeInitPds=new core_1.MapSet, e.afterInitPds=new core_1.MapSet, e.events=new utils.Events, e.initEvents(), e}return tslib_1.__extends(e,i), e.prototype.initEvents=function(){var t=this;this.events.on("onRooConatianerInited",function(n){t.afterInitPds.forEach(function(t,e){n.bindProvider(e,t);});});}, e.create=function(t){return new e(t)}, e.prototype.on=function(t,e){return this.events.on(t,e), this}, e.prototype.off=function(t,e){return this.events.off(t,e), this}, e.prototype.emit=function(t){for(var e,n=[],i=1;i<arguments.length;i++)n[i-1]=arguments[i];(e=this.events).emit.apply(e,[t].concat(n));}, e.prototype.getPools=function(){return this.pools||(this.pools=new utils.ContainerPool(this.createContainerBuilder()), this.createDefaultContainer()), this.pools}, e.prototype.createContainerBuilder=function(){return new core_1.DefaultContainerBuilder}, e.prototype.useConfiguration=function(t){core_1.isUndefined(t)&&(t=""), this.globalConfig=null;var e=this.configs.indexOf(t);return 0<=e&&this.configs.splice(e,1), this.configs.push(t), this}, e.prototype.loadConfig=function(t,e){return t.has(AppConfigure.AppConfigureLoaderToken)?t.resolve(AppConfigure.AppConfigureLoaderToken,{baseURL:this.baseURL,container:t}).load(e):e?t.getBuilder().loader.load([e]).then(function(t){return t.length?t[0]:null}):Promise.resolve(null)}, e.prototype.use=function(){for(var t=[],e=0;e<arguments.length;e++)t[e]=arguments[e];return this.globalModules=this.globalModules.concat(t), this.inited=!1, this}, e.prototype.provider=function(t,e,n){return n?this.beforeInitPds.set(t,e):this.afterInitPds.set(t,e), this}, e.prototype.load=function(e,n){return tslib_1.__awaiter(this,void 0,void 0,function(){return tslib_1.__generator(this,function(t){switch(t.label){case 0:return[4,this.initRootContainer()];case 1:return t.sent(), [2,i.prototype.load.call(this,e,n)]}})})}, e.prototype.build=function(n,i,o){return tslib_1.__awaiter(this,void 0,void 0,function(){var e;return tslib_1.__generator(this,function(t){switch(t.label){case 0:return[4,this.load(n,i)];case 1:return e=t.sent(), [4,this.getBuilder(e).build(n,e,o)];case 2:return[2,t.sent()]}})})}, e.prototype.bootstrap=function(n,i,o){return tslib_1.__awaiter(this,void 0,void 0,function(){var e;return tslib_1.__generator(this,function(t){switch(t.label){case 0:return[4,this.load(n,i)];case 1:return e=t.sent(), [4,this.getBuilder(e).bootstrap(n,e,o)];case 2:return[2,t.sent()]}})})}, e.prototype.getBuilderByConfig=function(n,i){return tslib_1.__awaiter(this,void 0,void 0,function(){var e;return tslib_1.__generator(this,function(t){switch(t.label){case 0:return[4,this.load(n,i)];case 1:return e=t.sent(), [2,this.getBuilder(e)]}})})}, e.prototype.getBuilder=function(t){var n,e=t.config,i=t.container;e&&(core_1.isClass(e.builder)&&(i.has(e.builder)||i.register(e.builder)), core_1.isToken(e.builder)?n=i.resolve(e.builder):e.builder instanceof modules.ModuleBuilder&&(n=e.builder));var o=t.token;return!n&&o&&i.getTokenExtendsChain(o).forEach(function(t){if(n)return!1;var e=new modules.InjectModuleBuilderToken(t);return i.has(e)&&(n=i.get(e)), !0}), n||(n=this.getDefaultBuilder(i)), n||this}, e.prototype.getDefaultBuilder=function(t){return t.has(modules.DefaultModuleBuilderToken)?t.resolve(modules.DefaultModuleBuilderToken):t.resolve(modules.ModuleBuilderToken)}, e.prototype.getGlobalConfig=function(i){return tslib_1.__awaiter(this,void 0,void 0,function(){var e,n=this;return tslib_1.__generator(this,function(t){switch(t.label){case 0:return this.globalConfig?[3,3]:[4,this.getDefaultConfig(i)];case 1:return e=t.sent(), this.configs.length<1&&this.configs.push(""), [4,Promise.all(this.configs.map(function(t){return core_1.isString(t)?n.loadConfig(i,t):t}))];case 2:t.sent().forEach(function(t){t&&core_1.lang.assign(e,t);}), this.globalConfig=e, t.label=3;case 3:return[2,this.globalConfig]}})})}, e.prototype.createDefaultContainer=function(){var t=this,n=this.pools.getDefault();return n.register(BootModule_1.BootModule), n.getBuilder().getInjectorChain(n).first(n.resolve(modules.DIModuleInjectorToken)), n.bindProvider(utils.ContainerPoolToken,function(){return t.getPools()}), this.beforeInitPds.forEach(function(t,e){n.bindProvider(e,t);}), this.events.emit(ApplicationEvents.onRootContainerCreated,n), n}, e.prototype.initRootContainer=function(n){return tslib_1.__awaiter(this,void 0,void 0,function(){var e;return tslib_1.__generator(this,function(t){switch(t.label){case 0:return this.inited?[2]:(n=n||this.getPools().getDefault(), [4,this.getGlobalConfig(n)]);case 1:return e=t.sent(), [4,this.registerExts(n,e)];case 2:return t.sent(), this.bindAppConfig(e), n.bindProvider(AppConfigure.AppConfigureToken,e), this.inited=!0, this.events.emit(ApplicationEvents.onRootContainerInited,n), [2]}})})}, e.prototype.registerExts=function(i,o){return tslib_1.__awaiter(this,void 0,void 0,function(){var e,n=this;return tslib_1.__generator(this,function(t){switch(t.label){case 0:return this.globalModules.length?(e=this.globalModules, [4,i.loadModule.apply(i,e)]):[3,2];case 1:t.sent(), t.label=2;case 2:return this.customRegs.length?[4,Promise.all(this.customRegs.map(function(e){return tslib_1.__awaiter(n,void 0,void 0,function(){return tslib_1.__generator(this,function(t){switch(t.label){case 0:return[4,e(i,o,this)];case 1:return[2,t.sent()]}})})}))]:[3,4];case 3:t.sent(), t.label=4;case 4:return[2,i]}})})}, e.prototype.bindAppConfig=function(t){return this.baseURL&&(t.baseURL=this.baseURL), t}, e.prototype.getDefaultConfig=function(e){return tslib_1.__awaiter(this,void 0,void 0,function(){return tslib_1.__generator(this,function(t){return e.has(AppConfigure.DefaultConfigureToken)?[2,e.resolve(AppConfigure.DefaultConfigureToken)]:[2,{}]})})}, e.classAnnations={name:"DefaultApplicationBuilder",params:{constructor:["baseURL"],initEvents:[],create:["baseURL"],on:["name","event"],off:["name","event"],emit:["name","args"],getPools:[],createContainerBuilder:[],useConfiguration:["config"],loadConfig:["container","src"],use:["modules"],provider:["provide","provider","beforRootInit"],load:["token","env"],build:["token","env","data"],bootstrap:["token","env","data"],getBuilderByConfig:["token","env"],getBuilder:["injmdl"],getDefaultBuilder:["container"],getGlobalConfig:["container"],createDefaultContainer:[],initRootContainer:["container"],registerExts:["container","config"],bindAppConfig:["config"],getDefaultConfig:["container"]}}, e}(modules.ModuleBuilder);exports.DefaultApplicationBuilder=DefaultApplicationBuilder;



});

unwrapExports(ApplicationBuilder);
var ApplicationBuilder_1 = ApplicationBuilder.ApplicationEvents;
var ApplicationBuilder_2 = ApplicationBuilder.DefaultApplicationBuilder;

var IApplicationBuilder = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.ApplicationBuilderToken=new core_1.InjectToken("DI_AppBuilder");



});

unwrapExports(IApplicationBuilder);
var IApplicationBuilder_1 = IApplicationBuilder.ApplicationBuilderToken;

var boot = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});tslib_1.__exportStar(AppConfigure,exports), tslib_1.__exportStar(ApplicationBuilder,exports), tslib_1.__exportStar(IApplicationBuilder,exports);



});

unwrapExports(boot);

var D__workspace_github_tsioc_packages_bootstrap_lib = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});tslib_1.__exportStar(decorators,exports), tslib_1.__exportStar(boot,exports), tslib_1.__exportStar(annotations,exports), tslib_1.__exportStar(modules,exports), tslib_1.__exportStar(runnable,exports), tslib_1.__exportStar(utils,exports), tslib_1.__exportStar(BootModule_1,exports);



});

var index$6 = unwrapExports(D__workspace_github_tsioc_packages_bootstrap_lib);

return index$6;

})));
