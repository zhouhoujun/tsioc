(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('tslib'), require('reflect-metadata')) :
	typeof define === 'function' && define.amd ? define(['tslib', 'reflect-metadata'], factory) :
	(global.core = global.core || {}, global.core.umd = global.core.umd || {}, global.core.umd.js = factory(global.tslib_1,global.Reflect));
}(this, (function (tslib_1,require$$0) { 'use strict';

tslib_1 = tslib_1 && tslib_1.hasOwnProperty('default') ? tslib_1['default'] : tslib_1;
require$$0 = require$$0 && require$$0.hasOwnProperty('default') ? require$$0['default'] : require$$0;

function commonjsRequire () {
	throw new Error('Dynamic requires are not currently supported by rollup-plugin-commonjs');
}

function unwrapExports (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

/*
object-assign
(c) Sindre Sorhus
@license MIT
*/

/* eslint-disable no-unused-vars */
var getOwnPropertySymbols = Object.getOwnPropertySymbols;
var hasOwnProperty = Object.prototype.hasOwnProperty;
var propIsEnumerable = Object.prototype.propertyIsEnumerable;

function toObject(val) {
	if (val === null || val === undefined) {
		throw new TypeError('Object.assign cannot be called with null or undefined');
	}

	return Object(val);
}

function shouldUseNative() {
	try {
		if (!Object.assign) {
			return false;
		}

		// Detect buggy property enumeration order in older V8 versions.

		// https://bugs.chromium.org/p/v8/issues/detail?id=4118
		var test1 = new String('abc');  // eslint-disable-line no-new-wrappers
		test1[5] = 'de';
		if (Object.getOwnPropertyNames(test1)[0] === '5') {
			return false;
		}

		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
		var test2 = {};
		for (var i = 0; i < 10; i++) {
			test2['_' + String.fromCharCode(i)] = i;
		}
		var order2 = Object.getOwnPropertyNames(test2).map(function (n) {
			return test2[n];
		});
		if (order2.join('') !== '0123456789') {
			return false;
		}

		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
		var test3 = {};
		'abcdefghijklmnopqrst'.split('').forEach(function (letter) {
			test3[letter] = letter;
		});
		if (Object.keys(Object.assign({}, test3)).join('') !==
				'abcdefghijklmnopqrst') {
			return false;
		}

		return true;
	} catch (err) {
		// We don't expect any of the above to throw, but better to be safe.
		return false;
	}
}

var objectAssign = shouldUseNative() ? Object.assign : function (target, source) {
	var from;
	var to = toObject(target);
	var symbols;

	for (var s = 1; s < arguments.length; s++) {
		from = Object(arguments[s]);

		for (var key in from) {
			if (hasOwnProperty.call(from, key)) {
				to[key] = from[key];
			}
		}

		if (getOwnPropertySymbols) {
			symbols = getOwnPropertySymbols(from);
			for (var i = 0; i < symbols.length; i++) {
				if (propIsEnumerable.call(from, symbols[i])) {
					to[symbols[i]] = from[symbols[i]];
				}
			}
		}
	}

	return to;
};

var lang_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var lang;!function(e){function i(e){if(typeCheck.isObject(e)){if(typeCheck.isFunction(Object.keys))return Object.keys(e);var t=[];for(var n in e)t.push(n);return t}return[]}function t(n,r){typeCheck.isArray(n)?n.forEach(r):typeCheck.isObject(n)&&i(n).forEach(function(e,t){r(n[e],e);});}e.keys=i, e.values=function(e){if(typeCheck.isObject(e)){if(typeCheck.isFunction(Object.values))return Object.values(e);var t=[];for(var n in e)t.push(e[n]);return t}return[]}, e.assign=function(e,t,n,r){return r&&r.length?(r.unshift(n||{}), r.unshift(t||{}), objectAssign.apply(void 0,[e].concat(r))):n?objectAssign(e,t||{},n):objectAssign(e,t||{})}, e.omit=function(t){for(var n=[],e=1;e<arguments.length;e++)n[e-1]=arguments[e];if(typeCheck.isObject(t)){var r={};return i(t).forEach(function(e){n.indexOf(e)<0&&(r[e]=t[e]);}), r}return t}, e.hasField=function(e){return 0<i(e).length}, e.forIn=t, e.find=function(e,n){var r;t(e,function(e,t){return!(r||n(e,t)&&(r=e, 1))});}, e.getParentClass=function(e){var t=Reflect.getPrototypeOf(e.prototype);return typeCheck.isClass(t)?t:t.constructor}, e.first=function(e){return typeCheck.isArray(e)&&e.length?e[0]:null}, e.last=function(e){return typeCheck.isArray(e)&&e.length?e[e.length-1]:null};}(lang=exports.lang||(exports.lang={}));



});

unwrapExports(lang_1);
var lang_2 = lang_1.lang;

var typeCheck = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});function isFunction(t){return!!t&&"function"==typeof t}function isAbstractDecoratorClass(t){return!!isFunction(t)&&!!Reflect.hasOwnMetadata("@Abstract",t)}function getClassName(t){return isFunction(t)?/^[a-z]$/.test(t.name)&&t.classAnnations?t.classAnnations.name:t.name:""}function isClass(t){if(!isFunction(t))return!1;if(t.prototype){if(!t.name||"Object"===t.name)return!1;if(Reflect.hasOwnMetadata("@Abstract",t))return!1;var e=t;if(/^[a-z]$/.test(e.name))return!(!e.classAnnations||!e.classAnnations.name);if(e.classAnnations&&isString(e.classAnnations.name))return!0;if(!/^[A-Z@]/.test(t.name))return!1;if(!isNodejsEnv()&&/MSIE [6-9]/.test(navigator.userAgent))return!0;try{return t.arguments&&t.caller, !1}catch(t){return!0}}return!1}function isNodejsEnv(){return"undefined"!=typeof process&&void 0!==process.versions.node}function isToken(t){return!!t&&!!(isString(t)||isSymbol(t)||isClass(t)||isObject(t)&&t instanceof Registration_1.Registration)}function isPromise(t){return!!t&&!(!isFunction(t.then)||!isFunction(t.catch))}function isObservable(t){return!(!t&&!isObject(t))&&!(!isFunction(t.subscribe)||!isFunction(t.toPromise))}function isBaseObject(t){return!!t&&!(!t.constructor||"Object"!==t.constructor.name)}function isMetadataObject(t,e,s){return!!t&&(!(isBaseType(t)||isSymbol(t)||t instanceof Registration_1.Registration||t instanceof RegExp||t instanceof Date)&&((!t.constructor||"Object"===t.constructor.name)&&(e=e||[], s&&(e=s.concat(e)), !e.length||lang_1.lang.keys(t).some(function(t){return 0<e.indexOf(t)}))))}function isClassMetadata(t,e){return isMetadataObject(t,["singleton","provide","alias","type"],e)}function isParamMetadata(t,e){return isMetadataObject(t,["type","provider","index"],e)}function isParamPropMetadata(t,e){return isMetadataObject(t,["type","provider","index"],e)}function isPropertyMetadata(t,e){return isMetadataObject(t,["type","provider"],e)}function isString(t){return"string"==typeof t}function isBoolean(t){return"boolean"==typeof t||!0===t||!1===t}function isNumber(t){return"number"==typeof t}function isUndefined(t){return void 0===t||void 0===t}function isNull(t){return null===t}function isArray(t){return Array.isArray(t)}function isObject(t){var e=typeof t;return null!=t&&("object"===e||"function"===e)}function isDate(t){return isObject(t)&&t instanceof Date}function isSymbol(t){return"symbol"==typeof t||isObject(t)&&/^Symbol\(/.test(t.toString())}function isRegExp(t){return t&&t instanceof RegExp}function isBaseType(t){return isNull(t)||isUndefined(t)||isBoolean(t)||isString(t)||isNumber(t)}exports.isFunction=isFunction, exports.isAbstractDecoratorClass=isAbstractDecoratorClass, exports.getClassName=getClassName, exports.isClass=isClass, exports.isNodejsEnv=isNodejsEnv, exports.isToken=isToken, exports.isPromise=isPromise, exports.isObservable=isObservable, exports.isBaseObject=isBaseObject, exports.isMetadataObject=isMetadataObject, exports.isClassMetadata=isClassMetadata, exports.isParamMetadata=isParamMetadata, exports.isParamPropMetadata=isParamPropMetadata, exports.isPropertyMetadata=isPropertyMetadata, exports.isString=isString, exports.isBoolean=isBoolean, exports.isNumber=isNumber, exports.isUndefined=isUndefined, exports.isNull=isNull, exports.isArray=isArray, exports.isObject=isObject, exports.isDate=isDate, exports.isSymbol=isSymbol, exports.isRegExp=isRegExp, exports.isBaseType=isBaseType;



});

unwrapExports(typeCheck);
var typeCheck_1 = typeCheck.isFunction;
var typeCheck_2 = typeCheck.isAbstractDecoratorClass;
var typeCheck_3 = typeCheck.getClassName;
var typeCheck_4 = typeCheck.isClass;
var typeCheck_5 = typeCheck.isNodejsEnv;
var typeCheck_6 = typeCheck.isToken;
var typeCheck_7 = typeCheck.isPromise;
var typeCheck_8 = typeCheck.isObservable;
var typeCheck_9 = typeCheck.isBaseObject;
var typeCheck_10 = typeCheck.isMetadataObject;
var typeCheck_11 = typeCheck.isClassMetadata;
var typeCheck_12 = typeCheck.isParamMetadata;
var typeCheck_13 = typeCheck.isParamPropMetadata;
var typeCheck_14 = typeCheck.isPropertyMetadata;
var typeCheck_15 = typeCheck.isString;
var typeCheck_16 = typeCheck.isBoolean;
var typeCheck_17 = typeCheck.isNumber;
var typeCheck_18 = typeCheck.isUndefined;
var typeCheck_19 = typeCheck.isNull;
var typeCheck_20 = typeCheck.isArray;
var typeCheck_21 = typeCheck.isObject;
var typeCheck_22 = typeCheck.isDate;
var typeCheck_23 = typeCheck.isSymbol;
var typeCheck_24 = typeCheck.isRegExp;
var typeCheck_25 = typeCheck.isBaseType;

var MapSet_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var ObjectMapSet=function(){function e(){this.valueMap={}, this.keyMap={};}return e.prototype.clear=function(){this.valueMap={}, this.keyMap={};}, e.prototype.getTypeKey=function(e){return typeCheck.isString(e)?e:typeCheck.isFunction(e)?e.name:e.toString()}, e.prototype.keys=function(){return lang_1.lang.values(this.keyMap)}, e.prototype.values=function(){return lang_1.lang.values(this.valueMap)}, e.prototype.delete=function(e){var t=this.getTypeKey(e).toString();try{return delete this.keyMap[t], delete this.valueMap[t], !0}catch(e){return!1}}, e.prototype.forEach=function(n,e){var a=this;lang_1.lang.forIn(this.keyMap,function(e,t){n(a.valueMap[t],e,a);});}, e.prototype.get=function(e){var t=this.getTypeKey(e);return this.valueMap[t]}, e.prototype.has=function(e){var t=this.getTypeKey(e);return!typeCheck.isUndefined(this.keyMap[t])}, e.prototype.set=function(e,t){var n=this.getTypeKey(e);return this.keyMap[n]=e, this.valueMap[n]=t, this}, Object.defineProperty(e.prototype,"size",{get:function(){return lang_1.lang.keys(this.keyMap).length},enumerable:!0,configurable:!0}), e.classAnnations={name:"ObjectMapSet",params:{constructor:[],clear:[],getTypeKey:["key"],keys:[],values:[],delete:["key"],forEach:["callbackfn","thisArg"],get:["key"],has:["key"],set:["key","value"]}}, e}();exports.ObjectMapSet=ObjectMapSet;var MapSet=function(){function e(){this.map=typeCheck.isClass(Map)?new Map:new ObjectMapSet;}return e.prototype.keys=function(){return this.map.keys()}, e.prototype.values=function(){return this.map.values()}, e.prototype.clear=function(){this.map.clear();}, e.prototype.delete=function(e){return this.map.delete(e)}, e.prototype.forEach=function(e,t){this.map.forEach(e,t);}, e.prototype.get=function(e){return this.map.get(e)}, e.prototype.has=function(e){return this.map.has(e)}, e.prototype.set=function(e,t){return this.map.set(e,t), this}, Object.defineProperty(e.prototype,"size",{get:function(){return this.map.size},enumerable:!0,configurable:!0}), e.classAnnations={name:"MapSet",params:{constructor:[],keys:[],values:[],clear:[],delete:["key"],forEach:["callbackfn","thisArg"],get:["key"],has:["key"],set:["key","value"]}}, e}();exports.MapSet=MapSet;



});

unwrapExports(MapSet_1);
var MapSet_2 = MapSet_1.ObjectMapSet;
var MapSet_3 = MapSet_1.MapSet;

var PromiseUtil_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var PromiseUtil,Defer=function(){function t(){var t=this;this.promise=new Promise(function(e,r){t.resolve=e, t.reject=r;});}return t.create=function(e){var r=new t;return e&&(r.promise=r.promise.then(e)), r}, t.classAnnations={name:"Defer",params:{create:["then"],constructor:[]}}, t}();exports.Defer=Defer, function(e){function o(e,n,r){var o=new Defer,i=Promise.resolve(r),c=e?e.length:0;return c?(e.forEach(function(r,t){i=i.then(function(e){return typeCheck.isFunction(r)?r(e):r}).then(function(e){return!1===n(e)?(o.resolve("complete"), Promise.reject("complete")):t===c-1?(o.resolve("complete"), Promise.reject("complete")):e});}), i.catch(function(e){return e})):o.reject("array empty."), o.promise}e.forEach=o, e.step=function(e){var t=Promise.resolve(null);return e.forEach(function(r){t=t.then(function(e){return typeCheck.isFunction(r)?r(e):r});}), t}, e.find=function(e,r,t){var n=new Defer;return o(e,function(e){return!r(e)||(n.resolve(e), !1)},t).then(function(){return n.resolve(null)}).catch(function(){n.resolve(null);}), n.promise};}(PromiseUtil=exports.PromiseUtil||(exports.PromiseUtil={}));



});

unwrapExports(PromiseUtil_1);
var PromiseUtil_2 = PromiseUtil_1.Defer;
var PromiseUtil_3 = PromiseUtil_1.PromiseUtil;

var utils = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});tslib_1.__exportStar(typeCheck,exports), tslib_1.__exportStar(MapSet_1,exports), tslib_1.__exportStar(lang_1,exports), tslib_1.__exportStar(PromiseUtil_1,exports);



});

unwrapExports(utils);

var Registration_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var Registration=function(){function i(t,s){if(this.type="Reg", t instanceof i){this.classType=t.getProvide();var e=t.getDesc();this.desc=e&&s&&e!==s?e+"_"+s:s;}else this.classType=t, this.desc=s;}return i.prototype.getProvide=function(){return this.classType}, i.prototype.getClass=function(){return utils.isClass(this.classType)?this.classType:null}, i.prototype.getDesc=function(){return this.desc}, i.prototype.toString=function(){var t="";return utils.isFunction(this.classType)?t="{"+utils.getClassName(this.classType)+"}":this.classType&&(t=this.classType.toString()), (this.type+" "+t+" "+this.desc).trim()}, i.classAnnations={name:"Registration",params:{constructor:["provideType","desc"],getProvide:[],getClass:[],getDesc:[],toString:[]}}, i}();exports.Registration=Registration;



});

unwrapExports(Registration_1);
var Registration_2 = Registration_1.Registration;

var InjectToken_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var InjectToken=function(t){function e(e){return t.call(this,e,"")||this}return tslib_1.__extends(e,t), e.classAnnations={name:"InjectToken",params:{constructor:["desc"]}}, e}(Registration_1.Registration);exports.InjectToken=InjectToken;



});

unwrapExports(InjectToken_1);
var InjectToken_2 = InjectToken_1.InjectToken;

var IContainer = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.ContainerToken=new InjectToken_1.InjectToken("DI_IContainer");



});

unwrapExports(IContainer);
var IContainer_1 = IContainer.ContainerToken;

var types = createCommonjsModule(function (module, exports) {
var IocState,Mode;Object.defineProperty(exports,"__esModule",{value:!0}), function(e){e.design="design", e.runtime="runtime";}(IocState=exports.IocState||(exports.IocState={})), function(e){e[e.route=1]="route", e[e.children=2]="children", e[e.traverse=3]="traverse", e[e.traverseLast=4]="traverseLast";}(Mode=exports.Mode||(exports.Mode={}));



});

unwrapExports(types);
var types_1 = types.IocState;
var types_2 = types.Mode;

var IMethodAccessor = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.MethodAccessorToken=new InjectToken_1.InjectToken("DI_IMethodAccessor");



});

unwrapExports(IMethodAccessor);
var IMethodAccessor_1 = IMethodAccessor.MethodAccessorToken;

var NullComponent_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var NullComponent=function(){function t(){}return t.prototype.isEmpty=function(){return!0}, t.prototype.add=function(t){return this}, t.prototype.remove=function(t){return this}, t.prototype.find=function(t,e){return exports.NullNode}, t.prototype.filter=function(t,e){return[]}, t.prototype.each=function(t,e){}, t.prototype.trans=function(t){}, t.prototype.transAfter=function(t){}, t.prototype.routeUp=function(t){}, t.prototype.equals=function(t){return t===exports.NullNode}, t.prototype.empty=function(){return exports.NullNode}, t.classAnnations={name:"NullComponent",params:{isEmpty:[],add:["action"],remove:["action"],find:["express","mode"],filter:["express","mode"],each:["express","mode"],trans:["express"],transAfter:["express"],routeUp:["express"],equals:["node"],empty:[]}}, t}();exports.NullComponent=NullComponent, exports.NullNode=new NullComponent;



});

unwrapExports(NullComponent_1);
var NullComponent_2 = NullComponent_1.NullComponent;
var NullComponent_3 = NullComponent_1.NullNode;

var GComposite_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var GComposite=function(){function t(t){this.name=t, this.children=[];}return t.prototype.add=function(t){return(t.parent=this).children.push(t), this}, t.prototype.remove=function(e){var t;return(t=utils.isString(e)?this.find(function(t){return utils.isString(e)?t.name===e:t.equals(e)}):e||this).parent?this.equals(t.parent)?(this.children.splice(this.children.indexOf(t),1), t.parent=null, this):(t.parent.remove(t), null):this}, t.prototype.find=function(e,t){var r;return this.each(function(t){return!r&&(!(utils.isFunction(e)?e(t):e===t)||(r=t, !1))},t), r||this.empty()}, t.prototype.filter=function(e,t){var r=[];return this.each(function(t){e(t)&&r.push(t);},t), r}, t.prototype.each=function(t,e){var r;switch(e=e||types.Mode.traverse){case types.Mode.route:r=this.routeUp(t);break;case types.Mode.children:r=this.eachChildren(t);break;case types.Mode.traverse:r=this.trans(t);break;case types.Mode.traverseLast:r=this.transAfter(t);break;default:r=this.trans(t);}return r}, t.prototype.eachChildren=function(e){(this.children||[]).forEach(function(t){return e(t)});}, t.prototype.routeUp=function(t){return!1!==t(this)&&(this.parent&&this.parent.routeUp?this.parent.routeUp(t):void 0)}, t.prototype.trans=function(t){if(!1===t(this))return!1;for(var e=this.children||[],r=0;r<e.length;r++){var n=e[r].trans(t);if(!1===n)return n}return!0}, t.prototype.transAfter=function(t){for(var e=this.children||[],r=0;r<e.length;r++){if(!1===e[r].transAfter(t))return!1}return!1!==t(this)}, t.prototype.equals=function(t){return this===t}, t.prototype.empty=function(){return NullComponent_1.NullNode}, t.prototype.isEmpty=function(){return this.equals(this.empty())}, t.classAnnations={name:"GComposite",params:{constructor:["name"],add:["node"],remove:["node"],find:["express","mode"],filter:["express","mode"],each:["iterate","mode"],eachChildren:["iterate"],routeUp:["iterate"],trans:["express"],transAfter:["express"],equals:["node"],empty:[],isEmpty:[]}}, t}();exports.GComposite=GComposite;



});

unwrapExports(GComposite_1);
var GComposite_2 = GComposite_1.GComposite;

var Composite_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var Composite=function(o){function e(e){return o.call(this,e)||this}return tslib_1.__extends(e,o), e.prototype.find=function(e,t){return o.prototype.find.call(this,e,t)}, e.prototype.filter=function(e,t){return o.prototype.filter.call(this,e,t)}, e.prototype.each=function(e,t){return o.prototype.each.call(this,e,t)}, e.prototype.eachChildren=function(e){o.prototype.eachChildren.call(this,e);}, e.classAnnations={name:"Composite",params:{constructor:["name"],find:["express","mode"],filter:["express","mode"],each:["express","mode"],eachChildren:["express"]}}, e}(GComposite_1.GComposite);exports.Composite=Composite;



});

unwrapExports(Composite_1);
var Composite_2 = Composite_1.Composite;

var components = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});tslib_1.__exportStar(Composite_1,exports), tslib_1.__exportStar(GComposite_1,exports), tslib_1.__exportStar(NullComponent_1,exports);



});

unwrapExports(components);

var NullAction = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var NullActionClass=function(t){function e(){return null!==t&&t.apply(this,arguments)||this}return tslib_1.__extends(e,t), e.prototype.insert=function(t,e){return this}, e.prototype.execute=function(t,e,n){}, e.prototype.empty=function(){return exports.NullAction}, e.classAnnations={name:"NullActionClass",params:{insert:["action","index"],execute:["container","data","name"],empty:[]}}, e}(components.NullComponent);exports.NullAction=new NullActionClass;



});

unwrapExports(NullAction);
var NullAction_1 = NullAction.NullAction;

var ActionComposite_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var ActionComposite=function(e){function o(t){var n=e.call(this,t)||this;return n.children=[], n}return tslib_1.__extends(o,e), o.prototype.insert=function(t,n){return t.parent=this, n<0?n=0:n>=this.children.length&&(n=this.children.length-1), this.children.splice(n,0,t), this}, o.prototype.execute=function(n,e,i){i?this.find(function(t){return t.name===i}).execute(n,e):this.trans(function(t){t instanceof o&&t.working(n,e);});}, o.prototype.empty=function(){return NullAction.NullAction}, o.prototype.working=function(t,n){}, o.classAnnations={name:"ActionComposite",params:{constructor:["name"],insert:["node","index"],execute:["container","data","name"],empty:[],working:["container","data"]}}, o}(components.GComposite);exports.ActionComposite=ActionComposite;



});

unwrapExports(ActionComposite_1);
var ActionComposite_2 = ActionComposite_1.ActionComposite;

var LifeState_1 = createCommonjsModule(function (module, exports) {
var LifeState;Object.defineProperty(exports,"__esModule",{value:!0}), function(e){e.beforeCreateArgs="beforeCreateArgs", e.beforeConstructor="beforeConstructor", e.afterConstructor="afterConstructor", e.onInit="onInit", e.AfterInit="AfterInit";}(LifeState=exports.LifeState||(exports.LifeState={}));



});

unwrapExports(LifeState_1);
var LifeState_2 = LifeState_1.LifeState;

var CoreActions_1 = createCommonjsModule(function (module, exports) {
var CoreActions;Object.defineProperty(exports,"__esModule",{value:!0}), function(e){e.bindParameterType="bindParameterType", e.bindPropertyType="bindPropertyType", e.injectProperty="injectProperty", e.bindProvider="bindProvider", e.bindParameterProviders="bindParameterProviders", e.cache="cache", e.componentBeforeInit="componentBeforeInit", e.componentInit="componentInit", e.componentAfterInit="componentAfterInit", e.singletion="singletion", e.autorun="autorun", e.methodAutorun="methodAutorun";}(CoreActions=exports.CoreActions||(exports.CoreActions={}));



});

unwrapExports(CoreActions_1);
var CoreActions_2 = CoreActions_1.CoreActions;

var ArgsIterator_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var ArgsIterator=function(){function t(t){this.args=t, this.idx=-1, this.metadata=null;}return t.prototype.isCompeted=function(){return this.idx>=this.args.length}, t.prototype.end=function(){this.idx=this.args.length;}, t.prototype.next=function(t){if(this.idx++, this.isCompeted())return null;var a=this.args[this.idx];t.isMetadata&&t.isMetadata(a)?(this.metadata=utils.lang.assign(this.metadata||{},a), this.end()):t.match(a)?(this.metadata=this.metadata||{}, t.setMetadata(this.metadata,a)):(utils.isMetadataObject(a)&&(this.metadata=utils.lang.assign(this.metadata||{},a)), this.end());}, t.prototype.getArgs=function(){return this.args}, t.prototype.getMetadata=function(){return this.metadata}, t.classAnnations={name:"ArgsIterator",params:{constructor:["args"],isCompeted:[],end:[],next:["express"],getArgs:[],getMetadata:[]}}, t}();exports.ArgsIterator=ArgsIterator;



});

unwrapExports(ArgsIterator_1);
var ArgsIterator_2 = ArgsIterator_1.ArgsIterator;

var DecoratorType_1 = createCommonjsModule(function (module, exports) {
var DecoratorType;Object.defineProperty(exports,"__esModule",{value:!0}), function(e){e[e.Class=1]="Class", e[e.Parameter=2]="Parameter", e[e.Property=4]="Property", e[e.Method=8]="Method", e[e.All=13]="All";}(DecoratorType=exports.DecoratorType||(exports.DecoratorType={}));



});

unwrapExports(DecoratorType_1);
var DecoratorType_2 = DecoratorType_1.DecoratorType;

var DecoratorFactory = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0}), require$$0;function createDecorator(r,s,n){var o="@"+r,t=function(){for(var t=[],a=0;a<arguments.length;a++)t[a]=arguments[a];var e=null;return t.length<1?function(){for(var t=[],a=0;a<arguments.length;a++)t[a]=arguments[a];return storeMetadata(r,o,t,e,n)}:(e=argsToMetadata(t,s))?function(){for(var t=[],a=0;a<arguments.length;a++)t[a]=arguments[a];return storeMetadata(r,o,t,e,n)}:1!==t.length||utils.isClass(t[0])?storeMetadata(r,o,t,e,n):function(){for(var t=[],a=0;a<arguments.length;a++)t[a]=arguments[a];return storeMetadata(r,o,t,e,n)}};return t.toString=function(){return o}, t.decoratorType=DecoratorType_1.DecoratorType.All, t}function argsToMetadata(t,a){var e=null;if(t.length)if(a){var r=new ArgsIterator_1.ArgsIterator(t);a(r), e=r.getMetadata();}else 1===t.length&&utils.isMetadataObject(t[0])&&(e=t[0]);return e}function storeMetadata(t,a,e,r,s){var n;switch(e.length){case 1:if(n=e[0], utils.isClass(n)||utils.isAbstractDecoratorClass(n))return setTypeMetadata(t,a,n,r,s), n;break;case 2:setPropertyMetadata(t,a,n=e[0],e[1],r,s);break;case 3:if(utils.isNumber(e[2])){setParamMetadata(t,a,n=e[0],e[1],e[2],r,s);}else{if(!utils.isUndefined(e[2])){n=e[0];var o=e[1],i=e[2];return setMethodMetadata(t,a,n,o,i,r,s), i}setPropertyMetadata(t,a,n=e[0],e[1],r,s);}break;default:throw new Error("Invalid @"+t+" Decorator declaration.")}}function getTypeMetadata(t,a){var e=Reflect.getOwnMetadata(utils.isFunction(t)?t.toString():t,a);return e=utils.isArray(e)?e:[]}function getOwnTypeMetadata(t,a){var e=Reflect.getOwnMetadata(utils.isFunction(t)?t.toString():t,a);return e=utils.isArray(e)?e:[]}function hasClassMetadata(t,a){var e=utils.isFunction(t)?t.toString():t;return Reflect.hasMetadata(e,a)}function hasOwnClassMetadata(t,a){var e=utils.isFunction(t)?t.toString():t;return Reflect.hasOwnMetadata(e,a)}function setTypeMetadata(t,a,e,r,s){var n=getOwnTypeMetadata(a,e).slice(0),o=r||{};o.type||(o.type=e), o.decorator=t, s&&(o=s(o)), n.unshift(o), setParamerterNames(e), Reflect.defineMetadata(a,n,e);}exports.ParamerterName="paramerter_names", exports.createDecorator=createDecorator, exports.getTypeMetadata=getTypeMetadata, exports.getOwnTypeMetadata=getOwnTypeMetadata, exports.hasClassMetadata=hasClassMetadata, exports.hasOwnClassMetadata=hasOwnClassMetadata;var methodMetadataExt="__method";function getMethodMetadata(t,a){var e=utils.isFunction(t)?t.toString():t,r=Reflect.getMetadata(e+methodMetadataExt,a);return r&&!utils.isArray(r)&&utils.lang.hasField(r)||(r=Reflect.getMetadata(e+methodMetadataExt,a.constructor)), utils.isArray(r)?{}:r||{}}function getOwnMethodMetadata(t,a){var e=utils.isFunction(t)?t.toString():t,r=Reflect.getOwnMetadata(e+methodMetadataExt,a);return r&&!utils.isArray(r)&&utils.lang.hasField(r)||(r=Reflect.getOwnMetadata(e+methodMetadataExt,a.constructor)), utils.isArray(r)?{}:r||{}}function hasOwnMethodMetadata(t,a,e){var r=utils.isFunction(t)?t.toString():t;if(e){var s=getOwnMethodMetadata(r,a);return s&&s.hasOwnProperty(e)}return Reflect.hasOwnMetadata(r+methodMetadataExt,a)}function hasMethodMetadata(t,a,e){var r=utils.isFunction(t)?t.toString():t;if(e){var s=getMethodMetadata(r,a);return s&&s.hasOwnProperty(e)}return Reflect.hasMetadata(r+methodMetadataExt,a)}function setMethodMetadata(t,a,e,r,s,n,o){var i=utils.lang.assign({},getOwnMethodMetadata(a,e));i[r]=i[r]||[];var d=n||{};d.decorator=t, d.propertyKey=r, o&&(d=o(d)), i[r].unshift(d), Reflect.defineMetadata(a+methodMetadataExt,i,e.constructor);}exports.getMethodMetadata=getMethodMetadata, exports.getOwnMethodMetadata=getOwnMethodMetadata, exports.hasOwnMethodMetadata=hasOwnMethodMetadata, exports.hasMethodMetadata=hasMethodMetadata;var propertyMetadataExt="__props";function getPropertyMetadata(t,a){var e=utils.isFunction(t)?t.toString():t,r=Reflect.getMetadata(e+propertyMetadataExt,a);return r&&!utils.isArray(r)&&utils.lang.hasField(r)||(r=Reflect.getMetadata(e+propertyMetadataExt,a.constructor)), utils.isArray(r)?{}:r||{}}function getOwnPropertyMetadata(t,a){var e=utils.isFunction(t)?t.toString():t,r=Reflect.getOwnMetadata(e+propertyMetadataExt,a);return r&&!utils.isArray(r)&&utils.lang.hasField(r)||(r=Reflect.getOwnMetadata(e+propertyMetadataExt,a.constructor)), utils.isArray(r)?{}:r||{}}function hasPropertyMetadata(t,a,e){var r=utils.isFunction(t)?t.toString():t;if(e){var s=getPropertyMetadata(r,a);return s&&s.hasOwnProperty(e)}return Reflect.hasMetadata(r+propertyMetadataExt,a)}function setPropertyMetadata(t,a,e,r,s,n){var o=utils.lang.assign({},getOwnPropertyMetadata(a,e)),i=s||{};if(i.propertyKey=r, i.decorator=t, !i.type){var d=Reflect.getMetadata("design:type",e,r);d||(d=Reflect.getMetadata("design:type",e.constructor,r)), i.type=d;}n&&(i=n(i)), o[r]&&utils.isArray(o[r])||(o[r]=[]), o[r].unshift(i), Reflect.defineMetadata(a+propertyMetadataExt,o,e.constructor);}exports.getPropertyMetadata=getPropertyMetadata, exports.getOwnPropertyMetadata=getOwnPropertyMetadata, exports.hasPropertyMetadata=hasPropertyMetadata;var paramsMetadataExt="__params";function getParamMetadata(t,a,e){var r=utils.isFunction(t)?t.toString():t,s=Reflect.getMetadata(r+paramsMetadataExt,a,e);return s=utils.isArray(s)?s:[]}function getOwnParamMetadata(t,a,e){var r=utils.isFunction(t)?t.toString():t,s=Reflect.getOwnMetadata(r+paramsMetadataExt,a,e);return s=utils.isArray(s)?s:[]}function hasParamMetadata(t,a,e){var r=utils.isFunction(t)?t.toString():t;return Reflect.hasMetadata(r+paramsMetadataExt,a,e)}function hasOwnParamMetadata(t,a,e){var r=utils.isFunction(t)?t.toString():t;return Reflect.hasOwnMetadata(r+paramsMetadataExt,a,e)}function setParamMetadata(t,a,e,r,s,n,o){for(var i=getOwnParamMetadata(a,e,r).slice(0);i.length<=s;)i.push(null);i[s]=i[s]||[];var d=n||{};if(!d.type){var u=Reflect.getOwnMetadata("design:type",e,r);u||(u=Reflect.getOwnMetadata("design:type",e.constructor,r)), d.type=u;}d.propertyKey=r, d.decorator=t, d.index=s, o&&(d=o(d)), i[s].unshift(d), Reflect.defineMetadata(a+paramsMetadataExt,i,e,r);}function getParamerterNames(t){var a=Reflect.getMetadata(exports.ParamerterName,t);return a&&!utils.isArray(a)&&utils.lang.hasField(a)||(a=Reflect.getMetadata(exports.ParamerterName,t.constructor)), utils.isArray(a)?{}:a||{}}function getOwnParamerterNames(t){var a=Reflect.getOwnMetadata(exports.ParamerterName,t);return a&&!utils.isArray(a)&&utils.lang.hasField(a)||(a=Reflect.getOwnMetadata(exports.ParamerterName,t.constructor)), utils.isArray(a)?{}:a||{}}function setParamerterNames(t){var e=utils.lang.assign({},getParamerterNames(t)),a=Object.getOwnPropertyDescriptors(t.prototype),r=/^[a-z]/.test(t.name),s="";t.classAnnations&&t.classAnnations.params&&(s=t.classAnnations.name, e=utils.lang.assign(e,t.classAnnations.params)), r||t.name===s||(utils.lang.forIn(a,function(t,a){"constructor"!==a&&(t.value&&(e[a]=getParamNames(t.value)), t.set&&(e[a]=getParamNames(t.set)));}), e.constructor=getParamNames(t.prototype.constructor)), Reflect.defineMetadata(exports.ParamerterName,e,t);}exports.getParamMetadata=getParamMetadata, exports.getOwnParamMetadata=getOwnParamMetadata, exports.hasParamMetadata=hasParamMetadata, exports.hasOwnParamMetadata=hasOwnParamMetadata, exports.getParamerterNames=getParamerterNames, exports.getOwnParamerterNames=getOwnParamerterNames, exports.setParamerterNames=setParamerterNames;var STRIP_COMMENTS=/((\/\/.*$)|(\/\*[\s\S]*?\*\/))/gm,ARGUMENT_NAMES=/([^\s,]+)/g;function getParamNames(t){if(!utils.isFunction(t))return[];var a=t.toString().replace(STRIP_COMMENTS,""),e=a.slice(a.indexOf("(")+1,a.indexOf(")")).match(ARGUMENT_NAMES);return null===e&&(e=[]), e}



});

unwrapExports(DecoratorFactory);
var DecoratorFactory_1 = DecoratorFactory.ParamerterName;
var DecoratorFactory_2 = DecoratorFactory.createDecorator;
var DecoratorFactory_3 = DecoratorFactory.getTypeMetadata;
var DecoratorFactory_4 = DecoratorFactory.getOwnTypeMetadata;
var DecoratorFactory_5 = DecoratorFactory.hasClassMetadata;
var DecoratorFactory_6 = DecoratorFactory.hasOwnClassMetadata;
var DecoratorFactory_7 = DecoratorFactory.getMethodMetadata;
var DecoratorFactory_8 = DecoratorFactory.getOwnMethodMetadata;
var DecoratorFactory_9 = DecoratorFactory.hasOwnMethodMetadata;
var DecoratorFactory_10 = DecoratorFactory.hasMethodMetadata;
var DecoratorFactory_11 = DecoratorFactory.getPropertyMetadata;
var DecoratorFactory_12 = DecoratorFactory.getOwnPropertyMetadata;
var DecoratorFactory_13 = DecoratorFactory.hasPropertyMetadata;
var DecoratorFactory_14 = DecoratorFactory.getParamMetadata;
var DecoratorFactory_15 = DecoratorFactory.getOwnParamMetadata;
var DecoratorFactory_16 = DecoratorFactory.hasParamMetadata;
var DecoratorFactory_17 = DecoratorFactory.hasOwnParamMetadata;
var DecoratorFactory_18 = DecoratorFactory.getParamerterNames;
var DecoratorFactory_19 = DecoratorFactory.getOwnParamerterNames;
var DecoratorFactory_20 = DecoratorFactory.setParamerterNames;

var ClassDecoratorFactory = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0}), require$$0;function createClassDecorator(t,e,r){var a=DecoratorFactory.createDecorator(t,function(t){e&&e(t), t.next({match:function(t){return t&&(utils.isSymbol(t)||utils.isString(t)||utils.isObject(t)&&t instanceof Registration_1.Registration)},setMetadata:function(t,e){t.provide=e;}}), t.next({match:function(t){return utils.isString(t)},setMetadata:function(t,e){t.alias=e;}}), t.next({match:function(t){return utils.isBoolean(t)},setMetadata:function(t,e){t.singleton=e;}}), t.next({match:function(t){return utils.isNumber(t)},setMetadata:function(t,e){t.expires=e;}});},r);return a.decoratorType=DecoratorType_1.DecoratorType.Class, a}exports.createClassDecorator=createClassDecorator;



});

unwrapExports(ClassDecoratorFactory);
var ClassDecoratorFactory_1 = ClassDecoratorFactory.createClassDecorator;

var MethodDecoratorFactory = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0}), require$$0;function createMethodDecorator(e,r,t){var o=DecoratorFactory.createDecorator(e,function(e){r&&r(e), e.next({match:function(e){return utils.isArray(e)},setMetadata:function(e,r){e.providers=r;}});},t);return o.decoratorType=DecoratorType_1.DecoratorType.Method, o}exports.createMethodDecorator=createMethodDecorator;



});

unwrapExports(MethodDecoratorFactory);
var MethodDecoratorFactory_1 = MethodDecoratorFactory.createMethodDecorator;

var ParamDecoratorFactory = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0}), require$$0;function createParamDecorator(r,e,t){var a=DecoratorFactory.createDecorator(r,function(r){e&&e(r), r.next({isMetadata:function(r){return utils.isParamMetadata(r)},match:function(r){return utils.isToken(r)},setMetadata:function(r,e){r.provider=e;}});},t);return a.decoratorType=DecoratorType_1.DecoratorType.Parameter, a}exports.createParamDecorator=createParamDecorator;



});

unwrapExports(ParamDecoratorFactory);
var ParamDecoratorFactory_1 = ParamDecoratorFactory.createParamDecorator;

var PropertyDecoratorFactory = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});function createPropDecorator(r,e,t){var o=DecoratorFactory.createDecorator(r,function(r){e&&e(r), r.next({isMetadata:function(r){return utils.isPropertyMetadata(r)},match:function(r){return utils.isToken(r)},setMetadata:function(r,e){r.provider=e;}});},t);return o.decoratorType=DecoratorType_1.DecoratorType.Property, o}exports.createPropDecorator=createPropDecorator;



});

unwrapExports(PropertyDecoratorFactory);
var PropertyDecoratorFactory_1 = PropertyDecoratorFactory.createPropDecorator;

var ParamPropDecoratorFactory = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0}), require$$0;function createParamPropDecorator(r,e,t){var a=DecoratorFactory.createDecorator(r,function(r){e&&e(r), r.next({isMetadata:function(r){return utils.isParamPropMetadata(r)},match:function(r){return utils.isToken(r)},setMetadata:function(r,e){r.provider=e;}});},t);return a.decoratorType=DecoratorType_1.DecoratorType.Property|DecoratorType_1.DecoratorType.Parameter, a}exports.createParamPropDecorator=createParamPropDecorator;



});

unwrapExports(ParamPropDecoratorFactory);
var ParamPropDecoratorFactory_1 = ParamPropDecoratorFactory.createParamPropDecorator;

var ClassMethodDecoratorFactory = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});function createClassMethodDecorator(e,r,o){var t=DecoratorFactory.createDecorator(e,r,o);return t.decoratorType=DecoratorType_1.DecoratorType.Class|DecoratorType_1.DecoratorType.Method, t}exports.createClassMethodDecorator=createClassMethodDecorator;



});

unwrapExports(ClassMethodDecoratorFactory);
var ClassMethodDecoratorFactory_1 = ClassMethodDecoratorFactory.createClassMethodDecorator;

var MethodPropDecoratorFactory = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});function createMethodPropDecorator(r,e,o){var t=DecoratorFactory.createDecorator(r,e,o);return t.decoratorType=DecoratorType_1.DecoratorType.Method|DecoratorType_1.DecoratorType.Property, t}exports.createMethodPropDecorator=createMethodPropDecorator;



});

unwrapExports(MethodPropDecoratorFactory);
var MethodPropDecoratorFactory_1 = MethodPropDecoratorFactory.createMethodPropDecorator;

var MethodPropParamDecoratorFactory = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});function createMethodPropParamDecorator(r,e,o){var t=DecoratorFactory.createDecorator(r,e,o);return t.decoratorType=DecoratorType_1.DecoratorType.Method|DecoratorType_1.DecoratorType.Property|DecoratorType_1.DecoratorType.Parameter, t}exports.createMethodPropParamDecorator=createMethodPropParamDecorator;



});

unwrapExports(MethodPropParamDecoratorFactory);
var MethodPropParamDecoratorFactory_1 = MethodPropParamDecoratorFactory.createMethodPropParamDecorator;

var factories = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});tslib_1.__exportStar(ArgsIterator_1,exports), tslib_1.__exportStar(DecoratorType_1,exports), tslib_1.__exportStar(DecoratorFactory,exports), tslib_1.__exportStar(ClassDecoratorFactory,exports), tslib_1.__exportStar(MethodDecoratorFactory,exports), tslib_1.__exportStar(ParamDecoratorFactory,exports), tslib_1.__exportStar(PropertyDecoratorFactory,exports), tslib_1.__exportStar(ParamPropDecoratorFactory,exports), tslib_1.__exportStar(ClassMethodDecoratorFactory,exports), tslib_1.__exportStar(MethodPropDecoratorFactory,exports), tslib_1.__exportStar(MethodPropParamDecoratorFactory,exports);



});

unwrapExports(factories);

var BindProviderAction_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var BindProviderAction=function(e){function i(){return e.call(this,CoreActions_1.CoreActions.bindProvider)||this}return tslib_1.__extends(i,e), i.prototype.working=function(e,i){var o=i.targetType,r=e.getLifeScope().getClassDecorators(function(e){return e.actions.includes(CoreActions_1.CoreActions.bindProvider)&&factories.hasOwnClassMetadata(e.name,o)}),t=[],n=i.raiseContainer||e;r.forEach(function(e){var i=factories.getOwnTypeMetadata(e.name,o);Array.isArray(i)&&0<i.length&&i.forEach(function(e){if(e&&e.provide){var i=n.getTokenKey(e.provide,e.alias);t.push(i), n.bindProvider(i,e.type);}});}), i.execResult=t;}, i.classAnnations={name:"BindProviderAction",params:{constructor:[],working:["container","data"]}}, i}(ActionComposite_1.ActionComposite);exports.BindProviderAction=BindProviderAction;



});

unwrapExports(BindProviderAction_1);
var BindProviderAction_2 = BindProviderAction_1.BindProviderAction;

var BindParameterTypeAction_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var BindParameterTypeAction=function(e){function t(){return e.call(this,CoreActions_1.CoreActions.bindParameterType)||this}return tslib_1.__extends(t,e), t.prototype.working=function(a,e){if(!e.raiseContainer||e.raiseContainer===a){var i,r=e.target,n=e.targetType,o=e.propertyKey,s=a.getLifeScope();(i=(i=r&&o?Reflect.getMetadata("design:paramtypes",r,o)||[]:Reflect.getMetadata("design:paramtypes",n)||[]).slice(0)).forEach(function(e){s.isVaildDependence(e)&&(a.has(e)||a.register(e));}), s.getParameterDecorators(function(e){return e.actions.includes(CoreActions_1.CoreActions.bindParameterType)&&(r||"constructor"!==o?factories.hasParamMetadata(e.name,r,o):factories.hasOwnParamMetadata(e.name,n))}).forEach(function(e){var t=r||"constructor"!==o?factories.getParamMetadata(e.name,r,o):factories.getOwnParamMetadata(e.name,n);utils.isArray(t)&&t.length&&t.forEach(function(e){var t=utils.isArray(e)&&0<e.length?e[0]:null;if(t&&0<=t.index){s.isVaildDependence(t.provider)&&(a.has(t.provider,t.alias)||a.register(a.getToken(t.provider,t.alias))), s.isVaildDependence(t.type)&&(a.has(t.type)||a.register(t.type));var r=t.provider?a.getTokenKey(t.provider,t.alias):t.type;r&&(i[t.index]=r);}});}), e.execResult=i;}}, t.classAnnations={name:"BindParameterTypeAction",params:{constructor:[],working:["container","data"]}}, t}(ActionComposite_1.ActionComposite);exports.BindParameterTypeAction=BindParameterTypeAction;



});

unwrapExports(BindParameterTypeAction_1);
var BindParameterTypeAction_2 = BindParameterTypeAction_1.BindParameterTypeAction;

var BindPropertyTypeAction_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var BindPropertyTypeAction=function(e){function t(){return e.call(this,CoreActions_1.CoreActions.bindPropertyType)||this}return tslib_1.__extends(t,e), t.prototype.working=function(o,e){if(!e.raiseContainer||e.raiseContainer===o){var i=e.targetType,n=o.getLifeScope(),t=n.getPropertyDecorators(function(e){return e.actions.includes(CoreActions_1.CoreActions.bindPropertyType)&&factories.hasPropertyMetadata(e.name,i)}),a=[];t.forEach(function(e){var t=factories.getPropertyMetadata(e.name,i);for(var r in t)a=a.concat(t[r]);(a=a.filter(function(e){return!!e})).forEach(function(e){n.isVaildDependence(e.provider)&&(o.has(e.provider,e.alias)||o.register(o.getToken(e.provider,e.alias))), n.isVaildDependence(e.type)&&(o.has(e.type)||o.register(e.type));});}), e.execResult=a;}}, t.classAnnations={name:"BindPropertyTypeAction",params:{constructor:[],working:["container","data"]}}, t}(ActionComposite_1.ActionComposite);exports.BindPropertyTypeAction=BindPropertyTypeAction;



});

unwrapExports(BindPropertyTypeAction_1);
var BindPropertyTypeAction_2 = BindPropertyTypeAction_1.BindPropertyTypeAction;

var InjectPropertyAction_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var InjectPropertyAction=function(e){function t(){return e.call(this,CoreActions_1.CoreActions.injectProperty)||this}return tslib_1.__extends(t,e), t.prototype.working=function(o,n){if(n.execResult||this.parent.find(function(e){return e.name===CoreActions_1.CoreActions.bindPropertyType}).execute(o,n), n.target&&n.execResult&&n.execResult.length){var i=n.providerMap;n.execResult.reverse().forEach(function(e,t){if(e){var r=e.provider?o.getToken(e.provider,e.alias):e.type;i&&i.has(r)?n.target[e.propertyKey]=i.resolve(r,i):o.has(r)&&(n.target[e.propertyKey]=o.resolve(r,i));}});}}, t.classAnnations={name:"InjectPropertyAction",params:{constructor:[],working:["container","data"]}}, t}(ActionComposite_1.ActionComposite);exports.InjectPropertyAction=InjectPropertyAction;



});

unwrapExports(InjectPropertyAction_1);
var InjectPropertyAction_2 = InjectPropertyAction_1.InjectPropertyAction;

var BindParameterProviderAction_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var BindParameterProviderAction=function(e){function r(){return e.call(this,CoreActions_1.CoreActions.bindParameterProviders)||this}return tslib_1.__extends(r,e), r.prototype.working=function(e,r){if(!r.raiseContainer||r.raiseContainer===e){var t=r.targetType,o=r.propertyKey,i=e.getLifeScope().getMethodDecorators(function(e){return e.actions.includes(CoreActions_1.CoreActions.bindParameterProviders)&&factories.hasOwnMethodMetadata(e.name,t)}),n=[];i.forEach(function(e){var r=factories.getOwnMethodMetadata(e.name,t)[o];r&&utils.isArray(r)&&0<r.length&&r.forEach(function(e){e.providers&&0<e.providers.length&&(n=n.concat(e.providers));});}), r.execResult=n;}}, r.classAnnations={name:"BindParameterProviderAction",params:{constructor:[],working:["container","data"]}}, r}(ActionComposite_1.ActionComposite);exports.BindParameterProviderAction=BindParameterProviderAction;



});

unwrapExports(BindParameterProviderAction_1);
var BindParameterProviderAction_2 = BindParameterProviderAction_1.BindParameterProviderAction;

var ComponentBeforeInitAction_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var ComponentBeforeInitAction=function(t){function e(){return t.call(this,CoreActions_1.CoreActions.componentBeforeInit)||this}return tslib_1.__extends(e,t), e.prototype.working=function(t,e){if((!e.raiseContainer||e.raiseContainer===t)&&e.targetType&&e.target){var o=e.target;utils.isFunction(o.beforeInit)&&t.syncInvoke(e.targetType,"beforeInit",e.target);}}, e.classAnnations={name:"ComponentBeforeInitAction",params:{constructor:[],working:["container","data"]}}, e}(ActionComposite_1.ActionComposite);exports.ComponentBeforeInitAction=ComponentBeforeInitAction;



});

unwrapExports(ComponentBeforeInitAction_1);
var ComponentBeforeInitAction_2 = ComponentBeforeInitAction_1.ComponentBeforeInitAction;

var ComponentInitAction_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var ComponentInitAction=function(t){function n(){return t.call(this,CoreActions_1.CoreActions.componentInit)||this}return tslib_1.__extends(n,t), n.prototype.working=function(t,n){if((!n.raiseContainer||n.raiseContainer===t)&&n.targetType&&n.target){var o=n.target;utils.isFunction(o.onInit)&&t.syncInvoke(n.targetType,"onInit",n.target);}}, n.classAnnations={name:"ComponentInitAction",params:{constructor:[],working:["container","data"]}}, n}(ActionComposite_1.ActionComposite);exports.ComponentInitAction=ComponentInitAction;



});

unwrapExports(ComponentInitAction_1);
var ComponentInitAction_2 = ComponentInitAction_1.ComponentInitAction;

var ComponentAfterInitAction_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var ComponentAfterInitAction=function(t){function e(){return t.call(this,CoreActions_1.CoreActions.componentAfterInit)||this}return tslib_1.__extends(e,t), e.prototype.working=function(t,e){if((!e.raiseContainer||e.raiseContainer===t)&&e.targetType&&e.target){var n=e.target;utils.isFunction(n.afterInit)&&t.syncInvoke(e.targetType,"afterInit",e.target);}}, e.classAnnations={name:"ComponentAfterInitAction",params:{constructor:[],working:["container","data"]}}, e}(ActionComposite_1.ActionComposite);exports.ComponentAfterInitAction=ComponentAfterInitAction;



});

unwrapExports(ComponentAfterInitAction_1);
var ComponentAfterInitAction_2 = ComponentAfterInitAction_1.ComponentAfterInitAction;

var ICacheManager = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.CacheManagerToken=new InjectToken_1.InjectToken("DI_ICacheManager");



});

unwrapExports(ICacheManager);
var ICacheManager_1 = ICacheManager.CacheManagerToken;

var CacheAction_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var CacheAction=function(e){function t(){return e.call(this,CoreActions_1.CoreActions.cache)||this}return tslib_1.__extends(t,e), t.prototype.working=function(e,t){if(t.raiseContainer&&t.raiseContainer!==e)return t;if(t.singleton||!t.targetType||!utils.isClass(t.targetType))return t;var a=e.get(ICacheManager.CacheManagerToken);if(t.target){if(!a.hasCache(t.targetType))(r=this.getCacheMetadata(e,t))&&a.cache(t.targetType,t.target,r.expires);}else{var r,i=a.get(t.targetType);if(i)(r=this.getCacheMetadata(e,t))&&(a.cache(t.targetType,i,r.expires), t.execResult=i);}return t}, t.prototype.getCacheMetadata=function(e,t){for(var a,r=e.getLifeScope().getClassDecorators(function(e){return factories.hasOwnClassMetadata(e.name,t.targetType)}),i=0;i<r.length;i++){var n=r[i],o=factories.getOwnTypeMetadata(n.name,t.targetType);if(Array.isArray(o)&&0<o.length&&(a=o.find(function(e){return e&&utils.isNumber(e.expires)&&0<e.expires})))break}return a}, t.classAnnations={name:"CacheAction",params:{constructor:[],working:["container","data"],getCacheMetadata:["container","data"]}}, t}(ActionComposite_1.ActionComposite);exports.CacheAction=CacheAction;



});

unwrapExports(CacheAction_1);
var CacheAction_2 = CacheAction_1.CacheAction;

var SingletonAction = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var SingletionAction=function(t){function e(){return t.call(this,CoreActions_1.CoreActions.singletion)||this}return tslib_1.__extends(e,t), e.prototype.working=function(t,e){e.raiseContainer&&e.raiseContainer!==t||e.tokenKey&&e.target&&e.singleton&&t.registerValue(e.tokenKey,e.target);}, e.classAnnations={name:"SingletionAction",params:{constructor:[],working:["container","data"]}}, e}(ActionComposite_1.ActionComposite);exports.SingletionAction=SingletionAction;



});

unwrapExports(SingletonAction);
var SingletonAction_1 = SingletonAction.SingletionAction;

var Component = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.Component=factories.createClassDecorator("Component");



});

unwrapExports(Component);
var Component_1 = Component.Component;

var Injectable = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.Injectable=factories.createClassDecorator("Injectable");



});

unwrapExports(Injectable);
var Injectable_1 = Injectable.Injectable;

var Inject = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.Inject=factories.createParamPropDecorator("Inject");



});

unwrapExports(Inject);
var Inject_1 = Inject.Inject;

var AutoWried = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.AutoWired=factories.createParamPropDecorator("AutoWired");



});

unwrapExports(AutoWried);
var AutoWried_1 = AutoWried.AutoWired;

var Param = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.Param=factories.createParamDecorator("Param");



});

unwrapExports(Param);
var Param_1 = Param.Param;

var Method = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.Method=factories.createMethodDecorator("Method");



});

unwrapExports(Method);
var Method_1 = Method.Method;

var Singleton = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.Singleton=factories.createClassDecorator("Singleton",null,function(e){return e.singleton=!0, e});



});

unwrapExports(Singleton);
var Singleton_1 = Singleton.Singleton;

var Abstract = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.Abstract=factories.createClassDecorator("Abstract");



});

unwrapExports(Abstract);
var Abstract_1 = Abstract.Abstract;

var AutoRun = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.Autorun=factories.createClassMethodDecorator("Autorun",function(t){t.next({isMetadata:function(t){return utils.isClassMetadata(t,["autorun"])},match:function(t){return utils.isString(t)||utils.isNumber(t)},setMetadata:function(t,e){utils.isString(e)?t.autorun=e:t.order=e;}});},function(t){return t.singleton=!0, t});



});

unwrapExports(AutoRun);
var AutoRun_1 = AutoRun.Autorun;

var IocExt = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.IocExt=factories.createClassDecorator("IocExt",function(t){t.next({isMetadata:function(t){return utils.isClassMetadata(t,["autorun"])},match:function(t){return utils.isString(t)},setMetadata:function(t,e){t.autorun=e;}});},function(t){return t.singleton=!0, t}), exports.IocModule=exports.IocExt;



});

unwrapExports(IocExt);
var IocExt_1 = IocExt.IocExt;
var IocExt_2 = IocExt.IocModule;

var decorators = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});tslib_1.__exportStar(Component,exports), tslib_1.__exportStar(Injectable,exports), tslib_1.__exportStar(Inject,exports), tslib_1.__exportStar(AutoWried,exports), tslib_1.__exportStar(Param,exports), tslib_1.__exportStar(Method,exports), tslib_1.__exportStar(Singleton,exports), tslib_1.__exportStar(Abstract,exports), tslib_1.__exportStar(AutoRun,exports), tslib_1.__exportStar(IocExt,exports);



});

unwrapExports(decorators);

var AutorunAction_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var AutorunAction=function(t){function o(){return t.call(this,CoreActions_1.CoreActions.autorun)||this}return tslib_1.__extends(o,t), o.prototype.getDecorator=function(){return[decorators.IocExt,decorators.Autorun]}, o.prototype.working=function(n,i){i.raiseContainer&&i.raiseContainer!==n||i.tokenKey&&i.targetType&&this.getDecorator().forEach(function(t){if(factories.hasClassMetadata(t,i.targetType)){var o=factories.getTypeMetadata(t,i.targetType),e=o.find(function(t){return!!t.autorun});if(!e&&o.length&&(e=o[0]), e){var r=n.get(i.tokenKey);r&&e.autorun&&utils.isFunction(r[e.autorun])&&n.syncInvoke(i.tokenKey,e.autorun,r);}}});}, o.classAnnations={name:"AutorunAction",params:{constructor:[],getDecorator:[],working:["container","data"]}}, o}(ActionComposite_1.ActionComposite);exports.AutorunAction=AutorunAction;



});

unwrapExports(AutorunAction_1);
var AutorunAction_2 = AutorunAction_1.AutorunAction;

var actions = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});tslib_1.__exportStar(ActionComposite_1,exports), tslib_1.__exportStar(LifeState_1,exports), tslib_1.__exportStar(CoreActions_1,exports), tslib_1.__exportStar(NullAction,exports), tslib_1.__exportStar(BindProviderAction_1,exports), tslib_1.__exportStar(BindParameterTypeAction_1,exports), tslib_1.__exportStar(BindPropertyTypeAction_1,exports), tslib_1.__exportStar(InjectPropertyAction_1,exports), tslib_1.__exportStar(BindParameterProviderAction_1,exports), tslib_1.__exportStar(ComponentBeforeInitAction_1,exports), tslib_1.__exportStar(ComponentInitAction_1,exports), tslib_1.__exportStar(ComponentAfterInitAction_1,exports), tslib_1.__exportStar(CacheAction_1,exports), tslib_1.__exportStar(SingletonAction,exports), tslib_1.__exportStar(AutorunAction_1,exports);



});

unwrapExports(actions);

var ProviderMap_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.ProviderMapToken=new InjectToken_1.InjectToken("DI_ProviderMap");var ProviderMap=function(){function t(t){this.container=t, this.maps=new utils.MapSet;}return t.prototype.has=function(t){return this.maps.has(t)}, t.prototype.get=function(t){return this.maps.get(t)}, t.prototype.add=function(t,o){var e,n=this;return utils.isUndefined(t)||(e=utils.isToken(o)&&this.container.has(o)?function(){for(var t,e=[],r=0;r<arguments.length;r++)e[r]=arguments[r];return(t=n.container).resolve.apply(t,[o].concat(e))}:utils.isFunction(o)?function(){for(var t=[],e=0;e<arguments.length;e++)t[e]=arguments[e];return o.apply(void 0,[n.container].concat(t))}:function(){return o}, this.maps.set(t,e)), this}, t.prototype.remove=function(t){return this.maps.has(t)&&this.maps.delete(t), this}, t.prototype.resolve=function(t){for(var e,r,o=[],n=1;n<arguments.length;n++)o[n-1]=arguments[n];if(!this.maps.has(t))return!utils.isNumber(t)&&this.container.has(t)?(e=this.container).resolve.apply(e,[t].concat(o)):null;var i=this.maps.get(t);return utils.isToken(i)?(r=this.container).resolve.apply(r,[i].concat(o)):i.apply(void 0,o)}, t.prototype.forEach=function(t){this.maps.forEach(t);}, t.prototype.copy=function(t){var r=this;t&&t.forEach(function(t,e){r.maps.set(e,t);});}, t.classAnnations={name:"ProviderMap",params:{constructor:["container"],has:["provide"],get:["provide"],add:["provide","provider"],remove:["provide"],resolve:["provide","providers"],forEach:["express"],copy:["map"]}}, t}();exports.ProviderMap=ProviderMap;



});

unwrapExports(ProviderMap_1);
var ProviderMap_2 = ProviderMap_1.ProviderMapToken;
var ProviderMap_3 = ProviderMap_1.ProviderMap;

var Provider_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var Provider=function(){function r(e,t){this.type=e, this.value=t;}return r.prototype.resolve=function(e){for(var t=[],r=1;r<arguments.length;r++)t[r-1]=arguments[r];return utils.isUndefined(this.value)?e.has(this.type)?e.resolve.apply(e,[this.type].concat(t)):null:this.value}, r.create=function(e,t){return new r(e,t)}, r.createExtends=function(e,t,r){return new ExtendsProvider(e,t,r)}, r.createInvoke=function(e,t,r){return new InvokeProvider(e,t,r)}, r.createParam=function(e,t,r,n){return new ParamProvider(e,t,r,n)}, r.classAnnations={name:"Provider",params:{constructor:["type","value"],resolve:["container","providers"],create:["type","value"],createExtends:["token","value","extendsTarget"],createInvoke:["token","method","value"],createParam:["token","value","index","method"]}}, r}(),InvokeProvider=function(o){function e(e,t,r){var n=o.call(this,e,r)||this;return n.method=t, n}return tslib_1.__extends(e,o), e.prototype.resolve=function(e){for(var t=[],r=1;r<arguments.length;r++)t[r-1]=arguments[r];return this.method?e.syncInvoke.apply(e,[this.type,this.method].concat(t)):o.prototype.resolve.apply(this,[e].concat(t))}, e.classAnnations={name:"InvokeProvider",params:{constructor:["type","method","value"],resolve:["container","providers"]}}, e}(exports.Provider=Provider),ParamProvider=function(s){function e(e,t,r,n){var o=s.call(this,e,n,t)||this;return o.index=r, o}return tslib_1.__extends(e,s), e.prototype.resolve=function(e){for(var t=[],r=1;r<arguments.length;r++)t[r-1]=arguments[r];return s.prototype.resolve.apply(this,[e].concat(t))}, e.classAnnations={name:"ParamProvider",params:{constructor:["token","value","index","method"],resolve:["container","providers"]}}, e}(exports.InvokeProvider=InvokeProvider);exports.ParamProvider=ParamProvider;var ExtendsProvider=function(o){function e(e,t,r){var n=o.call(this,e,t)||this;return n.extendsTarget=r, n}return tslib_1.__extends(e,o), e.prototype.resolve=function(e){for(var t=[],r=1;r<arguments.length;r++)t[r-1]=arguments[r];return o.prototype.resolve.apply(this,[e].concat(t))}, e.prototype.extends=function(e){utils.isObject(e)&&utils.isFunction(this.extendsTarget)&&this.extendsTarget(e,this);}, e.classAnnations={name:"ExtendsProvider",params:{constructor:["token","value","extendsTarget"],resolve:["container","providers"],extends:["target"]}}, e}(Provider);exports.ExtendsProvider=ExtendsProvider;



});

unwrapExports(Provider_1);
var Provider_2 = Provider_1.Provider;
var Provider_3 = Provider_1.InvokeProvider;
var Provider_4 = Provider_1.ParamProvider;
var Provider_5 = Provider_1.ExtendsProvider;

var providers = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});function isProviderMap(r){return!!utils.isObject(r)&&r instanceof ProviderMap_1.ProviderMap}tslib_1.__exportStar(Provider_1,exports), tslib_1.__exportStar(ProviderMap_1,exports), exports.isProviderMap=isProviderMap;



});

unwrapExports(providers);
var providers_1 = providers.isProviderMap;

var IRecognizer = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.RecognizerToken=new InjectToken_1.InjectToken("DI_IRecognizer");



});

unwrapExports(IRecognizer);
var IRecognizer_1 = IRecognizer.RecognizerToken;

var IProviderMatcher = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.ProviderMatcherToken=new InjectToken_1.InjectToken("DI_IProviderMatcher");



});

unwrapExports(IProviderMatcher);
var IProviderMatcher_1 = IProviderMatcher.ProviderMatcherToken;

var MethodAutorun_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var MethodAutorun=function(t){function r(){return t.call(this,CoreActions_1.CoreActions.methodAutorun)||this}return tslib_1.__extends(r,t), r.prototype.working=function(r,e){if((!e.raiseContainer||e.raiseContainer===r)&&e.target&&e.targetType&&factories.hasMethodMetadata(decorators.Autorun,e.targetType)){var t=factories.getMethodMetadata(decorators.Autorun,e.targetType),o=[],n=utils.lang.keys(t).length;utils.lang.forIn(t,function(t,r){if(t&&t.length){var e=t[0];e.autorun=r, n++, utils.isNumber(e.order)||(e.order=n), o.push(e);}}), o.sort(function(t,r){return t.order-t.order}).forEach(function(t){r.syncInvoke(e.targetType,t.autorun,e.target);});}}, r.classAnnations={name:"MethodAutorun",params:{constructor:[],working:["container","data"]}}, r}(ActionComposite_1.ActionComposite);exports.MethodAutorun=MethodAutorun;



});

unwrapExports(MethodAutorun_1);
var MethodAutorun_2 = MethodAutorun_1.MethodAutorun;

var ActionFactory_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var ActionFactory=function(){function n(){}return n.prototype.create=function(n){var o;switch(n){case actions.CoreActions.bindParameterType:o=new actions.BindParameterTypeAction;break;case actions.CoreActions.bindPropertyType:o=new actions.BindPropertyTypeAction;break;case actions.CoreActions.injectProperty:o=new actions.InjectPropertyAction;break;case actions.CoreActions.bindProvider:o=new actions.BindProviderAction;break;case actions.CoreActions.bindParameterProviders:o=new actions.BindParameterProviderAction;break;case actions.CoreActions.componentInit:o=new actions.ComponentInitAction;break;case actions.CoreActions.componentBeforeInit:o=new actions.ComponentBeforeInitAction;break;case actions.CoreActions.componentAfterInit:o=new actions.ComponentAfterInitAction;break;case actions.CoreActions.cache:o=new actions.CacheAction;break;case actions.CoreActions.singletion:o=new actions.SingletionAction;break;case actions.CoreActions.autorun:o=new actions.AutorunAction;break;case actions.CoreActions.methodAutorun:o=new MethodAutorun_1.MethodAutorun;break;default:o=new actions.ActionComposite(n);}return o}, n.classAnnations={name:"ActionFactory",params:{create:["type"]}}, n}();exports.ActionFactory=ActionFactory;



});

unwrapExports(ActionFactory_1);
var ActionFactory_2 = ActionFactory_1.ActionFactory;

var DefaultLifeScope_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var DefaultLifeScope=function(){function t(t){this.container=t, this.decorators=[], this.buildAction();}return t.prototype.addAction=function(t){for(var e=[],r=1;r<arguments.length;r++)e[r-1]=arguments[r];var o=this.action;return e.forEach(function(e){o=o.find(function(t){return t.name===e});}), o&&o.add(t), this}, t.prototype.registerDecorator=function(t){for(var e=[],r=1;r<arguments.length;r++)e[r-1]=arguments[r];var o=this.getDecoratorType(t);return this.registerCustomDecorator.apply(this,[t,o].concat(e))}, t.prototype.registerCustomDecorator=function(t,e){for(var r=[],o=2;o<arguments.length;o++)r[o-2]=arguments[o];var a=this.toActionName(e),n=t.toString();return this.decorators.some(function(t){return t.name===n})||this.decorators.push({name:n,types:a,actions:r}), this}, t.prototype.execute=function(t){for(var e=[],r=1;r<arguments.length;r++)e[r-1]=arguments[r];e=e.filter(function(t){return!!t});var o=this.action;e.forEach(function(e){o=o.find(function(t){return t.name===e});}), o&&o.execute(this.container,t);}, t.prototype.routeExecute=function(t){for(var e,r=[],o=1;o<arguments.length;o++)r[o-1]=arguments[o];this.execute.apply(this,[t].concat(r));for(var a=this.container.parent;a;)(e=a.getLifeScope()).execute.apply(e,[utils.lang.assign({},t)].concat(r)), a=a.parent;}, t.prototype.getClassDecorators=function(t){return this.getTypeDecorators(this.toActionName(factories.DecoratorType.Class),t)}, t.prototype.getMethodDecorators=function(t){return this.getTypeDecorators(this.toActionName(factories.DecoratorType.Method),t)}, t.prototype.getPropertyDecorators=function(t){return this.getTypeDecorators(this.toActionName(factories.DecoratorType.Property),t)}, t.prototype.getParameterDecorators=function(t){return this.getTypeDecorators(this.toActionName(factories.DecoratorType.Parameter),t)}, t.prototype.getDecoratorType=function(t){return t.decoratorType||factories.DecoratorType.All}, t.prototype.isVaildDependence=function(e){return!!e&&(!!utils.isClass(e)&&(!utils.isAbstractDecoratorClass(e)&&this.getClassDecorators().some(function(t){return factories.hasOwnClassMetadata(t.name,e)})))}, t.prototype.getAtionByName=function(e){return this.action.find(function(t){return t.name===e})}, t.prototype.getClassAction=function(){return this.getAtionByName(this.toActionName(factories.DecoratorType.Class))}, t.prototype.getMethodAction=function(){return this.getAtionByName(this.toActionName(factories.DecoratorType.Method))}, t.prototype.getPropertyAction=function(){return this.getAtionByName(this.toActionName(factories.DecoratorType.Property))}, t.prototype.getParameterAction=function(){return this.getAtionByName(this.toActionName(factories.DecoratorType.Parameter))}, t.prototype.getConstructorParameters=function(t){return this.getParameters(t)}, t.prototype.getMethodParameters=function(t,e,r){return this.getParameters(t,e,r)}, t.prototype.getParamerterNames=function(t,e){var r=factories.getOwnParamerterNames(t),o=[];return r&&r.hasOwnProperty(e)&&(o=r[e]), utils.isArray(o)||(o=[]), o}, t.prototype.isSingletonType=function(r){return!!factories.hasOwnClassMetadata(decorators.Singleton,r)||this.getClassDecorators().some(function(t){var e=factories.getOwnTypeMetadata(t.name,r)||[];return!!utils.isArray(e)&&e.some(function(t){return!0===t.singleton})})}, t.prototype.getMethodMetadatas=function(r,o){var a=[];return this.getMethodDecorators().forEach(function(t){var e=factories.getOwnMethodMetadata(t.name,r);e.hasOwnProperty(o)&&(a=a.concat(e[o]||[]));}), a}, t.prototype.filerDecorators=function(t){return this.decorators.filter(t)}, t.prototype.getParameters=function(t,e,r){var o={target:e,targetType:t,propertyKey:r=r||"constructor"};this.execute(o,actions.LifeState.onInit,actions.CoreActions.bindParameterType);var a=this.getParamerterNames(t,r);return o.execResult.length?o.execResult.map(function(t,e){return{type:t,name:a[e]}}):a.map(function(t){return{name:t,type:void 0}})}, t.prototype.getTypeDecorators=function(r,o){return this.filerDecorators(function(t){var e=0<=(t.types||"").indexOf(r);return e&&o&&(e=o(t)), e})}, t.prototype.buildAction=function(){var t=new ActionFactory_1.ActionFactory,e=t.create("");e.add(t.create(types.IocState.design).add(t.create(actions.CoreActions.bindProvider)).add(t.create(actions.CoreActions.autorun))).add(t.create(types.IocState.runtime).add(t.create(actions.LifeState.beforeCreateArgs)).add(t.create(actions.LifeState.beforeConstructor)).add(t.create(actions.LifeState.afterConstructor)).add(t.create(actions.LifeState.onInit).add(t.create(actions.CoreActions.componentBeforeInit)).add(t.create(this.toActionName(factories.DecoratorType.Class))).add(t.create(this.toActionName(factories.DecoratorType.Method))).add(t.create(this.toActionName(factories.DecoratorType.Property)).add(t.create(actions.CoreActions.bindPropertyType)).add(t.create(actions.CoreActions.injectProperty))).add(t.create(this.toActionName(factories.DecoratorType.Parameter)).add(t.create(actions.CoreActions.bindParameterType)).add(t.create(actions.CoreActions.bindParameterProviders))).add(t.create(actions.CoreActions.componentInit))).add(t.create(actions.LifeState.AfterInit).add(t.create(actions.CoreActions.singletion)).add(t.create(actions.CoreActions.componentAfterInit)).add(t.create(actions.CoreActions.methodAutorun)))).add(t.create(actions.CoreActions.cache)), this.action=e;}, t.prototype.toActionName=function(t){var e=[];return t&factories.DecoratorType.Class&&e.push("ClassDecorator"), t&factories.DecoratorType.Method&&e.push("MethodDecorator"), t&factories.DecoratorType.Property&&e.push("PropertyDecorator"), t&factories.DecoratorType.Parameter&&e.push("ParameterDecorator"), e.join(",")}, t.classAnnations={name:"DefaultLifeScope",params:{constructor:["container"],addAction:["action","nodepaths"],registerDecorator:["decorator","actions"],registerCustomDecorator:["decorator","type","actions"],execute:["data","names"],routeExecute:["data","names"],getClassDecorators:["match"],getMethodDecorators:["match"],getPropertyDecorators:["match"],getParameterDecorators:["match"],getDecoratorType:["decirator"],isVaildDependence:["target"],getAtionByName:["name"],getClassAction:[],getMethodAction:[],getPropertyAction:[],getParameterAction:[],getConstructorParameters:["type"],getMethodParameters:["type","instance","propertyKey"],getParamerterNames:["type","propertyKey"],isSingletonType:["type"],getMethodMetadatas:["type","propertyKey"],filerDecorators:["express"],getParameters:["type","instance","propertyKey"],getTypeDecorators:["decType","match"],buildAction:[],toActionName:["type"]}}, t}();exports.DefaultLifeScope=DefaultLifeScope;



});

unwrapExports(DefaultLifeScope_1);
var DefaultLifeScope_2 = DefaultLifeScope_1.DefaultLifeScope;

var ProviderMatcher_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var ProviderMatcher=function(){function e(e){this.container=e;}return e.prototype.toProviderMap=function(){for(var s=this,e=[],r=0;r<arguments.length;r++)e[r]=arguments[r];if(1===e.length&&providers.isProviderMap(e[0]))return e[0];var n=this.container.resolve(providers.ProviderMapToken);return e.forEach(function(i,e){if(!utils.isUndefined(i)&&!utils.isNull(i))if(providers.isProviderMap(i))n.copy(i);else if(i instanceof providers.Provider)i instanceof providers.ParamProvider?!i.type&&utils.isNumber(i.index)?n.add(i.index,function(){for(var e=[],r=0;r<arguments.length;r++)e[r]=arguments[r];return i.resolve.apply(i,[s.container].concat(e))}):n.add(i.type,function(){for(var e=[],r=0;r<arguments.length;r++)e[r]=arguments[r];return i.resolve.apply(i,[s.container].concat(e))}):n.add(i.type,function(){for(var e=[],r=0;r<arguments.length;r++)e[r]=arguments[r];return i.resolve.apply(i,[s.container].concat(e))});else if(utils.isClass(i))s.container.has(i)||s.container.register(i), n.add(i,i);else if(utils.isBaseObject(i)){var r=i,t=!1;utils.isToken(r.provide)?(utils.isArray(r.deps)&&r.deps.length&&r.deps.forEach(function(e){utils.isClass(e)&&!s.container.has(e)&&s.container.register(e);}), utils.isUndefined(r.useValue)?utils.isClass(r.useClass)?(s.container.has(r.useClass)||s.container.register(r.useClass), n.add(r.provide,r.useClass)):utils.isFunction(r.useFactory)?n.add(r.provide,function(){var e=[];return utils.isArray(r.deps)&&r.deps.length&&(e=r.deps.map(function(e){return utils.isClass(e)?s.container.get(e):e})), r.useFactory.apply(r,e)}):utils.isToken(r.useExisting)?s.container.has(r.useExisting)?n.add(r.provide,function(){return s.container.resolve(r.useExisting)}):console.log("has not register:",r.useExisting):t=!0:n.add(r.provide,function(){return r.useValue})):t=!0, t&&utils.lang.forIn(i,function(e,r){utils.isUndefined(e)||(utils.isClass(e)?n.add(r,e):utils.isFunction(e)||utils.isString(e)?n.add(r,function(){return e}):n.add(r,e));});}else utils.isFunction(i)?n.add(name,function(){return i}):n.add(e,i);}), n}, e.prototype.matchProviders=function(e){for(var r=[],i=1;i<arguments.length;i++)r[i-1]=arguments[i];return this.match(e,this.toProviderMap.apply(this,r))}, e.prototype.match=function(e,i){var t=this,s=this.container.resolve(providers.ProviderMapToken);return e.length&&e.forEach(function(e,r){e.name&&(i.has(e.name)?s.add(e.name,i.get(e.name)):utils.isToken(e.type)?i.has(e.type)?s.add(e.name,i.get(e.type)):t.container.has(e.type)&&s.add(e.name,e.type):i.has(r)&&s.add(e.name,i.get(r)));}), s}, e.classAnnations={name:"ProviderMatcher",params:{constructor:["container"],toProviderMap:["providers"],matchProviders:["params","providers"],match:["params","providers"]}}, e}();exports.ProviderMatcher=ProviderMatcher;



});

unwrapExports(ProviderMatcher_1);
var ProviderMatcher_2 = ProviderMatcher_1.ProviderMatcher;

var MethodAccessor_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var MethodAccessor=function(){function e(e){this.container=e;}return e.prototype.getMatcher=function(){return this.container.get(IProviderMatcher.ProviderMatcherToken)}, e.prototype.invoke=function(s,c,p){for(var h=[],e=3;e<arguments.length;e++)h[e-3]=arguments[e];return tslib_1.__awaiter(this,void 0,void 0,function(){var t,r,o,n,a,i;return tslib_1.__generator(this,function(e){switch(e.label){case 0:if(p||(p=(t=this.container).resolve.apply(t,[s].concat(h))), !(r=this.container.getTokenImpl(s)))throw Error(s.toString()+" is not implements by any class.");return p&&utils.isFunction(p[c])?(o={target:p,targetType:r,propertyKey:c}, (n=this.container.getLifeScope()).execute(o,actions.LifeState.onInit,actions.CoreActions.bindParameterProviders), h=h.concat(o.execResult), a=n.getMethodParameters(r,p,c), [4,this.createParams.apply(this,[a].concat(h))]):[3,2];case 1:return i=e.sent(), [2,p[c].apply(p,i)];case 2:throw new Error("type: "+r+" has no method "+c.toString()+".")}})})}, e.prototype.syncInvoke=function(e,t,r){for(var o,n=[],a=3;a<arguments.length;a++)n[a-3]=arguments[a];r||(r=(o=this.container).resolve.apply(o,[e].concat(n)));var i=this.container.getTokenImpl(e);if(!i)throw Error(e.toString()+" is not implements by any class.");if(r&&utils.isFunction(r[t])){var s={target:r,targetType:i,propertyKey:t},c=this.container.getLifeScope();c.execute(s,actions.LifeState.onInit,actions.CoreActions.bindParameterProviders), n=n.concat(s.execResult);var p=c.getMethodParameters(i,r,t),h=this.createSyncParams.apply(this,[p].concat(n));return r[t].apply(r,h)}throw new Error("type: "+i+" has no method "+t.toString()+".")}, e.prototype.createSyncParams=function(e){for(var t,o=this,n=[],r=1;r<arguments.length;r++)n[r-1]=arguments[r];var a=(t=this.getMatcher()).matchProviders.apply(t,[e].concat(n));return e.map(function(e,t){var r;return e.name&&a.has(e.name)?a.resolve(e.name):utils.isToken(e.type)?(r=o.container).resolve.apply(r,[e.type].concat(n)):void 0})}, e.prototype.createParams=function(e){for(var t,o=this,n=[],r=1;r<arguments.length;r++)n[r-1]=arguments[r];var a=(t=this.getMatcher()).matchProviders.apply(t,[e].concat(n));return Promise.all(e.map(function(e,t){var r;return e.name&&a.has(e.name)?a.resolve(e.name):utils.isToken(e.type)?(r=o.container).resolve.apply(r,[e.type].concat(n)):void 0}))}, e.classAnnations={name:"MethodAccessor",params:{constructor:["container"],getMatcher:[],invoke:["token","propertyKey","target","providers"],syncInvoke:["token","propertyKey","target","providers"],createSyncParams:["params","providers"],createParams:["params","providers"]}}, e}();exports.MethodAccessor=MethodAccessor;



});

unwrapExports(MethodAccessor_1);
var MethodAccessor_2 = MethodAccessor_1.MethodAccessor;

var CacheManager_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var CacheManager=function(){function e(e){this.container=e, this.cacheTokens=new utils.MapSet;}return e.prototype.isChecking=function(){return!!this.timeout}, e.prototype.hasCache=function(e){return this.cacheTokens.has(e)}, e.prototype.cache=function(e,t,s){var r;this.hasCache(e)?(r=this.cacheTokens.get(e)).expires=Date.now()+s:r={target:t,expires:Date.now()+s}, this.cacheTokens.set(e,r), this.isChecking()||this.checkExpires();}, e.prototype.get=function(e,t){var s=null;if(!this.cacheTokens.has(e))return null;var r=this.cacheTokens.get(e);return r.expires<=Date.now()?(s=r.target, utils.isNumber(t)&&0<t&&(r.expires=Date.now()+t, this.cacheTokens.set(e,r))):this.destroy(e,r.target), s}, e.prototype.checkExpires=function(){var t=this;if(this.timeout&&(clearTimeout(this.timeout), this.timeout=0), 0<this.cacheTokens.size){var s=[];this.cacheTokens.forEach(function(e,t){e.expires>=Date.now()&&s.push(t);}), s.length&&s.forEach(function(e){t.destroy(e,t.cacheTokens.get(e).target);}), this.timeout=setTimeout(function(){t.checkExpires();},6e4);}}, e.prototype.destroy=function(e,t){if(this.hasCache(e)){t||(t=this.cacheTokens.get(e).target);try{var s=t;utils.isFunction(s.onDestroy)&&this.container.syncInvoke(e,"onDestroy",t), this.cacheTokens.delete(e);}catch(e){console.error&&console.error(e);}}}, e.classAnnations={name:"CacheManager",params:{constructor:["container"],isChecking:[],hasCache:["targetType"],cache:["targetType","target","expires"],get:["targetType","expires"],checkExpires:[],destroy:["targetType","target"]}}, e}();exports.CacheManager=CacheManager;



});

unwrapExports(CacheManager_1);
var CacheManager_2 = CacheManager_1.CacheManager;

var core = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});tslib_1.__exportStar(actions,exports), tslib_1.__exportStar(decorators,exports), tslib_1.__exportStar(factories,exports), tslib_1.__exportStar(providers,exports), tslib_1.__exportStar(IRecognizer,exports), tslib_1.__exportStar(IProviderMatcher,exports), tslib_1.__exportStar(ActionFactory_1,exports), tslib_1.__exportStar(DefaultLifeScope_1,exports), tslib_1.__exportStar(ProviderMatcher_1,exports), tslib_1.__exportStar(MethodAccessor_1,exports), tslib_1.__exportStar(CacheManager_1,exports);



});

unwrapExports(core);

var LifeScope = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.LifeScopeToken=new InjectToken_1.InjectToken("DI_LifeScope");



});

unwrapExports(LifeScope);
var LifeScope_1 = LifeScope.LifeScopeToken;

var IContainerBuilder = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.ContainerBuilderToken=new InjectToken_1.InjectToken("DI_IContainerBuilder");



});

unwrapExports(IContainerBuilder);
var IContainerBuilder_1 = IContainerBuilder.ContainerBuilderToken;

var ResolverChain_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.ResolverChainToken=new InjectToken_1.InjectToken("di_ResolverChain");var ResolverChain=function(){function e(e){this.container=e, this.resolvers=[];}return e.prototype.next=function(e){this.hasResolver(e)||this.resolvers.push(e);}, e.prototype.toArray=function(){return[this.container].concat(this.resolvers)}, e.prototype.hasResolver=function(n){return n instanceof Container_1.Container?0<=this.resolvers.indexOf(n):this.resolvers.some(function(e){return!(e instanceof Container_1.Container)&&(!(!e.type||!n.type)&&e.type===n.type)})}, e.prototype.hasToken=function(t,r){var o=this;if(!r)return!1;if(t instanceof Container_1.Container)return t.hasRegister(r);if(t.type===r||this.container.getTokenKey(t.token)===r)return!0;var s=t.exports||[];return s.concat(t.providers||[]).some(function(e){if(o.container.getTokenKey(e)===r)return!0;if(!utils.isClass(r)&&t.container.hasRegister(r)){var n=t.container.getTokenImpl(r);return 0<=s.indexOf(n)}return!1})}, e.prototype.resolve=function(n){for(var e,t,r=this,o=[],s=1;s<arguments.length;s++)o[s-1]=arguments[s];var i=this.toArray().find(function(e){return r.hasToken(e,n)});return i||this.container.parent?i?i instanceof Container_1.Container?i.resolveValue.apply(i,[n].concat(o)):(e=i.container).resolveValue.apply(e,[n].concat(o)):(t=this.container.parent).resolve.apply(t,[n].concat(o)):(console.log("have not register",n), null)}, e.prototype.unregister=function(n){var t=this,e=this.toArray().find(function(e){return t.hasToken(e,n)});if(e)if(e instanceof Container_1.Container)e.unregister(n,!1);else{var r=this.resolvers.indexOf(e);0<=r&&r<this.resolvers.length&&this.resolvers.splice(r,1);}else this.container.parent&&this.container.parent.unregister(n);}, e.prototype.getTokenImpl=function(n){var t=this,e=this.toArray().find(function(e){return t.hasToken(e,n)});return e?e instanceof Container_1.Container?e.getTokenImpl(n,!1):e.container.getTokenImpl(n,!1):this.container.parent?this.container.parent.getTokenImpl(n):null}, e.prototype.hasRegister=function(n){var t=this;return!!this.container.hasRegister(n)||!!this.resolvers.length&&this.resolvers.some(function(e){return t.hasToken(e,n)})}, e.prototype.has=function(e){return!!this.hasRegister(e)||!!this.container.parent&&this.container.parent.has(e)}, e.classAnnations={name:"ResolverChain",params:{constructor:["container"],next:["resolver"],toArray:[],hasResolver:["resolver"],hasToken:["resolver","token"],resolve:["token","providers"],unregister:["token"],getTokenImpl:["token"],hasRegister:["token"],has:["token"]}}, e}();exports.ResolverChain=ResolverChain;



});

unwrapExports(ResolverChain_1);
var ResolverChain_2 = ResolverChain_1.ResolverChainToken;
var ResolverChain_3 = ResolverChain_1.ResolverChain;

var resolves = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});tslib_1.__exportStar(ResolverChain_1,exports);



});

unwrapExports(resolves);

var registerCores_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});function registerCores(e){e.registerSingleton(LifeScope.LifeScopeToken,function(){return new DefaultLifeScope_1.DefaultLifeScope(e)}), e.registerSingleton(ICacheManager.CacheManagerToken,function(){return new core.CacheManager(e)}), e.registerSingleton(resolves.ResolverChainToken,function(){return new resolves.ResolverChain(e)}), e.register(core.ProviderMapToken,function(){return new core.ProviderMap(e)}), e.bindProvider(core.ProviderMap,core.ProviderMapToken), e.registerSingleton(core.ProviderMatcherToken,function(){return new core.ProviderMatcher(e)}), e.registerSingleton(IMethodAccessor.MethodAccessorToken,function(){return new MethodAccessor_1.MethodAccessor(e)});var r=e.get(LifeScope.LifeScopeToken);r.registerDecorator(decorators.Injectable,actions.CoreActions.bindProvider,actions.CoreActions.cache), r.registerDecorator(decorators.Component,actions.CoreActions.bindProvider,actions.CoreActions.cache,actions.CoreActions.componentBeforeInit,actions.CoreActions.componentInit,actions.CoreActions.componentAfterInit), r.registerDecorator(decorators.Singleton,actions.CoreActions.bindProvider), r.registerDecorator(decorators.Abstract,actions.CoreActions.bindProvider,actions.CoreActions.cache), r.registerDecorator(decorators.AutoWired,actions.CoreActions.bindParameterType,actions.CoreActions.bindPropertyType), r.registerDecorator(decorators.Inject,actions.CoreActions.bindParameterType,actions.CoreActions.bindPropertyType), r.registerDecorator(decorators.Param,actions.CoreActions.bindParameterType,actions.CoreActions.bindPropertyType), r.registerDecorator(decorators.Method,actions.CoreActions.bindParameterProviders), r.registerDecorator(decorators.Autorun,actions.CoreActions.autorun,actions.CoreActions.methodAutorun), r.registerDecorator(decorators.IocExt,actions.CoreActions.autorun,actions.CoreActions.componentBeforeInit,actions.CoreActions.componentInit,actions.CoreActions.componentAfterInit), e.register(Date,function(){return new Date}), e.register(String,function(){return""}), e.register(Number,function(){return Number.NaN}), e.register(Boolean,function(){});}exports.registerCores=registerCores;



});

unwrapExports(registerCores_1);
var registerCores_2 = registerCores_1.registerCores;

var Container_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0}), require$$0;var Container=function(){function e(){this.init();}return e.prototype.getRoot=function(){for(var e=this;e.parent;)e=e.parent;return e}, e.prototype.getBuilder=function(){return this.resolveValue(IContainerBuilder.ContainerBuilderToken)}, e.prototype.get=function(e,t){for(var r=[],o=2;o<arguments.length;o++)r[o-2]=arguments[o];return this.resolve.apply(this,[t?this.getTokenKey(e,t):e].concat(r))}, Object.defineProperty(e.prototype,"resolvers",{get:function(){return this.resolveValue(resolves.ResolverChainToken)},enumerable:!0,configurable:!0}), e.prototype.resolve=function(e){for(var t,r=[],o=1;o<arguments.length;o++)r[o-1]=arguments[o];var s=this.getTokenKey(e);return(t=this.resolvers).resolve.apply(t,[s].concat(r))}, e.prototype.resolveValue=function(e){for(var t=[],r=1;r<arguments.length;r++)t[r-1]=arguments[r];var o=this.getTokenKey(e);return this.hasRegister(o)?this.factories.get(o).apply(void 0,t):null}, e.prototype.clearCache=function(e){this.resolveValue(ICacheManager.CacheManagerToken).destroy(e);}, e.prototype.getToken=function(e,t){return t?new Registration_1.Registration(e,t):e}, e.prototype.getTokenKey=function(e,t){return t?new Registration_1.Registration(e,t).toString():e instanceof Registration_1.Registration?e.toString():e}, e.prototype.register=function(e,t){return this.registerFactory(e,t), this}, e.prototype.has=function(e,t){var r=this.getTokenKey(e,t);return this.resolvers.has(r)}, e.prototype.hasRegister=function(e){return this.factories.has(e)}, e.prototype.unregister=function(e,t){var r=this.getTokenKey(e);return!1===t?this.hasRegister(r)&&(this.factories.delete(r), this.provideTypes.has(r)&&this.provideTypes.delete(r), utils.isClass(r)&&this.clearCache(r)):this.resolvers.unregister(r), this}, e.prototype.registerSingleton=function(e,t){return this.registerFactory(e,t,!0), this}, e.prototype.registerValue=function(e,t){var r=this,o=this.getTokenKey(e);return this.singleton.set(o,t), this.factories.has(o)||this.factories.set(o,function(){return r.singleton.get(o)}), this}, e.prototype.bindProvider=function(e,r){var t,o=this,s=this.getTokenKey(e);if(t=utils.isToken(r)?function(){for(var e=[],t=0;t<arguments.length;t++)e[t]=arguments[t];return o.resolve.apply(o,[r].concat(e))}:utils.isFunction(r)?function(){for(var e=[],t=0;t<arguments.length;t++)e[t]=arguments[t];return r.apply(void 0,[o].concat(e))}:function(){return r}, utils.isClass(r))this.has(r)||this.register(r), this.provideTypes.set(s,r);else if(utils.isToken(r))for(var i=r;this.provideTypes.has(i)&&!utils.isClass(i);)if(i=this.provideTypes.get(i), utils.isClass(i)){this.provideTypes.set(s,i);break}return this.factories.set(s,t), this}, e.prototype.getTokenImpl=function(e,t){var r=this.getTokenKey(e);return!1===t?utils.isClass(e)?e:this.provideTypes.has(r)?this.provideTypes.get(r):null:this.resolvers.getTokenImpl(r)}, e.prototype.getTokenExtendsChain=function(e){return utils.isClass(e)?this.getBaseClasses(e):this.getBaseClasses(this.getTokenImpl(e)).concat([e])}, e.prototype.getBaseClasses=function(e){for(var t=[];utils.isClass(e)&&e!==Object;)t.push(e), e=utils.lang.getParentClass(e);return t}, e.prototype.getLifeScope=function(){return this.get(LifeScope.LifeScopeToken)}, e.prototype.use=function(){for(var e,t=[],r=0;r<arguments.length;r++)t[r]=arguments[r];return(e=this.getBuilder()).syncLoadModule.apply(e,[this].concat(t)), this}, e.prototype.loadModule=function(){for(var e,t=[],r=0;r<arguments.length;r++)t[r]=arguments[r];return(e=this.getBuilder()).loadModule.apply(e,[this].concat(t))}, e.prototype.invoke=function(e,t,r){for(var o,s=[],i=3;i<arguments.length;i++)s[i-3]=arguments[i];return(o=this.resolveValue(IMethodAccessor.MethodAccessorToken)).invoke.apply(o,[e,t,r].concat(s))}, e.prototype.syncInvoke=function(e,t,r){for(var o,s=[],i=3;i<arguments.length;i++)s[i-3]=arguments[i];return(o=this.resolveValue(IMethodAccessor.MethodAccessorToken)).syncInvoke.apply(o,[e,t,r].concat(s))}, e.prototype.createSyncParams=function(e){for(var t,r=[],o=1;o<arguments.length;o++)r[o-1]=arguments[o];return(t=this.resolveValue(IMethodAccessor.MethodAccessorToken)).createSyncParams.apply(t,[e].concat(r))}, e.prototype.createParams=function(e){for(var t,r=[],o=1;o<arguments.length;o++)r[o-1]=arguments[o];return(t=this.resolveValue(IMethodAccessor.MethodAccessorToken)).createParams.apply(t,[e].concat(r))}, e.prototype.cacheDecorator=function(e,t){e.has(t.name)||e.set(t.name,t);}, e.prototype.init=function(){var e=this;this.factories=new utils.MapSet, this.singleton=new utils.MapSet, this.provideTypes=new utils.MapSet, this.bindProvider(IContainer.ContainerToken,function(){return e}), registerCores_1.registerCores(this);}, e.prototype.registerFactory=function(e,t,r){var o=this.getTokenKey(e);if(!this.factories.has(o)){var s;if(utils.isUndefined(t)){if(!utils.isString(e)&&!utils.isSymbol(e)){var i=e instanceof Registration_1.Registration?e.getClass():e;utils.isClass(i)&&this.bindTypeFactory(o,i,r);}}else utils.isFunction(t)?utils.isClass(t)?this.bindTypeFactory(o,t,r):s=this.createCustomFactory(o,t,r):r&&void 0!==t&&(s=this.createCustomFactory(o,function(){return t},r));s&&this.factories.set(o,s);}}, e.prototype.createCustomFactory=function(o,s,e){var i=this;return e?function(){for(var e=[],t=0;t<arguments.length;t++)e[t]=arguments[t];if(i.singleton.has(o))return i.singleton.get(o);var r=s.apply(void 0,[i].concat(e));return i.singleton.set(o,r), r}:function(){for(var e=[],t=0;t<arguments.length;t++)e[t]=arguments[t];return s.apply(void 0,[i].concat(e))}}, e.prototype.bindTypeFactory=function(a,c,p){var u=this;if(Reflect.isExtensible(c)){var l=this.getLifeScope(),g=l.getConstructorParameters(c);p||(p=l.isSingletonType(c));this.factories.set(a,function(){for(var e,t=[],r=0;r<arguments.length;r++)t[r]=arguments[r];if(p&&u.singleton.has(a))return u.singleton.get(a);if(t.length<1){var o={tokenKey:a,targetType:c,singleton:p};if(l.execute(o,core.CoreActions.cache), o.execResult&&o.execResult instanceof c)return o.execResult}var s=(e=u.get(core.ProviderMatcherToken)).toProviderMap.apply(e,t);l.execute({tokenKey:a,targetType:c,raiseContainer:u,params:g,providers:t,providerMap:s,singleton:p},types.IocState.runtime,core.LifeState.beforeCreateArgs);var i=u.createSyncParams(g,s);l.routeExecute({tokenKey:a,targetType:c,raiseContainer:u,args:i,params:g,providers:t,providerMap:s,singleton:p},types.IocState.runtime,core.LifeState.beforeConstructor);var n=new(c.bind.apply(c,[void 0].concat(i)));return l.routeExecute({tokenKey:a,target:n,targetType:c,raiseContainer:u,args:i,params:g,providers:t,providerMap:s,singleton:p},types.IocState.runtime,core.LifeState.afterConstructor), l.execute({tokenKey:a,target:n,targetType:c,raiseContainer:u,args:i,params:g,providers:t,providerMap:s,singleton:p},types.IocState.runtime,core.LifeState.onInit), l.routeExecute({tokenKey:a,target:n,targetType:c,raiseContainer:u,args:i,params:g,providers:t,providerMap:s,singleton:p},types.IocState.runtime,core.LifeState.AfterInit), l.execute({tokenKey:a,target:n,targetType:c,raiseContainer:u},core.CoreActions.cache), n}), l.routeExecute({tokenKey:a,targetType:c,raiseContainer:this},types.IocState.design);}}, e.classAnnations={name:"Container",params:{constructor:[],getRoot:[],getBuilder:[],get:["token","alias","providers"],resolve:["token","providers"],resolveValue:["token","providers"],clearCache:["targetType"],getToken:["token","alias"],getTokenKey:["token","alias"],register:["token","value"],has:["token","alias"],hasRegister:["key"],unregister:["token","inchain"],registerSingleton:["token","value"],registerValue:["token","value"],bindProvider:["provide","provider"],getTokenImpl:["token","inchain"],getTokenExtendsChain:["token"],getBaseClasses:["target"],getLifeScope:[],use:["modules"],loadModule:["modules"],invoke:["token","propertyKey","instance","providers"],syncInvoke:["token","propertyKey","instance","providers"],createSyncParams:["params","providers"],createParams:["params","providers"],cacheDecorator:["map","action"],init:[],registerFactory:["token","value","singleton"],createCustomFactory:["key","factory","singleton"],bindTypeFactory:["key","ClassT","singleton"]}}, e}();exports.Container=Container;



});

unwrapExports(Container_1);
var Container_2 = Container_1.Container;

var IModuleLoader = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.ModuleLoaderToken=new InjectToken_1.InjectToken("DI_ModuleLoader");



});

unwrapExports(IModuleLoader);
var IModuleLoader_1 = IModuleLoader.ModuleLoaderToken;

var DefaultModuleLoader_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var DefaultModuleLoader=function(){function e(){}return e.prototype.getLoader=function(){return this._loader||(this._loader=this.createLoader()), this._loader}, e.prototype.load=function(e){var t=this;return e.length?Promise.all(e.map(function(e){return utils.isString(e)?t.isFile(e)?t.loadFile(e):t.loadModule(e):utils.isObject(e)&&(e.modules||e.files)?t.loadPathModule(e):e?[e]:[]})).then(function(e){var t=[];return e.forEach(function(e){t=t.concat(e);}), t}):Promise.resolve([])}, e.prototype.loadTypes=function(r){return tslib_1.__awaiter(this,void 0,void 0,function(){var t;return tslib_1.__generator(this,function(e){switch(e.label){case 0:return[4,this.load(r)];case 1:return t=e.sent(), [2,this.getTypes(t)]}})})}, e.prototype.getTypes=function(e){var r=this,o=[];return e.forEach(function(e){var t=r.getContentTypes(e);o.push(t);}), o}, e.prototype.loadFile=function(e,t){var r=this.getLoader();return(utils.isArray(e)?Promise.all(e.map(function(e){return r(e)})).then(function(e){var t=[];return e.forEach(function(e){t=t.concat(e);}), t}):r(e)).then(function(e){return e.filter(function(e){return!!e})})}, e.prototype.isFile=function(e){return e&&/\/((\w|%|\.))+\.\w+$/.test(e.replace(/\\\\/gi,"/"))}, e.prototype.loadModule=function(e){return this.getLoader()(e).then(function(e){return e.filter(function(e){return!!e})})}, e.prototype.loadPathModule=function(o){return tslib_1.__awaiter(this,void 0,void 0,function(){var t,r=this;return tslib_1.__generator(this,function(e){switch(e.label){case 0:return t=[], o.files?[4,this.loadFile(o.files,o.basePath).then(function(e){return e.forEach(function(e){t=t.concat(e);}), t})]:[3,2];case 1:e.sent(), e.label=2;case 2:return o.modules?[4,Promise.all(o.modules.map(function(e){return utils.isString(e)?r.loadModule(e):e})).then(function(e){return t=t.concat(e)})]:[3,4];case 3:e.sent(), e.label=4;case 4:return[2,t]}})})}, e.prototype.createLoader=function(){if("undefined"!=typeof commonjsRequire)return function(e){return new Promise(function(t,r){commonjsRequire([e],function(e){t(e);},function(e){r(e);});})};throw new Error("has not module loader")}, e.prototype.getContentTypes=function(e){var t=[];if(utils.isClass(e))t.push(e);else{var r=e.exports?e.exports:e;for(var o in r){var n=r[o];utils.isClass(n)&&t.push(n);}}return t}, e.classAnnations={name:"DefaultModuleLoader",params:{constructor:[],getLoader:[],load:["modules"],loadTypes:["modules"],getTypes:["modules"],loadFile:["files","basePath"],isFile:["str"],loadModule:["moduleName"],loadPathModule:["pmd"],createLoader:[],getContentTypes:["regModule"]}}, e}();exports.DefaultModuleLoader=DefaultModuleLoader;



});

unwrapExports(DefaultModuleLoader_1);
var DefaultModuleLoader_2 = DefaultModuleLoader_1.DefaultModuleLoader;

var IModuleValidate = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var InjectModuleValidateToken=function(t){function e(e){return t.call(this,"DI_ModuleValidate",e)||this}return tslib_1.__extends(e,t), e.classAnnations={name:"InjectModuleValidateToken",params:{constructor:["desc"]}}, e}(Registration_1.Registration);exports.InjectModuleValidateToken=InjectModuleValidateToken, exports.ModuleValidateToken=new InjectToken_1.InjectToken("DI_ModuleValidate");



});

unwrapExports(IModuleValidate);
var IModuleValidate_1 = IModuleValidate.InjectModuleValidateToken;
var IModuleValidate_2 = IModuleValidate.ModuleValidateToken;

var IMetaAccessor = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var InjectMetaAccessorToken=function(t){function e(e){return t.call(this,e,"boot__metaAccessor")||this}return tslib_1.__extends(e,t), e.classAnnations={name:"InjectMetaAccessorToken",params:{constructor:["type"]}}, e}(Registration_1.Registration);exports.InjectMetaAccessorToken=InjectMetaAccessorToken, exports.DefaultMetaAccessorToken=new InjectMetaAccessorToken("default"), exports.AnnotationMetaAccessorToken=new InjectMetaAccessorToken("Annotation");



});

unwrapExports(IMetaAccessor);
var IMetaAccessor_1 = IMetaAccessor.InjectMetaAccessorToken;
var IMetaAccessor_2 = IMetaAccessor.DefaultMetaAccessorToken;
var IMetaAccessor_3 = IMetaAccessor.AnnotationMetaAccessorToken;

var ModuleValidate = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var BaseModuelValidate=function(){function e(){}return e.prototype.validate=function(t){if(!utils.isClass(t))return!1;var e=this.getDecorator();return utils.isString(e)?core.hasOwnClassMetadata(e,t):!!(utils.isArray(e)&&0<e.length)&&e.some(function(e){return core.hasOwnClassMetadata(e,t)})}, e.prototype.getMetaConfig=function(e,t){return utils.isToken(e)?this.getMetaAccessor(t).getMetadata(e,t):{}}, e.prototype.getMetaAccessor=function(e){var t=this.getDecorator();return e.resolve(IMetaAccessor.AnnotationMetaAccessorToken,{decorator:t})}, e.classAnnations={name:"BaseModuelValidate",params:{constructor:[],validate:["type"],getMetaConfig:["token","container"],getMetaAccessor:["container"],getDecorator:[]}}, e}();exports.BaseModuelValidate=BaseModuelValidate, exports.IocExtModuleValidateToken=new IModuleValidate.InjectModuleValidateToken(core.IocExt.toString());var IocExtModuleValidate=function(e){function t(){return null!==e&&e.apply(this,arguments)||this}return tslib_1.__extends(t,e), t.prototype.getDecorator=function(){return core.IocExt.toString()}, t.classAnnations={name:"IocExtModuleValidate",params:{getDecorator:[]}}, t}(BaseModuelValidate);exports.IocExtModuleValidate=IocExtModuleValidate;



});

unwrapExports(ModuleValidate);
var ModuleValidate_1 = ModuleValidate.BaseModuelValidate;
var ModuleValidate_2 = ModuleValidate.IocExtModuleValidateToken;
var ModuleValidate_3 = ModuleValidate.IocExtModuleValidate;

var MetaAccessor_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var MetaAccessor=function(){function t(t){this.decorators=utils.isArray(t)?t:[t];}return t.prototype.getDecorators=function(){return this.decorators}, t.prototype.getMetadata=function(t,e){var r=utils.isClass(t)?t:e.getTokenImpl(t);if(utils.isClass(r)){var o=this.getDecorators().find(function(t){return core.hasOwnClassMetadata(t,r)}),a=core.getTypeMetadata(o,r);if(a&&a.length)return a[0]}return{}}, t.classAnnations={name:"MetaAccessor",params:{constructor:["decorator"],getDecorators:[],getMetadata:["token","container"]}}, t=tslib_1.__decorate([core.Injectable(IMetaAccessor.DefaultMetaAccessorToken),tslib_1.__metadata("design:paramtypes",[Object])],t)}();exports.MetaAccessor=MetaAccessor;var AnnotationMetaAccessor=function(){function t(t){this.decorators=utils.isArray(t)?t:[t];}return t.prototype.getDecorators=function(){return this.decorators}, t.prototype.getMetadata=function(t,r){if(utils.isToken(t)){var o,a={decorator:this.getDecorators()};return r.getTokenExtendsChain(t).forEach(function(t){if(o)return!1;var e=new IMetaAccessor.InjectMetaAccessorToken(t);return r.has(e)&&(o=r.resolve(e,a)), !0}), o||(o=this.getDefaultMetaAccessor(r,a)), o?o.getMetadata(t,r):{}}return{}}, t.prototype.getDefaultMetaAccessor=function(t){for(var e=[],r=1;r<arguments.length;r++)e[r-1]=arguments[r];return t.resolve.apply(t,[IMetaAccessor.DefaultMetaAccessorToken].concat(e))}, t.classAnnations={name:"AnnotationMetaAccessor",params:{constructor:["decorator"],getDecorators:[],getMetadata:["token","container"],getDefaultMetaAccessor:["container","providers"]}}, t=tslib_1.__decorate([core.Injectable(IMetaAccessor.AnnotationMetaAccessorToken),tslib_1.__metadata("design:paramtypes",[Object])],t)}();exports.AnnotationMetaAccessor=AnnotationMetaAccessor;



});

unwrapExports(MetaAccessor_1);
var MetaAccessor_2 = MetaAccessor_1.MetaAccessor;
var MetaAccessor_3 = MetaAccessor_1.AnnotationMetaAccessor;

var IModuleInjector = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var InjectModuleInjectorToken=function(t){function e(e,n){return void 0===n&&(n=!1), t.call(this,n?"DI_SyncModuleInjector":"DI_ModuleInjector",e)||this}return tslib_1.__extends(e,t), e.classAnnations={name:"InjectModuleInjectorToken",params:{constructor:["desc","sync"]}}, e}(Registration_1.Registration);exports.InjectModuleInjectorToken=InjectModuleInjectorToken, exports.ModuleInjectorToken=new InjectModuleInjectorToken(""), exports.SyncModuleInjectorToken=new InjectModuleInjectorToken("",!0);



});

unwrapExports(IModuleInjector);
var IModuleInjector_1 = IModuleInjector.InjectModuleInjectorToken;
var IModuleInjector_2 = IModuleInjector.ModuleInjectorToken;
var IModuleInjector_3 = IModuleInjector.SyncModuleInjectorToken;

var ModuleInjector_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var BaseModuleInjector=function(){function e(e,t){this.validate=e, this.skipNext=t;}return e.prototype.filter=function(e){var t=this;return e=e||[], this.validate?e.filter(function(e){return t.validate.validate(e)}):e}, e.prototype.next=function(e,t){return 0===t.length?e:this.skipNext?null:t.length===e.length?null:e.filter(function(e){return t.indexOf(e)<0})}, e.prototype.setup=function(e,t){e.register(t);}, e.classAnnations={name:"BaseModuleInjector",params:{constructor:["validate","skipNext"],inject:["container","modules"],filter:["modules"],next:["all","filtered"],setup:["container","type"]}}, e}(),SyncModuleInjector=function(r){function e(e,t){var n=r.call(this,e,t)||this;return n.validate=e, n}return tslib_1.__extends(e,r), e.prototype.inject=function(t,e){var n=this,r=this.filter(e);return r.length&&r.forEach(function(e){n.setup(t,e);}), {injected:r,next:this.next(e,r)}}, e.classAnnations={name:"SyncModuleInjector",params:{constructor:["validate","skipNext"],inject:["container","modules"]}}, e=tslib_1.__decorate([core.Injectable(IModuleInjector.SyncModuleInjectorToken),tslib_1.__metadata("design:paramtypes",[Object,Boolean])],e)}(exports.BaseModuleInjector=BaseModuleInjector);exports.SyncModuleInjector=SyncModuleInjector;var ModuleInjector=function(r){function e(e,t){var n=r.call(this,e,t)||this;return n.validate=e, n}return tslib_1.__extends(e,r), e.prototype.inject=function(o,i){return tslib_1.__awaiter(this,void 0,void 0,function(){var t,n,r=this;return tslib_1.__generator(this,function(e){switch(e.label){case 0:return(t=this.filter(i)).length?[4,utils.PromiseUtil.step(t.map(function(e){return r.setup(o,e)}))]:[3,2];case 1:e.sent(), e.label=2;case 2:return n=this.next(i,t), [2,{injected:t,next:n}]}})})}, e.classAnnations={name:"ModuleInjector",params:{constructor:["validate","skipNext"],inject:["container","modules"]}}, e=tslib_1.__decorate([core.Injectable(IModuleInjector.ModuleInjectorToken),tslib_1.__metadata("design:paramtypes",[Object,Boolean])],e)}(BaseModuleInjector);exports.ModuleInjector=ModuleInjector;



});

unwrapExports(ModuleInjector_1);
var ModuleInjector_2 = ModuleInjector_1.BaseModuleInjector;
var ModuleInjector_3 = ModuleInjector_1.SyncModuleInjector;
var ModuleInjector_4 = ModuleInjector_1.ModuleInjector;

var IModuleInjectorChain = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});exports.ModuleInjectorChainToken=new InjectToken_1.InjectToken("DI_ModuleInjectorChain");



});

unwrapExports(IModuleInjectorChain);
var IModuleInjectorChain_1 = IModuleInjectorChain.ModuleInjectorChainToken;

var ModuleInjectorChain_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var ModuleInjectorChain=function(){function t(){this._injectors=[];}return Object.defineProperty(t.prototype,"injectors",{get:function(){return this._injectors},enumerable:!0,configurable:!0}), t.prototype.first=function(t){return this.isInjector(t)&&this._injectors.unshift(t), this}, t.prototype.next=function(t){return this.isInjector(t)&&this._injectors.push(t), this}, t.prototype.isInjector=function(t){return t instanceof ModuleInjector_1.ModuleInjector||t instanceof ModuleInjector_1.SyncModuleInjector}, t.prototype.inject=function(n,r){return tslib_1.__awaiter(this,void 0,void 0,function(){var e;return tslib_1.__generator(this,function(t){switch(t.label){case 0:return e=[], [4,utils.PromiseUtil.forEach(this.injectors.map(function(e){return function(t){return e.inject(n,t.next)}}),function(t){return e=e.concat(t.injected||[]), t.next&&0<t.next.length},{injected:[],next:r}).catch(function(t){return[]})];case 1:return t.sent(), [2,e]}})})}, t.prototype.syncInject=function(n,r){var o=[],i=!1;return this.injectors.forEach(function(t){if(i)return!1;if(t instanceof ModuleInjector_1.SyncModuleInjector){var e=t.inject(n,r);o=o.concat(e.injected), i=!e.next||e.next.length<1;}return!0}), o}, t.classAnnations={name:"ModuleInjectorChain",params:{constructor:[],first:["injector"],next:["injector"],isInjector:["injector"],inject:["container","modules"],syncInject:["container","modules"]}}, t}();exports.ModuleInjectorChain=ModuleInjectorChain;



});

unwrapExports(ModuleInjectorChain_1);
var ModuleInjectorChain_2 = ModuleInjectorChain_1.ModuleInjectorChain;

var injectors = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});tslib_1.__exportStar(IModuleLoader,exports), tslib_1.__exportStar(DefaultModuleLoader_1,exports), tslib_1.__exportStar(IModuleValidate,exports), tslib_1.__exportStar(ModuleValidate,exports), tslib_1.__exportStar(IMetaAccessor,exports), tslib_1.__exportStar(MetaAccessor_1,exports), tslib_1.__exportStar(IModuleInjector,exports), tslib_1.__exportStar(ModuleInjector_1,exports), tslib_1.__exportStar(IModuleInjectorChain,exports), tslib_1.__exportStar(ModuleInjectorChain_1,exports);



});

unwrapExports(injectors);

var DefaultContainerBuilder_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var DefaultContainerBuilder=function(){function e(e){this._loader=e;}return Object.defineProperty(e.prototype,"loader",{get:function(){return this._loader||(this._loader=new injectors.DefaultModuleLoader), this._loader},enumerable:!0,configurable:!0}), e.prototype.create=function(){var e=this,t=new Container_1.Container;return t.bindProvider(IContainerBuilder.ContainerBuilderToken,function(){return e}), t.bindProvider(injectors.ModuleLoaderToken,function(){return e.loader}), t}, e.prototype.build=function(){for(var n=[],e=0;e<arguments.length;e++)n[e]=arguments[e];return tslib_1.__awaiter(this,void 0,void 0,function(){var t;return tslib_1.__generator(this,function(e){switch(e.label){case 0:return t=this.create(), n.length?[4,this.loadModule.apply(this,[t].concat(n))]:[3,2];case 1:e.sent(), e.label=2;case 2:return[2,t]}})})}, e.prototype.loadModule=function(a){for(var n=[],e=1;e<arguments.length;e++)n[e-1]=arguments[e];return tslib_1.__awaiter(this,void 0,void 0,function(){var t,r,o,i=this;return tslib_1.__generator(this,function(e){switch(e.label){case 0:return[4,this.loader.loadTypes(n)];case 1:return t=e.sent(), r=[], t&&t.length?(o=this.getInjectorChain(a), [4,utils.PromiseUtil.step(t.map(function(n){return tslib_1.__awaiter(i,void 0,void 0,function(){var t;return tslib_1.__generator(this,function(e){switch(e.label){case 0:return[4,o.inject(a,n)];case 1:return t=e.sent(), r=r.concat(t), [2]}})})}))]):[3,3];case 2:e.sent(), e.label=3;case 3:return[2,r]}})})}, e.prototype.syncBuild=function(){for(var e=[],t=0;t<arguments.length;t++)e[t]=arguments[t];var n=this.create();return e.length&&this.syncLoadModule.apply(this,[n].concat(e)), n}, e.prototype.syncLoadModule=function(n){for(var e=[],t=1;t<arguments.length;t++)e[t-1]=arguments[t];var r=this.loader.getTypes(e),o=[];if(r&&r.length){var i=this.getInjectorChain(n);r.forEach(function(e){var t=i.syncInject(n,e);o=o.concat(t);});}return o}, e.prototype.getInjectorChain=function(e){e.has(injectors.ModuleInjectorChainToken)||e.register(injectors.SyncModuleInjector).register(injectors.ModuleInjector).register(injectors.MetaAccessor).register(injectors.AnnotationMetaAccessor).bindProvider(injectors.IocExtModuleValidateToken,new injectors.IocExtModuleValidate).bindProvider(injectors.ModuleInjectorChainToken,new injectors.ModuleInjectorChain);var t=e.get(injectors.ModuleInjectorChainToken);return this.injectorChain!==t&&(this.injectorChain=null), this.injectorChain||(this.injectorChain=t, this.injectorChain.next(e.resolve(injectors.SyncModuleInjectorToken,{validate:e.get(injectors.IocExtModuleValidateToken),skipNext:!0})).next(e.resolve(injectors.SyncModuleInjectorToken))), this.injectorChain}, e.classAnnations={name:"DefaultContainerBuilder",params:{constructor:["loader"],create:[],build:["modules"],loadModule:["container","modules"],syncBuild:["modules"],syncLoadModule:["container","modules"],getInjectorChain:["container"]}}, e}();exports.DefaultContainerBuilder=DefaultContainerBuilder;



});

unwrapExports(DefaultContainerBuilder_1);
var DefaultContainerBuilder_2 = DefaultContainerBuilder_1.DefaultContainerBuilder;

var D__workspace_github_tsioc_packages_core_lib = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});tslib_1.__exportStar(IContainer,exports), tslib_1.__exportStar(Container_1,exports), tslib_1.__exportStar(types,exports), tslib_1.__exportStar(Registration_1,exports), tslib_1.__exportStar(InjectToken_1,exports), tslib_1.__exportStar(IContainerBuilder,exports), tslib_1.__exportStar(IMethodAccessor,exports), tslib_1.__exportStar(ICacheManager,exports), tslib_1.__exportStar(LifeScope,exports), tslib_1.__exportStar(DefaultContainerBuilder_1,exports), tslib_1.__exportStar(utils,exports), tslib_1.__exportStar(components,exports), tslib_1.__exportStar(core,exports), tslib_1.__exportStar(injectors,exports), tslib_1.__exportStar(resolves,exports);



});

var index$9 = unwrapExports(D__workspace_github_tsioc_packages_core_lib);

return index$9;

})));
