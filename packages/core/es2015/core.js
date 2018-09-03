'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var tslib_1 = _interopDefault(require('tslib'));
var reflectMetadata = _interopDefault(require('reflect-metadata'));

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
Object.defineProperty(exports, "__esModule", { value: true });


var lang;
(function (lang) {
    /**
     * get object keys.
     *
     * @param {*} target
     * @returns {string[]}
     */
    function keys(target) {
        if (typeCheck.isObject(target)) {
            if (typeCheck.isFunction(Object.keys)) {
                return Object.keys(target);
            }
            else {
                let keys = [];
                for (let name in target) {
                    keys.push(name);
                }
                return keys;
            }
        }
        return [];
    }
    lang.keys = keys;
    /**
     * values of target object.
     *
     * @export
     * @param {*} target
     * @returns {any[]}
     */
    function values(target) {
        if (typeCheck.isObject(target)) {
            if (typeCheck.isFunction(Object.values)) {
                return Object.values(target);
            }
            else {
                let values = [];
                for (let name in target) {
                    values.push(target[name]);
                }
                return values;
            }
        }
        return [];
    }
    lang.values = values;
    /**
     * assign
     *
     * @export
     * @template T
     * @param {T} target
     * @param {...any[]} source
     * @returns {T}
     */
    function assign(target, source1, source2, sources) {
        if (sources && sources.length) {
            sources.unshift(source2 || {});
            sources.unshift(source1 || {});
            return objectAssign(target, ...sources);
        }
        else if (source2) {
            return objectAssign(target, source1 || {}, source2);
        }
        else {
            return objectAssign(target, source1 || {});
        }
    }
    lang.assign = assign;
    /**
     * create an new object from target object omit some field.
     *
     * @export
     * @param {ObjectMap<any>} target
     * @param {...string[]} fields
     * @returns {*}
     */
    function omit(target, ...fields) {
        if (typeCheck.isObject(target)) {
            let result = {};
            keys(target).forEach(key => {
                if (fields.indexOf(key) < 0) {
                    result[key] = target[key];
                }
            });
            return result;
        }
        else {
            return target;
        }
    }
    lang.omit = omit;
    /**
     * object has field or not.
     *
     * @export
     * @param {ObjectMap<any>} target
     * @returns
     */
    function hasField(target) {
        return keys(target).length > 0;
    }
    lang.hasField = hasField;
    /**
     * for in opter for object or array.
     *
     * @export
     * @template T
     * @param {(ObjectMap<T> | T[])} target
     * @param {(item: T, idx?: number|string) => void|boolean} iterator
     */
    function forIn(target, iterator) {
        if (typeCheck.isArray(target)) {
            target.forEach(iterator);
        }
        else if (typeCheck.isObject(target)) {
            keys(target).forEach((key, idx) => {
                iterator(target[key], key);
            });
        }
    }
    lang.forIn = forIn;
    /**
     * find
     *
     * @template T
     * @param {(ObjectMap<T> | T[])} target
     * @param {((item: T, idx?: number | string) => boolean)} express
     */
    function find(target, express) {
        let item;
        forIn(target, (it, idx) => {
            if (!item) {
                if (express(it, idx)) {
                    item = it;
                    return false;
                }
                return true;
            }
            else {
                return false;
            }
        });
    }
    lang.find = find;
    /**
     * get target type parent class.
     *
     * @export
     * @param {Type<any>} target
     * @returns {Type<any>}
     */
    function getParentClass(target) {
        let p = Reflect.getPrototypeOf(target.prototype);
        return typeCheck.isClass(p) ? p : p.constructor;
    }
    lang.getParentClass = getParentClass;
    /**
     * first.
     *
     * @export
     * @template T
     * @param {T[]} list
     * @returns {T}
     */
    function first(list) {
        if (typeCheck.isArray(list) && list.length) {
            return list[0];
        }
        return null;
    }
    lang.first = first;
    /**
     * last.
     *
     * @export
     * @template T
     * @param {T[]} list
     * @returns {T}
     */
    function last(list) {
        if (typeCheck.isArray(list) && list.length) {
            return list[list.length - 1];
        }
        return null;
    }
    lang.last = last;
})(lang = exports.lang || (exports.lang = {}));




});

unwrapExports(lang_1);
var lang_2 = lang_1.lang;

var typeCheck = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });


/**
 * check target is function or not.
 *
 * @export
 * @param {*} target
 * @returns
 */
function isFunction(target) {
    if (!target) {
        return false;
    }
    return typeof target === 'function';
}
exports.isFunction = isFunction;
/**
 * check Abstract class with @Abstract or not
 *
 * @export
 * @param {*} target
 * @returns {target is AbstractType<any>}
 */
function isAbstractDecoratorClass(target) {
    if (!isFunction(target)) {
        return false;
    }
    if (Reflect.hasOwnMetadata('@Abstract', target)) {
        return true;
    }
    return false;
}
exports.isAbstractDecoratorClass = isAbstractDecoratorClass;
/**
 * get class name.
 *
 * @export
 * @param {AbstractType<any>} classType
 * @returns {string}
 */
function getClassName(classType) {
    if (!isFunction(classType)) {
        return '';
    }
    if (/^[a-z]$/.test(classType.name)) {
        return classType.classAnnations ? classType.classAnnations.name : classType.name;
    }
    return classType.name;
}
exports.getClassName = getClassName;
/**
 * check target is class or not.
 *
 * @export
 * @param {*} target
 * @returns
 */
function isClass(target) {
    if (!isFunction(target)) {
        return false;
    }
    if (target.prototype) {
        if (!target.name || target.name === 'Object') {
            return false;
        }
        if (Reflect.hasOwnMetadata('@Abstract', target)) {
            return false;
        }
        let type = target;
        // for uglify
        if (/^[a-z]$/.test(type.name)) {
            if (type.classAnnations && type.classAnnations.name) {
                return true;
            }
            else {
                return false;
            }
        }
        else {
            if (type.classAnnations && isString(type.classAnnations.name)) {
                return true;
            }
            if (!/^[A-Z@]/.test(target.name)) {
                return false;
            }
        }
        // for IE 8, 9
        if (!isNodejsEnv() && /MSIE [6-9]/.test(navigator.userAgent)) {
            return true;
        }
        try {
            target.arguments && target.caller;
            return false;
        }
        catch (e) {
            return true;
        }
    }
    return false;
}
exports.isClass = isClass;
/**
 * is run in nodejs or not.
 *
 * @export
 * @returns {boolean}
 */
function isNodejsEnv() {
    return (typeof process !== 'undefined') && (typeof process.versions.node !== 'undefined');
}
exports.isNodejsEnv = isNodejsEnv;
/**
 * check target is token or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Token<any>}
 */
function isToken(target) {
    if (!target) {
        return false;
    }
    if (isString(target) || isSymbol(target) || isClass(target) || (isObject(target) && target instanceof Registration_1.Registration)) {
        return true;
    }
    return false;
}
exports.isToken = isToken;
/**
 * is target promise or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Promise<any>}
 */
function isPromise(target) {
    if (!target) {
        return false;
    }
    if (isFunction(target.then) && isFunction(target.catch)) {
        return true;
    }
    return false;
}
exports.isPromise = isPromise;
/**
 * is target rxjs observable or not.
 *
 * @export
 * @param {*} target
 * @returns {boolean}
 */
function isObservable(target) {
    if (!target && !isObject(target)) {
        return false;
    }
    if (isFunction(target.subscribe) && isFunction(target.toPromise)) {
        return true;
    }
    return false;
}
exports.isObservable = isObservable;
/**
 * is target base object or not.
 * eg. {}, have not self constructor;
 * @export
 * @param {*} target
 * @returns {target is Promise<any>}
 */
function isBaseObject(target) {
    if (!target) {
        return false;
    }
    if (target.constructor && target.constructor.name === 'Object') {
        return true;
    }
    return false;
}
exports.isBaseObject = isBaseObject;
/**
 * is metadata object or not.
 *
 * @export
 * @param {any} target
 * @param {string[]} [props]
 * @param {string[]} [extendsProps]
 * @returns {boolean}
 */
function isMetadataObject(target, props, extendsProps) {
    if (!target) {
        return false;
    }
    if (isBaseType(target) || isSymbol(target) || target instanceof Registration_1.Registration || target instanceof RegExp || target instanceof Date) {
        return false;
    }
    if (target.constructor && target.constructor.name !== 'Object') {
        return false;
    }
    props = props || [];
    if (extendsProps) {
        props = extendsProps.concat(props);
    }
    if (props.length) {
        return lang_1.lang.keys(target).some(n => props.indexOf(n) > 0);
    }
    return true;
}
exports.isMetadataObject = isMetadataObject;
/**
 * check object is class metadata or not.
 *
 * @export
 * @param {any} target
 * @param {string[]} [extendsProps]
 * @returns {boolean}
 */
function isClassMetadata(target, extendsProps) {
    return isMetadataObject(target, ['singleton', 'provide', 'alias', 'type'], extendsProps);
}
exports.isClassMetadata = isClassMetadata;
/**
 * check object is param metadata or not.
 *
 * @export
 * @param {any} target
 * @param {string[]} [extendsProps]
 * @returns {boolean}
 */
function isParamMetadata(target, extendsProps) {
    return isMetadataObject(target, ['type', 'provider', 'index'], extendsProps);
}
exports.isParamMetadata = isParamMetadata;
/**
 * check object is param prop metadata or not.
 *
 * @export
 * @param {any} target
 * @param {string[]} [extendsProps]
 * @returns {boolean}
 */
function isParamPropMetadata(target, extendsProps) {
    return isMetadataObject(target, ['type', 'provider', 'index'], extendsProps);
}
exports.isParamPropMetadata = isParamPropMetadata;
/**
 * check object is property metadata or not.
 *
 * @export
 * @param {any} target
 * @param {string[]} [extendsProps]
 * @returns {boolean}
 */
function isPropertyMetadata(target, extendsProps) {
    return isMetadataObject(target, ['type', 'provider'], extendsProps);
}
exports.isPropertyMetadata = isPropertyMetadata;
/**
 * check target is string or not.
 *
 * @export
 * @param {*} target
 * @returns {target is string}
 */
function isString(target) {
    return typeof target === 'string';
}
exports.isString = isString;
/**
 * check target is boolean or not.
 *
 * @export
 * @param {*} target
 * @returns {target is boolean}
 */
function isBoolean(target) {
    return typeof target === 'boolean' || (target === true || target === false);
}
exports.isBoolean = isBoolean;
/**
 * check target is number or not.
 *
 * @export
 * @param {*} target
 * @returns {target is number}
 */
function isNumber(target) {
    return typeof target === 'number';
}
exports.isNumber = isNumber;
/**
 * check target is undefined or not.
 *
 * @export
 * @param {*} target
 * @returns {target is undefined}
 */
function isUndefined(target) {
    return typeof target === 'undefined' || target === undefined;
}
exports.isUndefined = isUndefined;
/**
 * check target is unll or not.
 *
 * @export
 * @param {*} target
 * @returns {target is null}
 */
function isNull(target) {
    return target === null;
}
exports.isNull = isNull;
/**
 * check target is array or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Array<any>}
 */
function isArray(target) {
    return Array.isArray(target);
}
exports.isArray = isArray;
/**
 * check target is object or not.
 *
 * @export
 * @param {*} target
 * @returns {target is object}
 */
function isObject(target) {
    var type = typeof target;
    return target != null && (type === 'object' || type === 'function');
}
exports.isObject = isObject;
/**
 * check target is date or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Date}
 */
function isDate(target) {
    return isObject(target) && target instanceof Date;
}
exports.isDate = isDate;
/**
 * check target is symbol or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Symbol}
 */
function isSymbol(target) {
    return typeof target === 'symbol' || (isObject(target) && /^Symbol\(/.test(target.toString()));
}
exports.isSymbol = isSymbol;
/**
 * check target is regexp or not.
 *
 * @export
 * @param {*} target
 * @returns {target is RegExp}
 */
function isRegExp(target) {
    return target && target instanceof RegExp;
}
exports.isRegExp = isRegExp;
/**
 * is base type or not.
 *
 * @export
 * @param {*} target
 * @returns {boolean}
 */
function isBaseType(target) {
    return isNull(target) || isUndefined(target) || isBoolean(target) || isString(target) || isNumber(target);
}
exports.isBaseType = isBaseType;




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
Object.defineProperty(exports, "__esModule", { value: true });


/**
 * object map set.
 *
 * @export
 * @class MapSet
 * @template TKey
 * @template TVal
 */
class ObjectMapSet {
    constructor() {
        this.valueMap = {};
        this.keyMap = {};
    }
    clear() {
        this.valueMap = {};
        this.keyMap = {};
    }
    getTypeKey(key) {
        let strKey = '';
        if (typeCheck.isString(key)) {
            strKey = key;
        }
        else if (typeCheck.isFunction(key)) {
            strKey = key.name;
        }
        else {
            strKey = key.toString();
        }
        return strKey;
    }
    keys() {
        return lang_1.lang.values(this.keyMap);
    }
    values() {
        return lang_1.lang.values(this.valueMap);
    }
    delete(key) {
        let strkey = this.getTypeKey(key).toString();
        try {
            delete this.keyMap[strkey];
            delete this.valueMap[strkey];
            return true;
        }
        catch (_a) {
            return false;
        }
    }
    forEach(callbackfn, thisArg) {
        lang_1.lang.forIn(this.keyMap, (val, name) => {
            callbackfn(this.valueMap[name], val, this);
        });
    }
    get(key) {
        let strKey = this.getTypeKey(key);
        return this.valueMap[strKey];
    }
    has(key) {
        let strKey = this.getTypeKey(key);
        return !typeCheck.isUndefined(this.keyMap[strKey]);
    }
    set(key, value) {
        let strKey = this.getTypeKey(key);
        this.keyMap[strKey] = key;
        this.valueMap[strKey] = value;
        return this;
    }
    get size() {
        return lang_1.lang.keys(this.keyMap).length;
    }
}
ObjectMapSet.classAnnations = { "name": "ObjectMapSet", "params": { "constructor": [], "clear": [], "getTypeKey": ["key"], "keys": [], "values": [], "delete": ["key"], "forEach": ["callbackfn", "thisArg"], "get": ["key"], "has": ["key"], "set": ["key", "value"] } };
exports.ObjectMapSet = ObjectMapSet;
/**
 * map set.
 *
 * @export
 * @class MapSet
 * @template TKey
 * @template TVal
 */
class MapSet {
    constructor() {
        this.map = typeCheck.isClass(Map) ? new Map() : new ObjectMapSet();
    }
    keys() {
        return this.map.keys();
    }
    values() {
        return this.map.values();
    }
    clear() {
        this.map.clear();
    }
    delete(key) {
        return this.map.delete(key);
    }
    forEach(callbackfn, thisArg) {
        let map = this.map;
        map.forEach(callbackfn, thisArg);
    }
    get(key) {
        return this.map.get(key);
    }
    has(key) {
        return this.map.has(key);
    }
    set(key, value) {
        this.map.set(key, value);
        return this;
    }
    get size() {
        return this.map.size;
    }
}
MapSet.classAnnations = { "name": "MapSet", "params": { "constructor": [], "keys": [], "values": [], "clear": [], "delete": ["key"], "forEach": ["callbackfn", "thisArg"], "get": ["key"], "has": ["key"], "set": ["key", "value"] } };
exports.MapSet = MapSet;




});

unwrapExports(MapSet_1);
var MapSet_2 = MapSet_1.ObjectMapSet;
var MapSet_3 = MapSet_1.MapSet;

var PromiseUtil_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * defer
 *
 * @export
 * @class Defer
 * @template T
 */
class Defer {
    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }
    static create(then) {
        let defer = new Defer();
        if (then) {
            defer.promise = defer.promise.then(then);
            return defer;
        }
        else {
            return defer;
        }
    }
}
Defer.classAnnations = { "name": "Defer", "params": { "create": ["then"], "constructor": [] } };
exports.Defer = Defer;
var PromiseUtil;
(function (PromiseUtil) {
    /**
     * foreach opter for promises.
     *
     * @export
     * @template T
     * @param {((T | PromiseLike<T> | ((value: T) => T | PromiseLike<T>))[])} promises
     * @param {Express<T, any>} express
     * @param {T} [defVal]
     * @returns
     */
    function forEach(promises, express, defVal) {
        let defer = new Defer();
        let pf = Promise.resolve(defVal);
        let length = promises ? promises.length : 0;
        if (length) {
            promises.forEach((p, idx) => {
                pf = pf.then(v => typeCheck.isFunction(p) ? p(v) : p)
                    .then(data => {
                    if (express(data) === false) {
                        defer.resolve('complete');
                        return Promise.reject('complete');
                    }
                    else if (idx === length - 1) {
                        defer.resolve('complete');
                        return Promise.reject('complete');
                    }
                    return data;
                });
            });
            pf.catch(err => {
                return err;
            });
        }
        else {
            defer.reject('array empty.');
        }
        return defer.promise;
    }
    PromiseUtil.forEach = forEach;
    /**
     * run promise step by step.
     *
     * @export
     * @template T
     * @param {((T | PromiseLike<T> | ((value: T) => T | PromiseLike<T>))[])} promises
     * @returns
     */
    function step(promises) {
        let result = Promise.resolve(null);
        promises.forEach(p => {
            result = result.then(v => typeCheck.isFunction(p) ? p(v) : p);
        });
        return result;
    }
    PromiseUtil.step = step;
    /**
     * find first validate value from promises.
     *
     * @export
     * @template T
     * @param {(...(T | PromiseLike<T> | ((value: T) => T | PromiseLike<T>))[])} promises
     * @param {Express<T, boolean>} validate
     * @returns
     */
    function find(promises, filter, defVal) {
        let defer = new Defer();
        forEach(promises, val => {
            if (filter(val)) {
                defer.resolve(val);
                return false;
            }
            return true;
        }, defVal)
            .then(() => defer.resolve(null))
            .catch(() => {
            defer.resolve(null);
        });
        return defer.promise;
    }
    PromiseUtil.find = find;
})(PromiseUtil = exports.PromiseUtil || (exports.PromiseUtil = {}));




});

unwrapExports(PromiseUtil_1);
var PromiseUtil_2 = PromiseUtil_1.Defer;
var PromiseUtil_3 = PromiseUtil_1.PromiseUtil;

var utils = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

tslib_1.__exportStar(typeCheck, exports);
tslib_1.__exportStar(MapSet_1, exports);
tslib_1.__exportStar(lang_1, exports);
tslib_1.__exportStar(PromiseUtil_1, exports);




});

unwrapExports(utils);

var Registration_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * inject token.
 * @export
 * @class Registration
 * @template T
 */
class Registration {
    /**
     * Creates an instance of Registration.
     * @param {(Token<T> | Token<any>)} provideType
     * @param {string} desc
     * @memberof Registration
     */
    constructor(provideType, desc) {
        this.type = 'Reg';
        if (provideType instanceof Registration) {
            this.classType = provideType.getProvide();
            let pdec = provideType.getDesc();
            if (pdec && desc && pdec !== desc) {
                this.desc = pdec + '_' + desc;
            }
            else {
                this.desc = desc;
            }
        }
        else {
            this.classType = provideType;
            this.desc = desc;
        }
    }
    getProvide() {
        return this.classType;
    }
    /**
     * get class.
     *
     * @returns
     * @memberof Registration
     */
    getClass() {
        if (utils.isClass(this.classType)) {
            return this.classType;
        }
        return null;
    }
    /**
     * get desc.
     *
     * @returns
     * @memberof Registration
     */
    getDesc() {
        return this.desc;
    }
    /**
     * to string.
     *
     * @returns {string}
     * @memberof Registration
     */
    toString() {
        let name = '';
        if (utils.isFunction(this.classType)) {
            name = `{${utils.getClassName(this.classType)}}`;
        }
        else if (this.classType) {
            name = this.classType.toString();
        }
        return `${this.type} ${name} ${this.desc}`.trim();
    }
}
Registration.classAnnations = { "name": "Registration", "params": { "constructor": ["provideType", "desc"], "getProvide": [], "getClass": [], "getDesc": [], "toString": [] } };
exports.Registration = Registration;




});

unwrapExports(Registration_1);
var Registration_2 = Registration_1.Registration;

var InjectToken_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * inject token.
 *
 * @export
 * @class InjectToken
 * @extends {Registration<T>}
 * @template T
 */
class InjectToken extends Registration_1.Registration {
    constructor(desc) {
        super(desc, '');
    }
}
InjectToken.classAnnations = { "name": "InjectToken", "params": { "constructor": ["desc"] } };
exports.InjectToken = InjectToken;




});

unwrapExports(InjectToken_1);
var InjectToken_2 = InjectToken_1.InjectToken;

var IContainer = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * IContainer token.
 * it is a symbol id, you can use  @Inject, @Autowried or @Param to get container instance in yourself class.
 */
exports.ContainerToken = new InjectToken_1.InjectToken('DI_IContainer');




});

unwrapExports(IContainer);
var IContainer_1 = IContainer.ContainerToken;

var types = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * State of type in ioc.
 *
 * @export
 * @enum {number}
 */
var IocState;
(function (IocState) {
    IocState["design"] = "design";
    IocState["runtime"] = "runtime";
})(IocState = exports.IocState || (exports.IocState = {}));
/**
 * iterate way.
 *
 * @export
 * @enum {number}
 */
var Mode;
(function (Mode) {
    /**
     * route up. iterate in parents.
     */
    Mode[Mode["route"] = 1] = "route";
    /**
     * iterate in children.
     */
    Mode[Mode["children"] = 2] = "children";
    /**
     * iterate as tree map. node first
     */
    Mode[Mode["traverse"] = 3] = "traverse";
    /**
     * iterate as tree map. node last
     */
    Mode[Mode["traverseLast"] = 4] = "traverseLast";
})(Mode = exports.Mode || (exports.Mode = {}));




});

unwrapExports(types);
var types_1 = types.IocState;
var types_2 = types.Mode;

var IMethodAccessor = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * IMethodAccessor interface symbol.
 * it is a symbol id, you can register yourself MethodAccessor for this.
 */
exports.MethodAccessorToken = new InjectToken_1.InjectToken('DI_IMethodAccessor');




});

unwrapExports(IMethodAccessor);
var IMethodAccessor_1 = IMethodAccessor.MethodAccessorToken;

var NullComponent_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * null component.
 *
 * @export
 * @class NullComponent
 * @implements {IComponent}
 */
class NullComponent {
    isEmpty() {
        return true;
    }
    add(action) {
        return this;
    }
    remove(action) {
        return this;
    }
    find(express, mode) {
        return exports.NullNode;
    }
    filter(express, mode) {
        return [];
    }
    each(express, mode) {
    }
    trans(express) {
    }
    transAfter(express) {
    }
    routeUp(express) {
    }
    equals(node) {
        return node === exports.NullNode;
    }
    empty() {
        return exports.NullNode;
    }
}
NullComponent.classAnnations = { "name": "NullComponent", "params": { "isEmpty": [], "add": ["action"], "remove": ["action"], "find": ["express", "mode"], "filter": ["express", "mode"], "each": ["express", "mode"], "trans": ["express"], "transAfter": ["express"], "routeUp": ["express"], "equals": ["node"], "empty": [] } };
exports.NullComponent = NullComponent;
/**
 * Null node
 */
exports.NullNode = new NullComponent();




});

unwrapExports(NullComponent_1);
var NullComponent_2 = NullComponent_1.NullComponent;
var NullComponent_3 = NullComponent_1.NullNode;

var GComposite_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });



/**
 * generics composite
 *
 * @export
 * @class GComposite
 * @implements {GComponent<T>}
 * @template T
 */
class GComposite {
    constructor(name) {
        this.name = name;
        this.children = [];
    }
    add(node) {
        node.parent = this;
        this.children.push(node);
        return this;
    }
    remove(node) {
        let component;
        if (utils.isString(node)) {
            component = this.find(cmp => utils.isString(node) ? cmp.name === node : cmp.equals(node));
        }
        else if (node) {
            component = node;
        }
        else {
            component = this;
        }
        if (!component.parent) {
            return this;
        }
        else if (this.equals(component.parent)) {
            this.children.splice(this.children.indexOf(component), 1);
            component.parent = null;
            return this;
        }
        else {
            component.parent.remove(component);
            return null;
        }
    }
    find(express, mode) {
        let component;
        this.each(item => {
            if (component) {
                return false;
            }
            let isFinded = utils.isFunction(express) ? express(item) : express === (item);
            if (isFinded) {
                component = item;
                return false;
            }
            return true;
        }, mode);
        return (component || this.empty());
    }
    filter(express, mode) {
        let nodes = [];
        this.each(item => {
            if (express(item)) {
                nodes.push(item);
            }
        }, mode);
        return nodes;
    }
    each(iterate, mode) {
        mode = mode || types.Mode.traverse;
        let r;
        switch (mode) {
            case types.Mode.route:
                r = this.routeUp(iterate);
                break;
            case types.Mode.children:
                r = this.eachChildren(iterate);
                break;
            case types.Mode.traverse:
                r = this.trans(iterate);
                break;
            case types.Mode.traverseLast:
                r = this.transAfter(iterate);
                break;
            default:
                r = this.trans(iterate);
                break;
        }
        return r;
    }
    eachChildren(iterate) {
        (this.children || []).forEach(item => {
            return iterate(item);
        });
    }
    /**
     *do express work in routing.
     *
     *@param {Express<T, void | boolean>} express
     *
     *@memberOf IComponent
     */
    routeUp(iterate) {
        let curr = this;
        if (iterate(curr) === false) {
            return false;
        }
        
        if (this.parent && this.parent.routeUp) {
            return this.parent.routeUp(iterate);
        }
    }
    /**
     *translate all sub context to do express work.
     *
     *@param {Express<T, void | boolean>} express
     *
     *@memberOf IComponent
     */
    trans(express) {
        let curr = this;
        if (express(curr) === false) {
            return false;
        }
        let children = this.children || [];
        for (let i = 0; i < children.length; i++) {
            let result = children[i].trans(express);
            if (result === false) {
                return result;
            }
        }
        return true;
    }
    transAfter(express) {
        let children = this.children || [];
        for (let i = 0; i < children.length; i++) {
            let result = children[i].transAfter(express);
            if (result === false) {
                return false;
            }
        }
        let curr = this;
        if (express(curr) === false) {
            return false;
        }
        return true;
    }
    equals(node) {
        return this === node;
    }
    empty() {
        return NullComponent_1.NullNode;
    }
    isEmpty() {
        return this.equals(this.empty());
    }
}
GComposite.classAnnations = { "name": "GComposite", "params": { "constructor": ["name"], "add": ["node"], "remove": ["node"], "find": ["express", "mode"], "filter": ["express", "mode"], "each": ["iterate", "mode"], "eachChildren": ["iterate"], "routeUp": ["iterate"], "trans": ["express"], "transAfter": ["express"], "equals": ["node"], "empty": [], "isEmpty": [] } };
exports.GComposite = GComposite;




});

unwrapExports(GComposite_1);
var GComposite_2 = GComposite_1.GComposite;

var Composite_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * compoiste.
 *
 * @export
 * @class Composite
 * @implements {IComponent}
 */
class Composite extends GComposite_1.GComposite {
    constructor(name) {
        super(name);
    }
    find(express, mode) {
        return super.find(express, mode);
    }
    filter(express, mode) {
        return super.filter(express, mode);
    }
    each(express, mode) {
        return super.each(express, mode);
    }
    eachChildren(express) {
        super.eachChildren(express);
    }
}
Composite.classAnnations = { "name": "Composite", "params": { "constructor": ["name"], "find": ["express", "mode"], "filter": ["express", "mode"], "each": ["express", "mode"], "eachChildren": ["express"] } };
exports.Composite = Composite;




});

unwrapExports(Composite_1);
var Composite_2 = Composite_1.Composite;

var components = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

tslib_1.__exportStar(Composite_1, exports);
tslib_1.__exportStar(GComposite_1, exports);
tslib_1.__exportStar(NullComponent_1, exports);




});

unwrapExports(components);

var NullAction = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

class NullActionClass extends components.NullComponent {
    insert(action, index) {
        return this;
    }
    execute(container, data, name) {
    }
    empty() {
        return exports.NullAction;
    }
}
NullActionClass.classAnnations = { "name": "NullActionClass", "params": { "insert": ["action", "index"], "execute": ["container", "data", "name"], "empty": [] } };
/**
 * Null Action
 */
exports.NullAction = new NullActionClass();




});

unwrapExports(NullAction);
var NullAction_1 = NullAction.NullAction;

var ActionComposite_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });


/**
 * action composite
 *
 * @export
 * @class ActionComposite
 * @extends {GComposite<ActionComponent>}
 * @implements {ActionComponent}
 */
class ActionComposite extends components.GComposite {
    constructor(name) {
        super(name);
        this.children = [];
    }
    insert(node, index) {
        node.parent = this;
        if (index < 0) {
            index = 0;
        }
        else if (index >= this.children.length) {
            index = this.children.length - 1;
        }
        this.children.splice(index, 0, node);
        return this;
    }
    execute(container, data, name) {
        if (name) {
            this.find(it => it.name === name)
                .execute(container, data);
        }
        else {
            this.trans(action => {
                if (action instanceof ActionComposite) {
                    action.working(container, data);
                }
            });
        }
    }
    empty() {
        return NullAction.NullAction;
    }
    working(container, data) {
        // do nothing.
    }
}
ActionComposite.classAnnations = { "name": "ActionComposite", "params": { "constructor": ["name"], "insert": ["node", "index"], "execute": ["container", "data", "name"], "empty": [], "working": ["container", "data"] } };
exports.ActionComposite = ActionComposite;




});

unwrapExports(ActionComposite_1);
var ActionComposite_2 = ActionComposite_1.ActionComposite;

var LifeState_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * life state.
 *
 * @export
 * @enum {number}
 */
var LifeState;
(function (LifeState) {
    /**
     * before create constructor Args
     */
    LifeState["beforeCreateArgs"] = "beforeCreateArgs";
    /**
     * before constructor advice action.
     */
    LifeState["beforeConstructor"] = "beforeConstructor";
    /**
     * after constructor advice action.
     */
    LifeState["afterConstructor"] = "afterConstructor";
    /**
     * on init.
     */
    LifeState["onInit"] = "onInit";
    /**
     * after init.
     */
    LifeState["AfterInit"] = "AfterInit";
})(LifeState = exports.LifeState || (exports.LifeState = {}));




});

unwrapExports(LifeState_1);
var LifeState_2 = LifeState_1.LifeState;

var CoreActions_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * cores decorator actions
 *
 * @export
 */
var CoreActions;
(function (CoreActions) {
    /**
     * the action bind parameter type form metadata.
     */
    CoreActions["bindParameterType"] = "bindParameterType";
    /**
     * the action bind Property type from metadata.
     */
    CoreActions["bindPropertyType"] = "bindPropertyType";
    /**
     * inject property action.
     */
    CoreActions["injectProperty"] = "injectProperty";
    /**
     * class provider bind action.
     */
    CoreActions["bindProvider"] = "bindProvider";
    /**
     * bind parameter provider action.
     */
    CoreActions["bindParameterProviders"] = "bindParameterProviders";
    /**
     * cache action.
     */
    CoreActions["cache"] = "cache";
    /**
     * component init action.  after constructor befor property inject.
     */
    CoreActions["componentBeforeInit"] = "componentBeforeInit";
    /**
     * component on init hooks. after property inject.
     */
    CoreActions["componentInit"] = "componentInit";
    /**
     * component after init hooks. after component init.
     */
    CoreActions["componentAfterInit"] = "componentAfterInit";
    /**
     * singleton action.
     */
    CoreActions["singletion"] = "singletion";
    /**
     * autorun action.
     */
    CoreActions["autorun"] = "autorun";
    /**
     * method autorun action.
     */
    CoreActions["methodAutorun"] = "methodAutorun";
})(CoreActions = exports.CoreActions || (exports.CoreActions = {}));




});

unwrapExports(CoreActions_1);
var CoreActions_2 = CoreActions_1.CoreActions;

var ArgsIterator_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

class ArgsIterator {
    constructor(args) {
        this.args = args;
        this.idx = -1;
        this.metadata = null;
    }
    isCompeted() {
        return this.idx >= this.args.length;
    }
    end() {
        this.idx = this.args.length;
    }
    next(express) {
        this.idx++;
        if (this.isCompeted()) {
            return null;
        }
        let arg = this.args[this.idx];
        if (express.isMetadata && express.isMetadata(arg)) {
            this.metadata = utils.lang.assign(this.metadata || {}, arg);
            this.end();
        }
        else if (express.match(arg)) {
            this.metadata = this.metadata || {};
            express.setMetadata(this.metadata, arg);
        }
        else if (utils.isMetadataObject(arg)) { // when match failed then check is base metadata.
            this.metadata = utils.lang.assign(this.metadata || {}, arg);
            this.end();
        }
        else {
            this.end();
        }
    }
    getArgs() {
        return this.args;
    }
    getMetadata() {
        return this.metadata;
    }
}
ArgsIterator.classAnnations = { "name": "ArgsIterator", "params": { "constructor": ["args"], "isCompeted": [], "end": [], "next": ["express"], "getArgs": [], "getMetadata": [] } };
exports.ArgsIterator = ArgsIterator;




});

unwrapExports(ArgsIterator_1);
var ArgsIterator_2 = ArgsIterator_1.ArgsIterator;

var DecoratorType_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * decorator type category.
 *
 * @export
 * @enum {number}
 */
var DecoratorType;
(function (DecoratorType) {
    /**
     * Class decorator
     */
    DecoratorType[DecoratorType["Class"] = 1] = "Class";
    /**
     * Parameter decorator
     */
    DecoratorType[DecoratorType["Parameter"] = 2] = "Parameter";
    /**
     * Property decorator
     */
    DecoratorType[DecoratorType["Property"] = 4] = "Property";
    /**
     * Method decorator
     */
    DecoratorType[DecoratorType["Method"] = 8] = "Method";
    /**
     * decorator for any where.
     */
    DecoratorType[DecoratorType["All"] = 13] = "All";
})(DecoratorType = exports.DecoratorType || (exports.DecoratorType = {}));




});

unwrapExports(DecoratorType_1);
var DecoratorType_2 = DecoratorType_1.DecoratorType;

var DecoratorFactory = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });




exports.ParamerterName = 'paramerter_names';
/**
 * create dectorator for class params props methods.
 *
 * @export
 * @template T
 * @param {string} name
 * @param {MetadataAdapter} [adapter]  metadata adapter
 * @param {MetadataExtends<T>} [metadataExtends] add extents for metadata.
 * @returns {*}
 */
function createDecorator(name, adapter, metadataExtends) {
    let metaName = `@${name}`;
    let factory = (...args) => {
        let metadata = null;
        if (args.length < 1) {
            return (...args) => {
                return storeMetadata(name, metaName, args, metadata, metadataExtends);
            };
        }
        metadata = argsToMetadata(args, adapter);
        if (metadata) {
            return (...args) => {
                return storeMetadata(name, metaName, args, metadata, metadataExtends);
            };
        }
        else {
            if (args.length === 1) {
                if (!utils.isClass(args[0])) {
                    return (...args) => {
                        return storeMetadata(name, metaName, args, metadata, metadataExtends);
                    };
                }
            }
        }
        return storeMetadata(name, metaName, args, metadata, metadataExtends);
    };
    factory.toString = () => metaName;
    factory.decoratorType = DecoratorType_1.DecoratorType.All;
    return factory;
}
exports.createDecorator = createDecorator;
function argsToMetadata(args, adapter) {
    let metadata = null;
    if (args.length) {
        if (adapter) {
            let iterator = new ArgsIterator_1.ArgsIterator(args);
            adapter(iterator);
            metadata = iterator.getMetadata();
        }
        else if (args.length === 1 && utils.isMetadataObject(args[0])) {
            metadata = args[0];
        }
    }
    return metadata;
}
function storeMetadata(name, metaName, args, metadata, metadataExtends) {
    let target;
    switch (args.length) {
        case 1:
            target = args[0];
            if (utils.isClass(target) || utils.isAbstractDecoratorClass(target)) {
                setTypeMetadata(name, metaName, target, metadata, metadataExtends);
                return target;
            }
            break;
        case 2:
            target = args[0];
            let propertyKey = args[1];
            setPropertyMetadata(name, metaName, target, propertyKey, metadata, metadataExtends);
            break;
        case 3:
            if (utils.isNumber(args[2])) {
                target = args[0];
                let propertyKey = args[1];
                let parameterIndex = args[2];
                setParamMetadata(name, metaName, target, propertyKey, parameterIndex, metadata, metadataExtends);
            }
            else if (utils.isUndefined(args[2])) {
                target = args[0];
                let propertyKey = args[1];
                setPropertyMetadata(name, metaName, target, propertyKey, metadata, metadataExtends);
            }
            else {
                target = args[0];
                let propertyKey = args[1];
                let descriptor = args[2];
                setMethodMetadata(name, metaName, target, propertyKey, descriptor, metadata, metadataExtends);
                return descriptor;
            }
            break;
        default:
            throw new Error(`Invalid @${name} Decorator declaration.`);
    }
}
/**
 * get all class metadata of one specail decorator in target type.
 *
 * @export
 * @template T
 * @param {(string | Function)} decorator
 * @param {Type<any>} target
 * @returns
 */
function getTypeMetadata(decorator, target) {
    let annotations = Reflect.getOwnMetadata(utils.isFunction(decorator) ? decorator.toString() : decorator, target);
    annotations = utils.isArray(annotations) ? annotations : [];
    return annotations;
}
exports.getTypeMetadata = getTypeMetadata;
/**
 * get own class metadata of one specail decorator in target type.
 *
 * @export
 * @template T
 * @param {(string | Function)} decorator
 * @param {Type<any>} target
 * @returns
 */
function getOwnTypeMetadata(decorator, target) {
    let annotations = Reflect.getOwnMetadata(utils.isFunction(decorator) ? decorator.toString() : decorator, target);
    annotations = utils.isArray(annotations) ? annotations : [];
    return annotations;
}
exports.getOwnTypeMetadata = getOwnTypeMetadata;
/**
 * has class decorator metadata.
 *
 * @export
 * @param {(string | Function)} decorator
 * @param {(Type<any> | object)} target
 * @returns {boolean}
 */
function hasClassMetadata(decorator, target) {
    let name = utils.isFunction(decorator) ? decorator.toString() : decorator;
    return Reflect.hasMetadata(name, target);
}
exports.hasClassMetadata = hasClassMetadata;
/**
 * has own class decorator metadata.
 *
 * @export
 * @param {(string | Function)} decorator
 * @param {(Type<any> | object)} target
 * @returns {boolean}
 */
function hasOwnClassMetadata(decorator, target) {
    let name = utils.isFunction(decorator) ? decorator.toString() : decorator;
    return Reflect.hasOwnMetadata(name, target);
}
exports.hasOwnClassMetadata = hasOwnClassMetadata;
function setTypeMetadata(name, metaName, target, metadata, metadataExtends) {
    let annotations = getOwnTypeMetadata(metaName, target).slice(0);
    // let designParams = Reflect.getMetadata('design:paramtypes', target) || [];
    let typeMetadata = (metadata || {});
    if (!typeMetadata.type) {
        typeMetadata.type = target;
    }
    typeMetadata.decorator = name;
    if (metadataExtends) {
        typeMetadata = metadataExtends(typeMetadata);
    }
    annotations.unshift(typeMetadata);
    setParamerterNames(target);
    Reflect.defineMetadata(metaName, annotations, target);
}
let methodMetadataExt = '__method';
/**
 * get all method metadata of one specail decorator in target type.
 *
 * @export
 * @template T
 * @param {(string | Function)} decorator
 * @param {Type<any>} target
 * @returns {ObjectMap<T[]>}
 */
function getMethodMetadata(decorator, target) {
    let name = utils.isFunction(decorator) ? decorator.toString() : decorator;
    let meta = Reflect.getMetadata(name + methodMetadataExt, target);
    if (!meta || utils.isArray(meta) || !utils.lang.hasField(meta)) {
        meta = Reflect.getMetadata(name + methodMetadataExt, target.constructor);
    }
    return utils.isArray(meta) ? {} : (meta || {});
}
exports.getMethodMetadata = getMethodMetadata;
/**
 * get own method metadata of one specail decorator in target type.
 *
 * @export
 * @template T
 * @param {(string | Function)} decorator
 * @param {Type<any>} target
 * @returns {ObjectMap<T[]>}
 */
function getOwnMethodMetadata(decorator, target) {
    let name = utils.isFunction(decorator) ? decorator.toString() : decorator;
    let meta = Reflect.getOwnMetadata(name + methodMetadataExt, target);
    if (!meta || utils.isArray(meta) || !utils.lang.hasField(meta)) {
        meta = Reflect.getOwnMetadata(name + methodMetadataExt, target.constructor);
    }
    return utils.isArray(meta) ? {} : (meta || {});
}
exports.getOwnMethodMetadata = getOwnMethodMetadata;
/**
 * has own method decorator metadata.
 *
 * @export
 * @param {(string | Function)} decorator
 * @param {Type<any>} target
 * @param {(string | symbol)} [propertyKey]
 * @returns {boolean}
 */
function hasOwnMethodMetadata(decorator, target, propertyKey) {
    let name = utils.isFunction(decorator) ? decorator.toString() : decorator;
    if (propertyKey) {
        let meta = getOwnMethodMetadata(name, target);
        return meta && meta.hasOwnProperty(propertyKey);
    }
    else {
        return Reflect.hasOwnMetadata(name + methodMetadataExt, target);
    }
}
exports.hasOwnMethodMetadata = hasOwnMethodMetadata;
/**
 * has method decorator metadata.
 *
 * @export
 * @param {(string | Function)} decorator
 * @param {Type<any>} target
 * @param {(string | symbol)} [propertyKey]
 * @returns {boolean}
 */
function hasMethodMetadata(decorator, target, propertyKey) {
    let name = utils.isFunction(decorator) ? decorator.toString() : decorator;
    if (propertyKey) {
        let meta = getMethodMetadata(name, target);
        return meta && meta.hasOwnProperty(propertyKey);
    }
    else {
        return Reflect.hasMetadata(name + methodMetadataExt, target);
    }
}
exports.hasMethodMetadata = hasMethodMetadata;
function setMethodMetadata(name, metaName, target, propertyKey, descriptor, metadata, metadataExtends) {
    let meta = utils.lang.assign({}, getOwnMethodMetadata(metaName, target));
    meta[propertyKey] = meta[propertyKey] || [];
    let methodMeadata = (metadata || {});
    methodMeadata.decorator = name;
    methodMeadata.propertyKey = propertyKey;
    // methodMeadata.descriptor = descriptor;
    if (metadataExtends) {
        methodMeadata = metadataExtends(methodMeadata);
    }
    meta[propertyKey].unshift(methodMeadata);
    Reflect.defineMetadata(metaName + methodMetadataExt, meta, target.constructor);
}
let propertyMetadataExt = '__props';
/**
 * get all property metadata of one specail decorator in target type.
 *
 * @export
 * @template T
 * @param {(string | Function)} decorator
 * @param {Type<any>} target
 * @returns {ObjectMap<T[]>}
 */
function getPropertyMetadata(decorator, target) {
    let name = utils.isFunction(decorator) ? decorator.toString() : decorator;
    let meta = Reflect.getMetadata(name + propertyMetadataExt, target);
    if (!meta || utils.isArray(meta) || !utils.lang.hasField(meta)) {
        meta = Reflect.getMetadata(name + propertyMetadataExt, target.constructor);
    }
    return utils.isArray(meta) ? {} : (meta || {});
}
exports.getPropertyMetadata = getPropertyMetadata;
/**
 * get own property metadata of one specail decorator in target type.
 *
 * @export
 * @template T
 * @param {(string | Function)} decorator
 * @param {Type<any>} target
 * @returns {ObjectMap<T[]>}
 */
function getOwnPropertyMetadata(decorator, target) {
    let name = utils.isFunction(decorator) ? decorator.toString() : decorator;
    let meta = Reflect.getOwnMetadata(name + propertyMetadataExt, target);
    if (!meta || utils.isArray(meta) || !utils.lang.hasField(meta)) {
        meta = Reflect.getOwnMetadata(name + propertyMetadataExt, target.constructor);
    }
    return utils.isArray(meta) ? {} : (meta || {});
}
exports.getOwnPropertyMetadata = getOwnPropertyMetadata;
/**
 * has property decorator metadata.
 *
 * @export
 * @param {(string | Function)} decorator
 * @param {Type<any>} target
 * @param {(string | symbol)} [propertyKey]
 * @returns {boolean}
 */
function hasPropertyMetadata(decorator, target, propertyKey) {
    let name = utils.isFunction(decorator) ? decorator.toString() : decorator;
    if (propertyKey) {
        let meta = getPropertyMetadata(name, target);
        return meta && meta.hasOwnProperty(propertyKey);
    }
    else {
        return Reflect.hasMetadata(name + propertyMetadataExt, target);
    }
}
exports.hasPropertyMetadata = hasPropertyMetadata;
function setPropertyMetadata(name, metaName, target, propertyKey, metadata, metadataExtends) {
    let meta = utils.lang.assign({}, getOwnPropertyMetadata(metaName, target));
    let propmetadata = (metadata || {});
    propmetadata.propertyKey = propertyKey;
    propmetadata.decorator = name;
    if (!propmetadata.type) {
        let t = Reflect.getMetadata('design:type', target, propertyKey);
        if (!t) {
            // Needed to support react native inheritance
            t = Reflect.getMetadata('design:type', target.constructor, propertyKey);
        }
        propmetadata.type = t;
    }
    if (metadataExtends) {
        propmetadata = metadataExtends(propmetadata);
    }
    if (!meta[propertyKey] || !utils.isArray(meta[propertyKey])) {
        meta[propertyKey] = [];
    }
    meta[propertyKey].unshift(propmetadata);
    Reflect.defineMetadata(metaName + propertyMetadataExt, meta, target.constructor);
}
let paramsMetadataExt = '__params';
/**
 * get paramerter metadata of one specail decorator in target method.
 *
 * @export
 * @template T
 * @param {(string | Function)} decorator
 * @param {(Type<any> | object)} target
 * @param {(string | symbol)} propertyKey
 * @returns {T[][]}
 */
function getParamMetadata(decorator, target, propertyKey) {
    let name = utils.isFunction(decorator) ? decorator.toString() : decorator;
    let parameters = Reflect.getMetadata(name + paramsMetadataExt, target, propertyKey);
    parameters = utils.isArray(parameters) ? parameters : [];
    return parameters;
}
exports.getParamMetadata = getParamMetadata;
/**
 * get own paramerter metadata of one specail decorator in target method.
 *
 * @export
 * @template T
 * @param {(string | Function)} decorator
 * @param {(Type<any> | object)} target
 * @param {(string | symbol)} propertyKey
 * @returns {T[][]}
 */
function getOwnParamMetadata(decorator, target, propertyKey) {
    let name = utils.isFunction(decorator) ? decorator.toString() : decorator;
    let parameters = Reflect.getOwnMetadata(name + paramsMetadataExt, target, propertyKey);
    parameters = utils.isArray(parameters) ? parameters : [];
    return parameters;
}
exports.getOwnParamMetadata = getOwnParamMetadata;
/**
 * has param decorator metadata.
 *
 * @export
 * @param {(string | Function)} decorator
 * @param {(Type<any> | object)} target
 * @param {(string | symbol)} propertyKey
 * @returns {boolean}
 */
function hasParamMetadata(decorator, target, propertyKey) {
    let name = utils.isFunction(decorator) ? decorator.toString() : decorator;
    return Reflect.hasMetadata(name + paramsMetadataExt, target, propertyKey);
}
exports.hasParamMetadata = hasParamMetadata;
/**
 * has param decorator metadata.
 *
 * @export
 * @param {(string | Function)} decorator
 * @param {(Type<any> | object)} target
 * @param {(string | symbol)} propertyKey
 * @returns {boolean}
 */
function hasOwnParamMetadata(decorator, target, propertyKey) {
    let name = utils.isFunction(decorator) ? decorator.toString() : decorator;
    return Reflect.hasOwnMetadata(name + paramsMetadataExt, target, propertyKey);
}
exports.hasOwnParamMetadata = hasOwnParamMetadata;
function setParamMetadata(name, metaName, target, propertyKey, parameterIndex, metadata, metadataExtends) {
    let parameters = getOwnParamMetadata(metaName, target, propertyKey).slice(0);
    // there might be gaps if some in between parameters do not have annotations.
    // we pad with nulls.
    while (parameters.length <= parameterIndex) {
        parameters.push(null);
    }
    parameters[parameterIndex] = parameters[parameterIndex] || [];
    let paramMeadata = (metadata || {});
    if (!paramMeadata.type) {
        let t = Reflect.getOwnMetadata('design:type', target, propertyKey);
        if (!t) {
            // Needed to support react native inheritance
            t = Reflect.getOwnMetadata('design:type', target.constructor, propertyKey);
        }
        paramMeadata.type = t;
    }
    paramMeadata.propertyKey = propertyKey;
    paramMeadata.decorator = name;
    paramMeadata.index = parameterIndex;
    if (metadataExtends) {
        paramMeadata = metadataExtends(paramMeadata);
    }
    parameters[parameterIndex].unshift(paramMeadata);
    Reflect.defineMetadata(metaName + paramsMetadataExt, parameters, target, propertyKey);
}
function getParamerterNames(target) {
    let meta = Reflect.getMetadata(exports.ParamerterName, target);
    if (!meta || utils.isArray(meta) || !utils.lang.hasField(meta)) {
        meta = Reflect.getMetadata(exports.ParamerterName, target.constructor);
    }
    return utils.isArray(meta) ? {} : (meta || {});
}
exports.getParamerterNames = getParamerterNames;
function getOwnParamerterNames(target) {
    let meta = Reflect.getOwnMetadata(exports.ParamerterName, target);
    if (!meta || utils.isArray(meta) || !utils.lang.hasField(meta)) {
        meta = Reflect.getOwnMetadata(exports.ParamerterName, target.constructor);
    }
    return utils.isArray(meta) ? {} : (meta || {});
}
exports.getOwnParamerterNames = getOwnParamerterNames;
function setParamerterNames(target) {
    let meta = utils.lang.assign({}, getParamerterNames(target));
    let descriptors = Object.getOwnPropertyDescriptors(target.prototype);
    let isUglify = /^[a-z]/.test(target.name);
    let anName = '';
    if (target.classAnnations && target.classAnnations.params) {
        anName = target.classAnnations.name;
        meta = utils.lang.assign(meta, target.classAnnations.params);
    }
    if (!isUglify && target.name !== anName) {
        utils.lang.forIn(descriptors, (item, name) => {
            if (name !== 'constructor') {
                if (item.value) {
                    meta[name] = getParamNames(item.value);
                }
                if (item.set) {
                    meta[name] = getParamNames(item.set);
                }
            }
        });
        meta['constructor'] = getParamNames(target.prototype.constructor);
    }
    Reflect.defineMetadata(exports.ParamerterName, meta, target);
}
exports.setParamerterNames = setParamerterNames;
const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
const ARGUMENT_NAMES = /([^\s,]+)/g;
function getParamNames(func) {
    if (!utils.isFunction(func)) {
        return [];
    }
    let fnStr = func.toString().replace(STRIP_COMMENTS, '');
    let result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
    if (result === null) {
        result = [];
    }
    return result;
}




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
Object.defineProperty(exports, "__esModule", { value: true });





/**
 * create class decorator
 *
 * @export
 * @template T metadata type.
 * @param {string} name decorator name.
 * @param {MetadataAdapter} [adapter]  metadata adapter
 * @param {MetadataExtends<T>} [metadataExtends] add extents for metadata.
 * @returns {*}
 */
function createClassDecorator(name, adapter, metadataExtends) {
    let classAdapter = ((args) => {
        if (adapter) {
            adapter(args);
        }
        args.next({
            // isMetadata: (arg) => isClassMetadata(arg),
            match: (arg) => arg && (utils.isSymbol(arg) || utils.isString(arg) || (utils.isObject(arg) && arg instanceof Registration_1.Registration)),
            setMetadata: (metadata, arg) => {
                metadata.provide = arg;
            }
        });
        args.next({
            match: (arg) => utils.isString(arg),
            setMetadata: (metadata, arg) => {
                metadata.alias = arg;
            }
        });
        args.next({
            match: (arg) => utils.isBoolean(arg),
            setMetadata: (metadata, arg) => {
                metadata.singleton = arg;
            }
        });
        args.next({
            match: (arg) => utils.isNumber(arg),
            setMetadata: (metadata, arg) => {
                metadata.expires = arg;
            }
        });
    });
    let decorator = DecoratorFactory.createDecorator(name, classAdapter, metadataExtends);
    decorator.decoratorType = DecoratorType_1.DecoratorType.Class;
    return decorator;
}
exports.createClassDecorator = createClassDecorator;




});

unwrapExports(ClassDecoratorFactory);
var ClassDecoratorFactory_1 = ClassDecoratorFactory.createClassDecorator;

var MethodDecoratorFactory = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });




/**
 * create method decorator.
 *
 * @export
 * @template T metadata type.
 * @param {string} name decorator name.
 * @param {MetadataAdapter} [adapter]  metadata adapter
 * @param {MetadataExtends<T>} [metadataExtends] add extents for metadata.
 * @returns
 */
function createMethodDecorator(name, adapter, metadataExtends) {
    let methodAdapter = (args) => {
        if (adapter) {
            adapter(args);
        }
        args.next({
            match: (arg) => utils.isArray(arg),
            setMetadata: (metadata, arg) => {
                metadata.providers = arg;
            }
        });
    };
    let decorator = DecoratorFactory.createDecorator(name, methodAdapter, metadataExtends);
    decorator.decoratorType = DecoratorType_1.DecoratorType.Method;
    return decorator;
}
exports.createMethodDecorator = createMethodDecorator;




});

unwrapExports(MethodDecoratorFactory);
var MethodDecoratorFactory_1 = MethodDecoratorFactory.createMethodDecorator;

var ParamDecoratorFactory = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });




/**
 * create parameter decorator.
 *
 * @export
 * @template T metadata type.
 * @param {string} name decorator name.
 * @param {MetadataAdapter} [adapter]  metadata adapter
 * @param {MetadataExtends<T>} [metadataExtends] add extents for metadata.
 * @returns
 */
function createParamDecorator(name, adapter, metadataExtends) {
    let paramAdapter = ((args) => {
        if (adapter) {
            adapter(args);
        }
        args.next({
            isMetadata: (arg) => utils.isParamMetadata(arg),
            match: (arg) => utils.isToken(arg),
            setMetadata: (metadata, arg) => {
                metadata.provider = arg;
            }
        });
        // args.next<T>({
        //     match: (arg) => isString(arg),
        //     setMetadata: (metadata, arg) => {
        //         metadata.alias = arg;
        //     }
        // });
    });
    let decorator = DecoratorFactory.createDecorator(name, paramAdapter, metadataExtends);
    decorator.decoratorType = DecoratorType_1.DecoratorType.Parameter;
    return decorator;
}
exports.createParamDecorator = createParamDecorator;




});

unwrapExports(ParamDecoratorFactory);
var ParamDecoratorFactory_1 = ParamDecoratorFactory.createParamDecorator;

var PropertyDecoratorFactory = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });



/**
 * create property decorator.
 *
 * @export
 * @template T metadata type.
 * @param {string} name decorator name.
 * @param {MetadataAdapter} [adapter]  metadata adapter
 * @param {MetadataExtends<T>} [metadataExtends] add extents for metadata.
 * @returns
 */
function createPropDecorator(name, adapter, metadataExtends) {
    let propPropAdapter = ((args) => {
        if (adapter) {
            adapter(args);
        }
        args.next({
            isMetadata: (arg) => utils.isPropertyMetadata(arg),
            match: (arg) => utils.isToken(arg),
            setMetadata: (metadata, arg) => {
                metadata.provider = arg;
            }
        });
        // args.next<T>({
        //     match: (arg) => isString(arg),
        //     setMetadata: (metadata, arg) => {
        //         metadata.alias = arg;
        //     }
        // });
    });
    let decorator = DecoratorFactory.createDecorator(name, propPropAdapter, metadataExtends);
    decorator.decoratorType = DecoratorType_1.DecoratorType.Property;
    return decorator;
}
exports.createPropDecorator = createPropDecorator;




});

unwrapExports(PropertyDecoratorFactory);
var PropertyDecoratorFactory_1 = PropertyDecoratorFactory.createPropDecorator;

var ParamPropDecoratorFactory = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });




/**
 * create parameter or property decorator
 *
 * @export
 * @template T
 * @param {string} name
 * @param {MetadataAdapter} [adapter]  metadata adapter
 * @param {MetadataExtends<T>} [metadataExtends] add extents for metadata.
 * @returns {IParamPropDecorator<T>}
 */
function createParamPropDecorator(name, adapter, metadataExtends) {
    let paramPropAdapter = ((args) => {
        if (adapter) {
            adapter(args);
        }
        args.next({
            isMetadata: (arg) => utils.isParamPropMetadata(arg),
            match: (arg) => utils.isToken(arg),
            setMetadata: (metadata, arg) => {
                metadata.provider = arg;
            }
        });
        // args.next<T>({
        //     match: (arg) => isString(arg),
        //     setMetadata: (metadata, arg) => {
        //         metadata.alias = arg;
        //     }
        // });
    });
    let decorator = DecoratorFactory.createDecorator(name, paramPropAdapter, metadataExtends);
    decorator.decoratorType = DecoratorType_1.DecoratorType.Property | DecoratorType_1.DecoratorType.Parameter;
    return decorator;
}
exports.createParamPropDecorator = createParamPropDecorator;




});

unwrapExports(ParamPropDecoratorFactory);
var ParamPropDecoratorFactory_1 = ParamPropDecoratorFactory.createParamPropDecorator;

var ClassMethodDecoratorFactory = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });


/**
 * create decorator for class and method.
 *
 * @export
 * @template T
 * @param {string} name
 * @param {MetadataAdapter} [adapter]  metadata adapter
 * @param {MetadataExtends<T>} [metadataExtends] add extents for metadata.
 * @returns {IClassMethodDecorator<T>}
 */
function createClassMethodDecorator(name, adapter, metadataExtends) {
    let decorator = DecoratorFactory.createDecorator(name, adapter, metadataExtends);
    decorator.decoratorType = DecoratorType_1.DecoratorType.Class | DecoratorType_1.DecoratorType.Method;
    return decorator;
}
exports.createClassMethodDecorator = createClassMethodDecorator;




});

unwrapExports(ClassMethodDecoratorFactory);
var ClassMethodDecoratorFactory_1 = ClassMethodDecoratorFactory.createClassMethodDecorator;

var MethodPropDecoratorFactory = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });


/**
 * create method or property decorator
 *
 * @export
 * @template T
 * @param {string} name
 * @param {MetadataAdapter} [adapter]  metadata adapter
 * @param {MetadataExtends<T>} [metadataExtends] add extents for metadata.
 * @returns {IMethodPropDecorator<T>}
 */
function createMethodPropDecorator(name, adapter, metadataExtends) {
    let decorator = DecoratorFactory.createDecorator(name, adapter, metadataExtends);
    decorator.decoratorType = DecoratorType_1.DecoratorType.Method | DecoratorType_1.DecoratorType.Property;
    return decorator;
}
exports.createMethodPropDecorator = createMethodPropDecorator;




});

unwrapExports(MethodPropDecoratorFactory);
var MethodPropDecoratorFactory_1 = MethodPropDecoratorFactory.createMethodPropDecorator;

var MethodPropParamDecoratorFactory = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });


/**
 * define method or property decorator
 *
 * @export
 * @template T
 * @param {string} name
 * @param {MetadataAdapter} [adapter]  metadata adapter
 * @param {MetadataExtends<T>} [metadataExtends] add extents for metadata.
 * @returns {IMethodPropParamDecorator<T>}
 */
function createMethodPropParamDecorator(name, adapter, metadataExtends) {
    let decorator = DecoratorFactory.createDecorator(name, adapter, metadataExtends);
    decorator.decoratorType = DecoratorType_1.DecoratorType.Method | DecoratorType_1.DecoratorType.Property | DecoratorType_1.DecoratorType.Parameter;
    return decorator;
}
exports.createMethodPropParamDecorator = createMethodPropParamDecorator;




});

unwrapExports(MethodPropParamDecoratorFactory);
var MethodPropParamDecoratorFactory_1 = MethodPropParamDecoratorFactory.createMethodPropParamDecorator;

var factories = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

tslib_1.__exportStar(ArgsIterator_1, exports);
tslib_1.__exportStar(DecoratorType_1, exports);
tslib_1.__exportStar(DecoratorFactory, exports);
tslib_1.__exportStar(ClassDecoratorFactory, exports);
tslib_1.__exportStar(MethodDecoratorFactory, exports);
tslib_1.__exportStar(ParamDecoratorFactory, exports);
tslib_1.__exportStar(PropertyDecoratorFactory, exports);
tslib_1.__exportStar(ParamPropDecoratorFactory, exports);
tslib_1.__exportStar(ClassMethodDecoratorFactory, exports);
tslib_1.__exportStar(MethodPropDecoratorFactory, exports);
tslib_1.__exportStar(MethodPropParamDecoratorFactory, exports);




});

unwrapExports(factories);

var BindProviderAction_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });



/**
 * bind provider action. for binding a factory to an token.
 *
 * @export
 * @class BindProviderAction
 * @extends {ActionComposite}
 */
class BindProviderAction extends ActionComposite_1.ActionComposite {
    constructor() {
        super(CoreActions_1.CoreActions.bindProvider);
    }
    working(container, data) {
        let type = data.targetType;
        let lifeScope = container.getLifeScope();
        let matchs = lifeScope.getClassDecorators(surm => surm.actions.includes(CoreActions_1.CoreActions.bindProvider) && factories.hasOwnClassMetadata(surm.name, type));
        let provides = [];
        let raiseContainer = data.raiseContainer || container;
        matchs.forEach(surm => {
            let metadata = factories.getOwnTypeMetadata(surm.name, type);
            if (Array.isArray(metadata) && metadata.length > 0) {
                // bind all provider.
                metadata.forEach(c => {
                    if (c && c.provide) {
                        let provideKey = raiseContainer.getTokenKey(c.provide, c.alias);
                        provides.push(provideKey);
                        raiseContainer.bindProvider(provideKey, c.type);
                    }
                });
            }
        });
        data.execResult = provides;
    }
}
BindProviderAction.classAnnations = { "name": "BindProviderAction", "params": { "constructor": [], "working": ["container", "data"] } };
exports.BindProviderAction = BindProviderAction;




});

unwrapExports(BindProviderAction_1);
var BindProviderAction_2 = BindProviderAction_1.BindProviderAction;

var BindParameterTypeAction_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });




/**
 * bind parameter type action.
 *
 * @export
 * @class BindParameterTypeAction
 * @extends {ActionComposite}
 */
class BindParameterTypeAction extends ActionComposite_1.ActionComposite {
    constructor() {
        super(CoreActions_1.CoreActions.bindParameterType);
    }
    working(container, data) {
        if (data.raiseContainer && data.raiseContainer !== container) {
            return;
        }
        let target = data.target;
        let type = data.targetType;
        let propertyKey = data.propertyKey;
        let lifeScope = container.getLifeScope();
        let designParams;
        if (target && propertyKey) {
            designParams = Reflect.getMetadata('design:paramtypes', target, propertyKey) || [];
        }
        else {
            designParams = Reflect.getMetadata('design:paramtypes', type) || [];
        }
        designParams = designParams.slice(0);
        designParams.forEach(dtype => {
            if (lifeScope.isVaildDependence(dtype)) {
                if (!container.has(dtype)) {
                    container.register(dtype);
                }
            }
        });
        let matchs = lifeScope.getParameterDecorators((surm => {
            return surm.actions.includes(CoreActions_1.CoreActions.bindParameterType) && ((target || propertyKey !== 'constructor') ? factories.hasParamMetadata(surm.name, target, propertyKey)
                : factories.hasOwnParamMetadata(surm.name, type));
        }));
        matchs.forEach(surm => {
            let parameters = (target || propertyKey !== 'constructor') ? factories.getParamMetadata(surm.name, target, propertyKey) : factories.getOwnParamMetadata(surm.name, type);
            if (utils.isArray(parameters) && parameters.length) {
                parameters.forEach(params => {
                    let parm = (utils.isArray(params) && params.length > 0) ? params[0] : null;
                    if (parm && parm.index >= 0) {
                        if (lifeScope.isVaildDependence(parm.provider)) {
                            if (!container.has(parm.provider, parm.alias)) {
                                container.register(container.getToken(parm.provider, parm.alias));
                            }
                        }
                        if (lifeScope.isVaildDependence(parm.type)) {
                            if (!container.has(parm.type)) {
                                container.register(parm.type);
                            }
                        }
                        let token = parm.provider ? container.getTokenKey(parm.provider, parm.alias) : parm.type;
                        if (token) {
                            designParams[parm.index] = token;
                        }
                    }
                });
            }
        });
        data.execResult = designParams;
    }
}
BindParameterTypeAction.classAnnations = { "name": "BindParameterTypeAction", "params": { "constructor": [], "working": ["container", "data"] } };
exports.BindParameterTypeAction = BindParameterTypeAction;




});

unwrapExports(BindParameterTypeAction_1);
var BindParameterTypeAction_2 = BindParameterTypeAction_1.BindParameterTypeAction;

var BindPropertyTypeAction_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });



/**
 * bind property type action. to get the property autowride token of Type calss.
 *
 * @export
 * @class SetPropAction
 * @extends {ActionComposite}
 */
class BindPropertyTypeAction extends ActionComposite_1.ActionComposite {
    constructor() {
        super(CoreActions_1.CoreActions.bindPropertyType);
    }
    working(container, data) {
        if (data.raiseContainer && data.raiseContainer !== container) {
            return;
        }
        let type = data.targetType;
        let lifeScope = container.getLifeScope();
        let matchs = lifeScope.getPropertyDecorators(surm => surm.actions.includes(CoreActions_1.CoreActions.bindPropertyType) && factories.hasPropertyMetadata(surm.name, type));
        let list = [];
        matchs.forEach(surm => {
            let propMetadata = factories.getPropertyMetadata(surm.name, type);
            for (let n in propMetadata) {
                list = list.concat(propMetadata[n]);
            }
            list = list.filter(n => !!n);
            list.forEach(prop => {
                if (lifeScope.isVaildDependence(prop.provider)) {
                    if (!container.has(prop.provider, prop.alias)) {
                        container.register(container.getToken(prop.provider, prop.alias));
                    }
                }
                if (lifeScope.isVaildDependence(prop.type)) {
                    if (!container.has(prop.type)) {
                        container.register(prop.type);
                    }
                }
            });
        });
        data.execResult = list;
    }
}
BindPropertyTypeAction.classAnnations = { "name": "BindPropertyTypeAction", "params": { "constructor": [], "working": ["container", "data"] } };
exports.BindPropertyTypeAction = BindPropertyTypeAction;




});

unwrapExports(BindPropertyTypeAction_1);
var BindPropertyTypeAction_2 = BindPropertyTypeAction_1.BindPropertyTypeAction;

var InjectPropertyAction_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });


/**
 * inject property value action, to inject property value for resolve instance.
 *
 * @export
 * @class SetPropAction
 * @extends {ActionComposite}
 */
class InjectPropertyAction extends ActionComposite_1.ActionComposite {
    constructor() {
        super(CoreActions_1.CoreActions.injectProperty);
    }
    working(container, data) {
        if (!data.execResult) {
            this.parent.find(act => act.name === CoreActions_1.CoreActions.bindPropertyType).execute(container, data);
        }
        if (data.target && data.execResult && data.execResult.length) {
            let providerMap = data.providerMap;
            data.execResult.reverse().forEach((prop, idx) => {
                if (prop) {
                    let token = prop.provider ? container.getToken(prop.provider, prop.alias) : prop.type;
                    if (providerMap && providerMap.has(token)) {
                        data.target[prop.propertyKey] = providerMap.resolve(token, providerMap);
                    }
                    else if (container.has(token)) {
                        data.target[prop.propertyKey] = container.resolve(token, providerMap);
                    }
                }
            });
        }
    }
}
InjectPropertyAction.classAnnations = { "name": "InjectPropertyAction", "params": { "constructor": [], "working": ["container", "data"] } };
exports.InjectPropertyAction = InjectPropertyAction;




});

unwrapExports(InjectPropertyAction_1);
var InjectPropertyAction_2 = InjectPropertyAction_1.InjectPropertyAction;

var BindParameterProviderAction_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });




/**
 * bind parameters action.
 *
 * @export
 * @class BindParameterProviderAction
 * @extends {ActionComposite}
 */
class BindParameterProviderAction extends ActionComposite_1.ActionComposite {
    constructor() {
        super(CoreActions_1.CoreActions.bindParameterProviders);
    }
    working(container, data) {
        if (data.raiseContainer && data.raiseContainer !== container) {
            return;
        }
        let type = data.targetType;
        let propertyKey = data.propertyKey;
        let lifeScope = container.getLifeScope();
        let matchs = lifeScope.getMethodDecorators(surm => surm.actions.includes(CoreActions_1.CoreActions.bindParameterProviders) && factories.hasOwnMethodMetadata(surm.name, type));
        let providers = [];
        matchs.forEach(surm => {
            let methodmtas = factories.getOwnMethodMetadata(surm.name, type);
            let metadatas = methodmtas[propertyKey];
            if (metadatas && utils.isArray(metadatas) && metadatas.length > 0) {
                metadatas.forEach(meta => {
                    if (meta.providers && meta.providers.length > 0) {
                        providers = providers.concat(meta.providers);
                    }
                });
            }
        });
        data.execResult = providers;
    }
}
BindParameterProviderAction.classAnnations = { "name": "BindParameterProviderAction", "params": { "constructor": [], "working": ["container", "data"] } };
exports.BindParameterProviderAction = BindParameterProviderAction;




});

unwrapExports(BindParameterProviderAction_1);
var BindParameterProviderAction_2 = BindParameterProviderAction_1.BindParameterProviderAction;

var ComponentBeforeInitAction_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });



/**
 * component before init action, to run @Component decorator class before init hooks.
 *
 * @export
 * @class ComponentBeforeInitAction
 * @extends {ActionComposite}
 */
class ComponentBeforeInitAction extends ActionComposite_1.ActionComposite {
    constructor() {
        super(CoreActions_1.CoreActions.componentBeforeInit);
    }
    working(container, data) {
        if (data.raiseContainer && data.raiseContainer !== container) {
            return;
        }
        if (data.targetType && data.target) {
            let component = data.target;
            if (utils.isFunction(component.beforeInit)) {
                container.syncInvoke(data.targetType, 'beforeInit', data.target);
            }
        }
    }
}
ComponentBeforeInitAction.classAnnations = { "name": "ComponentBeforeInitAction", "params": { "constructor": [], "working": ["container", "data"] } };
exports.ComponentBeforeInitAction = ComponentBeforeInitAction;




});

unwrapExports(ComponentBeforeInitAction_1);
var ComponentBeforeInitAction_2 = ComponentBeforeInitAction_1.ComponentBeforeInitAction;

var ComponentInitAction_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });



/**
 * component before init action, to run @Component decorator class before init hooks.
 *
 * @export
 * @class ComponentInitAction
 * @extends {ActionComposite}
 */
class ComponentInitAction extends ActionComposite_1.ActionComposite {
    constructor() {
        super(CoreActions_1.CoreActions.componentInit);
    }
    working(container, data) {
        if (data.raiseContainer && data.raiseContainer !== container) {
            return;
        }
        if (data.targetType && data.target) {
            let component = data.target;
            if (utils.isFunction(component.onInit)) {
                container.syncInvoke(data.targetType, 'onInit', data.target);
            }
        }
    }
}
ComponentInitAction.classAnnations = { "name": "ComponentInitAction", "params": { "constructor": [], "working": ["container", "data"] } };
exports.ComponentInitAction = ComponentInitAction;




});

unwrapExports(ComponentInitAction_1);
var ComponentInitAction_2 = ComponentInitAction_1.ComponentInitAction;

var ComponentAfterInitAction_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });



/**
 * component after init action, to run @Component decorator class after init hooks.
 *
 * @export
 * @class ComponentAfterInitAction
 * @extends {ActionComposite}
 */
class ComponentAfterInitAction extends ActionComposite_1.ActionComposite {
    constructor() {
        super(CoreActions_1.CoreActions.componentAfterInit);
    }
    working(container, data) {
        if (data.raiseContainer && data.raiseContainer !== container) {
            return;
        }
        if (data.targetType && data.target) {
            let component = data.target;
            if (utils.isFunction(component.afterInit)) {
                container.syncInvoke(data.targetType, 'afterInit', data.target);
            }
        }
    }
}
ComponentAfterInitAction.classAnnations = { "name": "ComponentAfterInitAction", "params": { "constructor": [], "working": ["container", "data"] } };
exports.ComponentAfterInitAction = ComponentAfterInitAction;




});

unwrapExports(ComponentAfterInitAction_1);
var ComponentAfterInitAction_2 = ComponentAfterInitAction_1.ComponentAfterInitAction;

var ICacheManager = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * ICacheManager interface token.
 * it is a token id, you can register yourself ICacheManager for this.
 */
exports.CacheManagerToken = new InjectToken_1.InjectToken('DI_ICacheManager');




});

unwrapExports(ICacheManager);
var ICacheManager_1 = ICacheManager.CacheManagerToken;

var CacheAction_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });





/**
 * cache action. To cache instance of Token. define cache expires in decorator.
 *
 * @export
 * @class CacheAction
 * @extends {ActionComposite}
 */
class CacheAction extends ActionComposite_1.ActionComposite {
    constructor() {
        super(CoreActions_1.CoreActions.cache);
    }
    working(container, data) {
        if (data.raiseContainer && data.raiseContainer !== container) {
            return data;
        }
        if (data.singleton || !data.targetType || !utils.isClass(data.targetType)) {
            return data;
        }
        let cacheManager = container.get(ICacheManager.CacheManagerToken);
        if (data.target) {
            if (!cacheManager.hasCache(data.targetType)) {
                let cacheMetadata = this.getCacheMetadata(container, data);
                if (cacheMetadata) {
                    cacheManager.cache(data.targetType, data.target, cacheMetadata.expires);
                }
            }
        }
        else {
            let target = cacheManager.get(data.targetType);
            if (target) {
                let cacheMetadata = this.getCacheMetadata(container, data);
                if (cacheMetadata) {
                    cacheManager.cache(data.targetType, target, cacheMetadata.expires);
                    data.execResult = target;
                }
            }
        }
        return data;
    }
    getCacheMetadata(container, data) {
        let lifeScope = container.getLifeScope();
        let matchs = lifeScope.getClassDecorators(surm => factories.hasOwnClassMetadata(surm.name, data.targetType));
        let cacheMetadata;
        for (let i = 0; i < matchs.length; i++) {
            let surm = matchs[i];
            let metadata = factories.getOwnTypeMetadata(surm.name, data.targetType);
            if (Array.isArray(metadata) && metadata.length > 0) {
                cacheMetadata = metadata.find(c => c && utils.isNumber(c.expires) && c.expires > 0);
                if (cacheMetadata) {
                    break;
                }
            }
        }
        return cacheMetadata;
    }
}
CacheAction.classAnnations = { "name": "CacheAction", "params": { "constructor": [], "working": ["container", "data"], "getCacheMetadata": ["container", "data"] } };
exports.CacheAction = CacheAction;




});

unwrapExports(CacheAction_1);
var CacheAction_2 = CacheAction_1.CacheAction;

var SingletonAction = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });


/**
 * singleton action, to set the factory of Token as singleton.
 *
 * @export
 * @class SingletionAction
 * @extends {ActionComposite}
 */
class SingletionAction extends ActionComposite_1.ActionComposite {
    constructor() {
        super(CoreActions_1.CoreActions.singletion);
    }
    working(container, data) {
        if (data.raiseContainer && data.raiseContainer !== container) {
            return;
        }
        if (data.tokenKey && data.target && data.singleton) {
            container.registerValue(data.tokenKey, data.target);
        }
    }
}
SingletionAction.classAnnations = { "name": "SingletionAction", "params": { "constructor": [], "working": ["container", "data"] } };
exports.SingletionAction = SingletionAction;




});

unwrapExports(SingletonAction);
var SingletonAction_1 = SingletonAction.SingletionAction;

var Component = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * Component decorator, define for class. use to define the class. it can setting provider to some token, singleton or not. it will execute  [`ComponentLifecycle`]
 *
 * @Component
 */
exports.Component = factories.createClassDecorator('Component');




});

unwrapExports(Component);
var Component_1 = Component.Component;

var Injectable = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * Injectable decorator, define for class.  use to define the class. it can setting provider to some token, singleton or not.
 *
 * @Injectable
 */
exports.Injectable = factories.createClassDecorator('Injectable');




});

unwrapExports(Injectable);
var Injectable_1 = Injectable.Injectable;

var Inject = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * Inject decorator, for property or param, use to auto wried type instance or value to the instance of one class with the decorator.
 *
 * @Inject
 */
exports.Inject = factories.createParamPropDecorator('Inject');




});

unwrapExports(Inject);
var Inject_1 = Inject.Inject;

var AutoWried = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * AutoWired decorator, for property or param. use to auto wried type instance or value to the instance of one class with the decorator.
 *
 * @AutoWired
 */
exports.AutoWired = factories.createParamPropDecorator('AutoWired');




});

unwrapExports(AutoWried);
var AutoWried_1 = AutoWried.AutoWired;

var Param = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * param decorator, define for parameter. use to auto wried type instance or value to the instance of one class with the decorator.
 *
 * @Param
 */
exports.Param = factories.createParamDecorator('Param');




});

unwrapExports(Param);
var Param_1 = Param.Param;

var Method = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * method decorator.
 *
 * @Method
 */
exports.Method = factories.createMethodDecorator('Method');




});

unwrapExports(Method);
var Method_1 = Method.Method;

var Singleton = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * Singleton decorator, for class. use to define the class is singleton.
 *
 * @Singleton
 */
exports.Singleton = factories.createClassDecorator('Singleton', null, (metadata) => {
    metadata.singleton = true;
    return metadata;
});




});

unwrapExports(Singleton);
var Singleton_1 = Singleton.Singleton;

var Abstract = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * Abstract decorator. define for class.
 *
 * @Abstract
 */
exports.Abstract = factories.createClassDecorator('Abstract');




});

unwrapExports(Abstract);
var Abstract_1 = Abstract.Abstract;

var AutoRun = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });


/**
 * Autorun decorator, for class or method.  use to define the class auto run (via a method or not) after registered.
 *
 * @Autorun
 */
exports.Autorun = factories.createClassMethodDecorator('Autorun', args => {
    args.next({
        isMetadata: (arg) => utils.isClassMetadata(arg, ['autorun']),
        match: (arg) => utils.isString(arg) || utils.isNumber(arg),
        setMetadata: (metadata, arg) => {
            if (utils.isString(arg)) {
                metadata.autorun = arg;
            }
            else {
                metadata.order = arg;
            }
        }
    });
}, (metadata) => {
    metadata.singleton = true;
    return metadata;
});




});

unwrapExports(AutoRun);
var AutoRun_1 = AutoRun.Autorun;

var IocExt = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });


/**
 * IocExt decorator. define for class, use to define the class is Ioc extends module. it will auto run after registered to helper your to setup module.
 *
 * @IocExt
 */
exports.IocExt = factories.createClassDecorator('IocExt', args => {
    args.next({
        isMetadata: (arg) => utils.isClassMetadata(arg, ['autorun']),
        match: (arg) => utils.isString(arg),
        setMetadata: (metadata, arg) => {
            metadata.autorun = arg;
        }
    });
}, (metadata) => {
    metadata.singleton = true;
    return metadata;
});
exports.IocModule = exports.IocExt;




});

unwrapExports(IocExt);
var IocExt_1 = IocExt.IocExt;
var IocExt_2 = IocExt.IocModule;

var decorators = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

tslib_1.__exportStar(Component, exports);
tslib_1.__exportStar(Injectable, exports);
tslib_1.__exportStar(Inject, exports);
tslib_1.__exportStar(AutoWried, exports);
tslib_1.__exportStar(Param, exports);
tslib_1.__exportStar(Method, exports);
tslib_1.__exportStar(Singleton, exports);
tslib_1.__exportStar(Abstract, exports);
tslib_1.__exportStar(AutoRun, exports);
tslib_1.__exportStar(IocExt, exports);




});

unwrapExports(decorators);

var AutorunAction_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });





/**
 * Inject DrawType action.
 *
 * @export
 * @class SetPropAction
 * @extends {ActionComposite}
 */
class AutorunAction extends ActionComposite_1.ActionComposite {
    constructor() {
        super(CoreActions_1.CoreActions.autorun);
    }
    getDecorator() {
        return [decorators.IocExt, decorators.Autorun];
    }
    working(container, data) {
        if (data.raiseContainer && data.raiseContainer !== container) {
            return;
        }
        if (data.tokenKey && data.targetType) {
            let decorators$$1 = this.getDecorator();
            decorators$$1.forEach(decorator => {
                if (factories.hasClassMetadata(decorator, data.targetType)) {
                    let metas = factories.getTypeMetadata(decorator, data.targetType);
                    let meta = metas.find(it => !!it.autorun);
                    if (!meta && metas.length) {
                        meta = metas[0];
                    }
                    if (meta) {
                        let instance = container.get(data.tokenKey);
                        if (instance && meta.autorun && utils.isFunction(instance[meta.autorun])) {
                            container.syncInvoke(data.tokenKey, meta.autorun, instance);
                        }
                    }
                }
            });
        }
    }
}
AutorunAction.classAnnations = { "name": "AutorunAction", "params": { "constructor": [], "getDecorator": [], "working": ["container", "data"] } };
exports.AutorunAction = AutorunAction;




});

unwrapExports(AutorunAction_1);
var AutorunAction_2 = AutorunAction_1.AutorunAction;

var actions = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

tslib_1.__exportStar(ActionComposite_1, exports);
tslib_1.__exportStar(LifeState_1, exports);
tslib_1.__exportStar(CoreActions_1, exports);
tslib_1.__exportStar(NullAction, exports);
tslib_1.__exportStar(BindProviderAction_1, exports);
tslib_1.__exportStar(BindParameterTypeAction_1, exports);
tslib_1.__exportStar(BindPropertyTypeAction_1, exports);
tslib_1.__exportStar(InjectPropertyAction_1, exports);
tslib_1.__exportStar(BindParameterProviderAction_1, exports);
tslib_1.__exportStar(ComponentBeforeInitAction_1, exports);
tslib_1.__exportStar(ComponentInitAction_1, exports);
tslib_1.__exportStar(ComponentAfterInitAction_1, exports);
tslib_1.__exportStar(CacheAction_1, exports);
tslib_1.__exportStar(SingletonAction, exports);
tslib_1.__exportStar(AutorunAction_1, exports);




});

unwrapExports(actions);

var ProviderMap_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });


exports.ProviderMapToken = new InjectToken_1.InjectToken('DI_ProviderMap');
/**
 * Provider Map
 *
 * @export
 * @class Providers
 */
class ProviderMap {
    constructor(container) {
        this.container = container;
        this.maps = new utils.MapSet();
    }
    has(provide) {
        return this.maps.has(provide);
    }
    get(provide) {
        return this.maps.get(provide);
    }
    add(provide, provider) {
        if (utils.isUndefined(provide)) {
            return this;
        }
        let factory;
        if (utils.isToken(provider) && this.container.has(provider)) {
            factory = (...providers) => {
                return this.container.resolve(provider, ...providers);
            };
        }
        else {
            if (utils.isFunction(provider)) {
                factory = (...providers) => {
                    return provider(this.container, ...providers);
                };
            }
            else {
                factory = () => {
                    return provider;
                };
            }
        }
        this.maps.set(provide, factory);
        return this;
    }
    remove(provide) {
        if (this.maps.has(provide)) {
            this.maps.delete(provide);
        }
        return this;
    }
    resolve(provide, ...providers) {
        if (!this.maps.has(provide)) {
            return (!utils.isNumber(provide) && this.container.has(provide)) ? this.container.resolve(provide, ...providers) : null;
        }
        let provider = this.maps.get(provide);
        return utils.isToken(provider) ? this.container.resolve(provider, ...providers) : provider(...providers);
    }
    forEach(express) {
        this.maps.forEach(express);
    }
    copy(map) {
        if (!map) {
            return;
        }
        map.forEach((val, token) => {
            this.maps.set(token, val);
        });
    }
}
ProviderMap.classAnnations = { "name": "ProviderMap", "params": { "constructor": ["container"], "has": ["provide"], "get": ["provide"], "add": ["provide", "provider"], "remove": ["provide"], "resolve": ["provide", "providers"], "forEach": ["express"], "copy": ["map"] } };
exports.ProviderMap = ProviderMap;




});

unwrapExports(ProviderMap_1);
var ProviderMap_2 = ProviderMap_1.ProviderMapToken;
var ProviderMap_3 = ProviderMap_1.ProviderMap;

var Provider_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 *  provider, to dynamic resovle instance of params in run time.
 *
 * @export
 * @class Provider
 */
class Provider {
    constructor(type, value) {
        this.type = type;
        this.value = value;
    }
    /**
     * resolve provider value.
     *
     * @template T
     * @param {IContainer} container
     * @param {Providers[]} providers
     * @returns {T}
     * @memberof Provider
     */
    resolve(container, ...providers) {
        if (utils.isUndefined(this.value)) {
            return container.has(this.type) ? container.resolve(this.type, ...providers) : null;
        }
        else {
            return this.value; // isFunction(this.value) ? this.value(container) : this.value;
        }
    }
    /**
     * create provider.
     *
     * @static
     * @param {Token<any>} type
     * @param {(any)} value
     * @returns Provider
     * @memberof Provider
     */
    static create(type, value) {
        return new Provider(type, value);
    }
    /**
     * create extends provider.
     *
     * @static
     * @param {Token<any>} token
     * @param {(any)} value
     * @param {Express2<any, ExtendsProvider, void>} [extendsTarget]
     * @returns {ExtendsProvider}
     * @memberof Provider
     */
    static createExtends(token, value, extendsTarget) {
        return new ExtendsProvider(token, value, extendsTarget);
    }
    // /**
    //  * create custom provider.
    //  *
    //  * @static
    //  * @param {Token<any>} [type]
    //  * @param {ToInstance<any>} [toInstance]
    //  * @param {*} [value]
    //  * @returns {CustomProvider}
    //  * @memberof Provider
    //  */
    // static createCustom(type?: Token<any>, toInstance?: ToInstance<any>, value?: any): CustomProvider {
    //     return new CustomProvider(type, toInstance, value);
    // }
    /**
     * create invoked provider.
     *
     * @static
     * @param {Token<any>} token
     * @param {string} method
     * @param {(any)} [value]
     * @returns {InvokeProvider}
     * @memberof Provider
     */
    static createInvoke(token, method, value) {
        return new InvokeProvider(token, method, value);
    }
    /**
     * create param provider.
     *
     * @static
     * @param {Token<any>} token
     * @param {(any)} value
     * @param {number} [index]
     * @param {string} [method]
     * @returns {ParamProvider}
     * @memberof Provider
     */
    static createParam(token, value, index, method) {
        return new ParamProvider(token, value, index, method);
    }
}
// /**
//  * create async param provider.
//  *
//  * @static
//  * @param {(string | string[])} files
//  * @param {Token<any>} token
//  * @param {number} [index]
//  * @param {string} [method]
//  * @param {(any)} [value]
//  * @returns {AsyncParamProvider}
//  * @memberof Provider
//  */
// static createAsyncParam(files: string | string[], token: Token<any>, index?: number, method?: string, value?: any): AsyncParamProvider {
//     return new AsyncParamProvider(files, token, index, method, value)
// }
Provider.classAnnations = { "name": "Provider", "params": { "constructor": ["type", "value"], "resolve": ["container", "providers"], "create": ["type", "value"], "createExtends": ["token", "value", "extendsTarget"], "createInvoke": ["token", "method", "value"], "createParam": ["token", "value", "index", "method"] } };
exports.Provider = Provider;
/**
 * InvokeProvider
 *
 * @export
 * @class InvokeProvider
 * @extends {Provider}
 */
class InvokeProvider extends Provider {
    constructor(type, method, value) {
        super(type, value);
        this.method = method;
    }
    resolve(container, ...providers) {
        if (this.method) {
            return container.syncInvoke(this.type, this.method, ...providers);
        }
        return super.resolve(container, ...providers);
    }
}
InvokeProvider.classAnnations = { "name": "InvokeProvider", "params": { "constructor": ["type", "method", "value"], "resolve": ["container", "providers"] } };
exports.InvokeProvider = InvokeProvider;
/**
 * param provider.
 *
 * @export
 * @interface ParamProvider
 */
class ParamProvider extends InvokeProvider {
    constructor(token, value, index, method) {
        super(token, method, value);
        this.index = index;
    }
    resolve(container, ...providers) {
        return super.resolve(container, ...providers);
    }
}
ParamProvider.classAnnations = { "name": "ParamProvider", "params": { "constructor": ["token", "value", "index", "method"], "resolve": ["container", "providers"] } };
exports.ParamProvider = ParamProvider;
/**
 * Provider enable exntends target with provider in dynamic.
 *
 * @export
 * @class ExtendsProvider
 * @extends {Provider}
 */
class ExtendsProvider extends Provider {
    constructor(token, value, extendsTarget) {
        super(token, value);
        this.extendsTarget = extendsTarget;
    }
    resolve(container, ...providers) {
        return super.resolve(container, ...providers);
    }
    extends(target) {
        if (utils.isObject(target) && utils.isFunction(this.extendsTarget)) {
            this.extendsTarget(target, this);
        }
    }
}
ExtendsProvider.classAnnations = { "name": "ExtendsProvider", "params": { "constructor": ["token", "value", "extendsTarget"], "resolve": ["container", "providers"], "extends": ["target"] } };
exports.ExtendsProvider = ExtendsProvider;




});

unwrapExports(Provider_1);
var Provider_2 = Provider_1.Provider;
var Provider_3 = Provider_1.InvokeProvider;
var Provider_4 = Provider_1.ParamProvider;
var Provider_5 = Provider_1.ExtendsProvider;

var providers = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });



tslib_1.__exportStar(Provider_1, exports);
// export * from './ExtendsProvider';
tslib_1.__exportStar(ProviderMap_1, exports);
// export * from './InvokeProvider';
// export * from './ParamProvider';
// export * from './AsyncParamProvider';
/**
 * object is provider map or not.
 *
 * @export
 * @param {object} target
 * @returns {target is ProviderMap}
 */
function isProviderMap(target) {
    if (!utils.isObject(target)) {
        return false;
    }
    return target instanceof ProviderMap_1.ProviderMap;
}
exports.isProviderMap = isProviderMap;




});

unwrapExports(providers);
var providers_1 = providers.isProviderMap;

var IRecognizer = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * IRecognizer interface token.
 * it is a token id, you can register yourself IRecognizer for this.
 */
exports.RecognizerToken = new InjectToken_1.InjectToken('DI_IRecognizer');




});

unwrapExports(IRecognizer);
var IRecognizer_1 = IRecognizer.RecognizerToken;

var IProviderMatcher = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * Providers match interface symbol.
 * it is a symbol id, you can register yourself MethodAccessor for this.
 */
exports.ProviderMatcherToken = new InjectToken_1.InjectToken('DI_IProviderMatcher');




});

unwrapExports(IProviderMatcher);
var IProviderMatcher_1 = IProviderMatcher.ProviderMatcherToken;

var MethodAutorun_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });





/**
 * Inject DrawType action.
 *
 * @export
 * @class SetPropAction
 * @extends {ActionComposite}
 */
class MethodAutorun extends ActionComposite_1.ActionComposite {
    constructor() {
        super(CoreActions_1.CoreActions.methodAutorun);
    }
    working(container, data) {
        if (data.raiseContainer && data.raiseContainer !== container) {
            return;
        }
        if (data.target && data.targetType) {
            if (factories.hasMethodMetadata(decorators.Autorun, data.targetType)) {
                let metas = factories.getMethodMetadata(decorators.Autorun, data.targetType);
                let lastmetas = [];
                let idx = utils.lang.keys(metas).length;
                utils.lang.forIn(metas, (mm, key) => {
                    if (mm && mm.length) {
                        let m = mm[0];
                        m.autorun = key;
                        idx++;
                        if (!utils.isNumber(m.order)) {
                            m.order = idx;
                        }
                        lastmetas.push(m);
                    }
                });
                lastmetas.sort((au1, au2) => {
                    return au1.order - au1.order;
                }).forEach(aut => {
                    container.syncInvoke(data.targetType, aut.autorun, data.target);
                });
            }
        }
    }
}
MethodAutorun.classAnnations = { "name": "MethodAutorun", "params": { "constructor": [], "working": ["container", "data"] } };
exports.MethodAutorun = MethodAutorun;




});

unwrapExports(MethodAutorun_1);
var MethodAutorun_2 = MethodAutorun_1.MethodAutorun;

var ActionFactory_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });


/**
 * action factory.
 *
 * @export
 * @class ActionFactory
 */
class ActionFactory {
    /**
     * create action by action type. type in 'CoreActions'
     *
     * @param {string} type
     * @returns {ActionComponent}
     * @memberof ActionFactory
     */
    create(type) {
        let action;
        switch (type) {
            case actions.CoreActions.bindParameterType:
                action = new actions.BindParameterTypeAction();
                break;
            case actions.CoreActions.bindPropertyType:
                action = new actions.BindPropertyTypeAction();
                break;
            case actions.CoreActions.injectProperty:
                action = new actions.InjectPropertyAction();
                break;
            case actions.CoreActions.bindProvider:
                action = new actions.BindProviderAction();
                break;
            case actions.CoreActions.bindParameterProviders:
                action = new actions.BindParameterProviderAction();
                break;
            case actions.CoreActions.componentInit:
                action = new actions.ComponentInitAction();
                break;
            case actions.CoreActions.componentBeforeInit:
                action = new actions.ComponentBeforeInitAction();
                break;
            case actions.CoreActions.componentAfterInit:
                action = new actions.ComponentAfterInitAction();
                break;
            case actions.CoreActions.cache:
                action = new actions.CacheAction();
                break;
            case actions.CoreActions.singletion:
                action = new actions.SingletionAction();
                break;
            case actions.CoreActions.autorun:
                action = new actions.AutorunAction();
                break;
            case actions.CoreActions.methodAutorun:
                action = new MethodAutorun_1.MethodAutorun();
                break;
            default:
                action = new actions.ActionComposite(type);
                break;
        }
        return action;
    }
}
ActionFactory.classAnnations = { "name": "ActionFactory", "params": { "create": ["type"] } };
exports.ActionFactory = ActionFactory;




});

unwrapExports(ActionFactory_1);
var ActionFactory_2 = ActionFactory_1.ActionFactory;

var DefaultLifeScope_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });






/**
 * default implement life scope.
 *
 * @export
 * @class DefaultLifeScope
 * @implements {LifeScope}
 */
class DefaultLifeScope {
    constructor(container) {
        this.container = container;
        this.decorators = [];
        this.buildAction();
    }
    addAction(action, ...nodepaths) {
        let parent = this.action;
        nodepaths.forEach(pathname => {
            parent = parent.find(act => act.name === pathname);
        });
        if (parent) {
            parent.add(action);
        }
        return this;
    }
    registerDecorator(decorator, ...actions$$2) {
        let type = this.getDecoratorType(decorator);
        return this.registerCustomDecorator(decorator, type, ...actions$$2);
    }
    registerCustomDecorator(decorator, type, ...actions$$2) {
        let types$$2 = this.toActionName(type);
        let name = decorator.toString();
        if (!this.decorators.some(d => d.name === name)) {
            this.decorators.push({
                name: name,
                types: types$$2,
                actions: actions$$2
            });
        }
        return this;
    }
    execute(data, ...names) {
        names = names.filter(n => !!n);
        let act = this.action;
        names.forEach(name => {
            act = act.find(itm => itm.name === name);
        });
        if (act) {
            act.execute(this.container, data);
        }
    }
    routeExecute(data, ...names) {
        this.execute(data, ...names);
        let container = this.container.parent;
        while (container) {
            container.getLifeScope().execute(utils.lang.assign({}, data), ...names);
            container = container.parent;
        }
    }
    getClassDecorators(match) {
        return this.getTypeDecorators(this.toActionName(factories.DecoratorType.Class), match);
    }
    getMethodDecorators(match) {
        return this.getTypeDecorators(this.toActionName(factories.DecoratorType.Method), match);
    }
    getPropertyDecorators(match) {
        return this.getTypeDecorators(this.toActionName(factories.DecoratorType.Property), match);
    }
    getParameterDecorators(match) {
        return this.getTypeDecorators(this.toActionName(factories.DecoratorType.Parameter), match);
    }
    getDecoratorType(decirator) {
        return decirator.decoratorType || factories.DecoratorType.All;
    }
    /**
     * is vaildate dependence type or not. dependence type must with class decorator.
     *
     * @template T
     * @param {Type<T>} target
     * @returns {boolean}
     * @memberof Container
     */
    isVaildDependence(target) {
        if (!target) {
            return false;
        }
        if (!utils.isClass(target)) {
            return false;
        }
        if (utils.isAbstractDecoratorClass(target)) {
            return false;
        }
        return this.getClassDecorators().some(act => factories.hasOwnClassMetadata(act.name, target));
    }
    getAtionByName(name) {
        return this.action.find(action => action.name === name);
    }
    getClassAction() {
        return this.getAtionByName(this.toActionName(factories.DecoratorType.Class));
    }
    getMethodAction() {
        return this.getAtionByName(this.toActionName(factories.DecoratorType.Method));
    }
    getPropertyAction() {
        return this.getAtionByName(this.toActionName(factories.DecoratorType.Property));
    }
    getParameterAction() {
        return this.getAtionByName(this.toActionName(factories.DecoratorType.Parameter));
    }
    /**
     * get constructor parameters metadata.
     *
     * @template T
     * @param {Type<T>} type
     * @returns {IParameter[]}
     * @memberof IContainer
     */
    getConstructorParameters(type) {
        return this.getParameters(type);
    }
    /**
     * get method params metadata.
     *
     * @template T
     * @param {Type<T>} type
     * @param {T} instance
     * @param {(string | symbol)} propertyKey
     * @returns {IParameter[]}
     * @memberof IContainer
     */
    getMethodParameters(type, instance, propertyKey) {
        return this.getParameters(type, instance, propertyKey);
    }
    /**
     * get paramerter names.
     *
     * @template T
     * @param {Type<T>} type
     * @param {string} propertyKey
     * @returns {string[]}
     * @memberof DefaultLifeScope
     */
    getParamerterNames(type, propertyKey) {
        let metadata = factories.getOwnParamerterNames(type);
        let paramNames = [];
        if (metadata && metadata.hasOwnProperty(propertyKey)) {
            paramNames = metadata[propertyKey];
        }
        if (!utils.isArray(paramNames)) {
            paramNames = [];
        }
        return paramNames;
    }
    isSingletonType(type) {
        if (factories.hasOwnClassMetadata(decorators.Singleton, type)) {
            return true;
        }
        return this.getClassDecorators().some(surm => {
            let metadatas = factories.getOwnTypeMetadata(surm.name, type) || [];
            if (utils.isArray(metadatas)) {
                return metadatas.some(m => m.singleton === true);
            }
            return false;
        });
    }
    getMethodMetadatas(type, propertyKey) {
        let metadatas = [];
        this.getMethodDecorators().forEach(dec => {
            let metas = factories.getOwnMethodMetadata(dec.name, type);
            if (metas.hasOwnProperty(propertyKey)) {
                metadatas = metadatas.concat(metas[propertyKey] || []);
            }
        });
        return metadatas;
    }
    filerDecorators(express) {
        return this.decorators.filter(express);
    }
    getParameters(type, instance, propertyKey) {
        propertyKey = propertyKey || 'constructor';
        let data = {
            target: instance,
            targetType: type,
            propertyKey: propertyKey
        };
        this.execute(data, actions.LifeState.onInit, actions.CoreActions.bindParameterType);
        let paramNames = this.getParamerterNames(type, propertyKey);
        if (data.execResult.length) {
            return data.execResult.map((typ, idx) => {
                return {
                    type: typ,
                    name: paramNames[idx]
                };
            });
        }
        else {
            return paramNames.map(name => {
                return {
                    name: name,
                    type: undefined
                };
            });
        }
    }
    getTypeDecorators(decType, match) {
        return this.filerDecorators(value => {
            let flag = (value.types || '').indexOf(decType) >= 0;
            if (flag && match) {
                flag = match(value);
            }
            return flag;
        });
    }
    buildAction() {
        let factory = new ActionFactory_1.ActionFactory();
        let action = factory.create('');
        action
            .add(factory.create(types.IocState.design)
            .add(factory.create(actions.CoreActions.bindProvider))
            .add(factory.create(actions.CoreActions.autorun)))
            .add(factory.create(types.IocState.runtime)
            .add(factory.create(actions.LifeState.beforeCreateArgs))
            .add(factory.create(actions.LifeState.beforeConstructor))
            .add(factory.create(actions.LifeState.afterConstructor))
            .add(factory.create(actions.LifeState.onInit)
            .add(factory.create(actions.CoreActions.componentBeforeInit))
            .add(factory.create(this.toActionName(factories.DecoratorType.Class)))
            .add(factory.create(this.toActionName(factories.DecoratorType.Method)))
            .add(factory.create(this.toActionName(factories.DecoratorType.Property))
            .add(factory.create(actions.CoreActions.bindPropertyType))
            .add(factory.create(actions.CoreActions.injectProperty)))
            .add(factory.create(this.toActionName(factories.DecoratorType.Parameter))
            .add(factory.create(actions.CoreActions.bindParameterType))
            .add(factory.create(actions.CoreActions.bindParameterProviders)))
            .add(factory.create(actions.CoreActions.componentInit)))
            .add(factory.create(actions.LifeState.AfterInit)
            .add(factory.create(actions.CoreActions.singletion))
            .add(factory.create(actions.CoreActions.componentAfterInit))
            .add(factory.create(actions.CoreActions.methodAutorun))))
            .add(factory.create(actions.CoreActions.cache));
        this.action = action;
    }
    toActionName(type) {
        let types$$2 = [];
        if (type & factories.DecoratorType.Class) {
            types$$2.push('ClassDecorator');
        }
        if (type & factories.DecoratorType.Method) {
            types$$2.push('MethodDecorator');
        }
        if (type & factories.DecoratorType.Property) {
            types$$2.push('PropertyDecorator');
        }
        if (type & factories.DecoratorType.Parameter) {
            types$$2.push('ParameterDecorator');
        }
        return types$$2.join(',');
    }
}
DefaultLifeScope.classAnnations = { "name": "DefaultLifeScope", "params": { "constructor": ["container"], "addAction": ["action", "nodepaths"], "registerDecorator": ["decorator", "actions"], "registerCustomDecorator": ["decorator", "type", "actions"], "execute": ["data", "names"], "routeExecute": ["data", "names"], "getClassDecorators": ["match"], "getMethodDecorators": ["match"], "getPropertyDecorators": ["match"], "getParameterDecorators": ["match"], "getDecoratorType": ["decirator"], "isVaildDependence": ["target"], "getAtionByName": ["name"], "getClassAction": [], "getMethodAction": [], "getPropertyAction": [], "getParameterAction": [], "getConstructorParameters": ["type"], "getMethodParameters": ["type", "instance", "propertyKey"], "getParamerterNames": ["type", "propertyKey"], "isSingletonType": ["type"], "getMethodMetadatas": ["type", "propertyKey"], "filerDecorators": ["express"], "getParameters": ["type", "instance", "propertyKey"], "getTypeDecorators": ["decType", "match"], "buildAction": [], "toActionName": ["type"] } };
exports.DefaultLifeScope = DefaultLifeScope;




});

unwrapExports(DefaultLifeScope_1);
var DefaultLifeScope_2 = DefaultLifeScope_1.DefaultLifeScope;

var ProviderMatcher_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });


/**
 * provider matcher. use to find custome providers in resolve.
 *
 * @export
 * @class ProviderMatcher
 * @implements {IProviderMatcher}
 */
class ProviderMatcher {
    constructor(container) {
        this.container = container;
    }
    toProviderMap(...providers$$1) {
        if (providers$$1.length === 1 && providers.isProviderMap(providers$$1[0])) {
            return providers$$1[0];
        }
        let map = this.container.resolve(providers.ProviderMapToken);
        providers$$1.forEach((p, index) => {
            if (utils.isUndefined(p) || utils.isNull(p)) {
                return;
            }
            if (providers.isProviderMap(p)) {
                map.copy(p);
            }
            else if (p instanceof providers.Provider) {
                if (p instanceof providers.ParamProvider) {
                    if (!p.type && utils.isNumber(p.index)) {
                        map.add(p.index, (...providers$$1) => p.resolve(this.container, ...providers$$1));
                    }
                    else {
                        map.add(p.type, (...providers$$1) => p.resolve(this.container, ...providers$$1));
                    }
                }
                else {
                    map.add(p.type, (...providers$$1) => p.resolve(this.container, ...providers$$1));
                }
            }
            else if (utils.isClass(p)) {
                if (!this.container.has(p)) {
                    this.container.register(p);
                }
                map.add(p, p);
            }
            else if (utils.isBaseObject(p)) {
                let pr = p;
                let isobjMap = false;
                if (utils.isToken(pr.provide)) {
                    if (utils.isArray(pr.deps) && pr.deps.length) {
                        pr.deps.forEach(d => {
                            if (utils.isClass(d) && !this.container.has(d)) {
                                this.container.register(d);
                            }
                        });
                    }
                    if (!utils.isUndefined(pr.useValue)) {
                        map.add(pr.provide, () => pr.useValue);
                    }
                    else if (utils.isClass(pr.useClass)) {
                        if (!this.container.has(pr.useClass)) {
                            this.container.register(pr.useClass);
                        }
                        map.add(pr.provide, pr.useClass);
                    }
                    else if (utils.isFunction(pr.useFactory)) {
                        map.add(pr.provide, () => {
                            let args = [];
                            if (utils.isArray(pr.deps) && pr.deps.length) {
                                args = pr.deps.map(d => {
                                    if (utils.isClass(d)) {
                                        return this.container.get(d);
                                    }
                                    else {
                                        return d;
                                    }
                                });
                            }
                            return pr.useFactory.apply(pr, args);
                        });
                    }
                    else if (utils.isToken(pr.useExisting)) {
                        if (this.container.has(pr.useExisting)) {
                            map.add(pr.provide, () => this.container.resolve(pr.useExisting));
                        }
                        else {
                            console.log('has not register:', pr.useExisting);
                        }
                    }
                    else {
                        isobjMap = true;
                    }
                }
                else {
                    isobjMap = true;
                }
                if (isobjMap) {
                    utils.lang.forIn(p, (val, name) => {
                        if (!utils.isUndefined(val)) {
                            if (utils.isClass(val)) {
                                map.add(name, val);
                            }
                            else if (utils.isFunction(val) || utils.isString(val)) {
                                map.add(name, () => val);
                            }
                            else {
                                map.add(name, val);
                            }
                        }
                    });
                }
            }
            else if (utils.isFunction(p)) {
                map.add(name, () => p);
            }
            else {
                map.add(index, p);
            }
        });
        return map;
    }
    matchProviders(params, ...providers$$1) {
        return this.match(params, this.toProviderMap(...providers$$1));
    }
    match(params, providers$$1) {
        let map = this.container.resolve(providers.ProviderMapToken);
        if (!params.length) {
            return map;
        }
        params.forEach((param, index) => {
            if (!param.name) {
                return;
            }
            if (providers$$1.has(param.name)) {
                map.add(param.name, providers$$1.get(param.name));
            }
            else if (utils.isToken(param.type)) {
                if (providers$$1.has(param.type)) {
                    map.add(param.name, providers$$1.get(param.type));
                }
                else if (this.container.has(param.type)) {
                    map.add(param.name, param.type);
                }
            }
            else if (providers$$1.has(index)) {
                map.add(param.name, providers$$1.get(index));
            }
        });
        return map;
    }
}
ProviderMatcher.classAnnations = { "name": "ProviderMatcher", "params": { "constructor": ["container"], "toProviderMap": ["providers"], "matchProviders": ["params", "providers"], "match": ["params", "providers"] } };
exports.ProviderMatcher = ProviderMatcher;




});

unwrapExports(ProviderMatcher_1);
var ProviderMatcher_2 = ProviderMatcher_1.ProviderMatcher;

var MethodAccessor_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });




/**
 * method accessor
 *
 * @export
 * @class MethodAccessor
 * @implements {IMethodAccessor}
 */
class MethodAccessor {
    constructor(container) {
        this.container = container;
    }
    getMatcher() {
        return this.container.get(IProviderMatcher.ProviderMatcherToken);
    }
    invoke(token, propertyKey, target, ...providers) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (!target) {
                target = this.container.resolve(token, ...providers);
            }
            let targetClass = this.container.getTokenImpl(token);
            if (!targetClass) {
                throw Error(token.toString() + ' is not implements by any class.');
            }
            if (target && utils.isFunction(target[propertyKey])) {
                let actionData = {
                    target: target,
                    targetType: targetClass,
                    propertyKey: propertyKey,
                };
                let lifeScope = this.container.getLifeScope();
                lifeScope.execute(actionData, actions.LifeState.onInit, actions.CoreActions.bindParameterProviders);
                providers = providers.concat(actionData.execResult);
                let parameters = lifeScope.getMethodParameters(targetClass, target, propertyKey);
                let paramInstances = yield this.createParams(parameters, ...providers);
                return target[propertyKey](...paramInstances);
            }
            else {
                throw new Error(`type: ${targetClass} has no method ${propertyKey.toString()}.`);
            }
        });
    }
    syncInvoke(token, propertyKey, target, ...providers) {
        if (!target) {
            target = this.container.resolve(token, ...providers);
        }
        let targetClass = this.container.getTokenImpl(token);
        if (!targetClass) {
            throw Error(token.toString() + ' is not implements by any class.');
        }
        if (target && utils.isFunction(target[propertyKey])) {
            let actionData = {
                target: target,
                targetType: targetClass,
                propertyKey: propertyKey,
            };
            let lifeScope = this.container.getLifeScope();
            lifeScope.execute(actionData, actions.LifeState.onInit, actions.CoreActions.bindParameterProviders);
            providers = providers.concat(actionData.execResult);
            let parameters = lifeScope.getMethodParameters(targetClass, target, propertyKey);
            let paramInstances = this.createSyncParams(parameters, ...providers);
            return target[propertyKey](...paramInstances);
        }
        else {
            throw new Error(`type: ${targetClass} has no method ${propertyKey.toString()}.`);
        }
    }
    createSyncParams(params, ...providers) {
        let providerMap = this.getMatcher().matchProviders(params, ...providers);
        return params.map((param, index) => {
            if (param.name && providerMap.has(param.name)) {
                return providerMap.resolve(param.name);
            }
            else if (utils.isToken(param.type)) {
                return this.container.resolve(param.type, ...providers);
            }
            else {
                return undefined;
            }
        });
    }
    createParams(params, ...providers) {
        let providerMap = this.getMatcher().matchProviders(params, ...providers);
        return Promise.all(params.map((param, index) => {
            if (param.name && providerMap.has(param.name)) {
                return providerMap.resolve(param.name);
            }
            else if (utils.isToken(param.type)) {
                return this.container.resolve(param.type, ...providers);
            }
            else {
                return undefined;
            }
        }));
    }
}
MethodAccessor.classAnnations = { "name": "MethodAccessor", "params": { "constructor": ["container"], "getMatcher": [], "invoke": ["token", "propertyKey", "target", "providers"], "syncInvoke": ["token", "propertyKey", "target", "providers"], "createSyncParams": ["params", "providers"], "createParams": ["params", "providers"] } };
exports.MethodAccessor = MethodAccessor;




});

unwrapExports(MethodAccessor_1);
var MethodAccessor_2 = MethodAccessor_1.MethodAccessor;

var CacheManager_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * cache manager.
 *
 * @export
 * @class CacheManager
 * @implements {ICacheManager}
 */
class CacheManager {
    constructor(container) {
        this.container = container;
        this.cacheTokens = new utils.MapSet();
    }
    isChecking() {
        return !!this.timeout;
    }
    hasCache(targetType) {
        return this.cacheTokens.has(targetType);
    }
    cache(targetType, target, expires) {
        let cache;
        if (this.hasCache(targetType)) {
            cache = this.cacheTokens.get(targetType);
            cache.expires = Date.now() + expires;
        }
        else {
            cache = {
                target: target,
                expires: Date.now() + expires
            };
        }
        this.cacheTokens.set(targetType, cache);
        if (!this.isChecking()) {
            this.checkExpires();
        }
    }
    get(targetType, expires) {
        let result = null;
        if (!this.cacheTokens.has(targetType)) {
            return null;
        }
        let cache = this.cacheTokens.get(targetType);
        if (cache.expires <= Date.now()) {
            result = cache.target;
            if (utils.isNumber(expires) && expires > 0) {
                cache.expires = Date.now() + expires;
                this.cacheTokens.set(targetType, cache);
            }
        }
        else {
            this.destroy(targetType, cache.target);
        }
        return result;
    }
    checkExpires() {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = 0;
        }
        if (this.cacheTokens.size > 0) {
            let timeoutCaches = [];
            this.cacheTokens.forEach((cache, targetType) => {
                if (cache.expires >= Date.now()) {
                    timeoutCaches.push(targetType);
                }
            });
            if (timeoutCaches.length) {
                timeoutCaches.forEach(targetType => {
                    this.destroy(targetType, this.cacheTokens.get(targetType).target);
                });
            }
            this.timeout = setTimeout(() => {
                this.checkExpires();
            }, 60000);
        }
    }
    destroy(targetType, target) {
        if (!this.hasCache(targetType)) {
            return;
        }
        if (!target) {
            target = this.cacheTokens.get(targetType).target;
        }
        try {
            let component = target;
            if (utils.isFunction(component.onDestroy)) {
                this.container.syncInvoke(targetType, 'onDestroy', target);
            }
            this.cacheTokens.delete(targetType);
        }
        catch (err) {
            console.error && console.error(err);
        }
    }
}
CacheManager.classAnnations = { "name": "CacheManager", "params": { "constructor": ["container"], "isChecking": [], "hasCache": ["targetType"], "cache": ["targetType", "target", "expires"], "get": ["targetType", "expires"], "checkExpires": [], "destroy": ["targetType", "target"] } };
exports.CacheManager = CacheManager;




});

unwrapExports(CacheManager_1);
var CacheManager_2 = CacheManager_1.CacheManager;

var core = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

tslib_1.__exportStar(actions, exports);
tslib_1.__exportStar(decorators, exports);
tslib_1.__exportStar(factories, exports);
tslib_1.__exportStar(providers, exports);
tslib_1.__exportStar(IRecognizer, exports);
tslib_1.__exportStar(IProviderMatcher, exports);
tslib_1.__exportStar(ActionFactory_1, exports);
tslib_1.__exportStar(DefaultLifeScope_1, exports);
tslib_1.__exportStar(ProviderMatcher_1, exports);
tslib_1.__exportStar(MethodAccessor_1, exports);
tslib_1.__exportStar(CacheManager_1, exports);




});

unwrapExports(core);

var LifeScope = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * life scope interface symbol.
 * it is a symbol id, you can register yourself MethodAccessor for this.
 */
exports.LifeScopeToken = new InjectToken_1.InjectToken('DI_LifeScope');




});

unwrapExports(LifeScope);
var LifeScope_1 = LifeScope.LifeScopeToken;

var IContainerBuilder = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * ContainerBuilder interface token.
 * it is a token id, you can register yourself IContainerBuilder for this.
 */
exports.ContainerBuilderToken = new InjectToken_1.InjectToken('DI_IContainerBuilder');




});

unwrapExports(IContainerBuilder);
var IContainerBuilder_1 = IContainerBuilder.ContainerBuilderToken;

var ResolverChain_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });



exports.ResolverChainToken = new InjectToken_1.InjectToken('di_ResolverChain');
class ResolverChain {
    constructor(container) {
        this.container = container;
        this.resolvers = [];
    }
    next(resolver) {
        if (!this.hasResolver(resolver)) {
            this.resolvers.push(resolver);
        }
    }
    toArray() {
        return [this.container].concat(this.resolvers);
    }
    hasResolver(resolver) {
        if (resolver instanceof Container_1.Container) {
            return this.resolvers.indexOf(resolver) >= 0;
        }
        else {
            return this.resolvers.some(a => {
                if (a instanceof Container_1.Container) {
                    return false;
                }
                else {
                    if (!a.type || !resolver.type) {
                        return false;
                    }
                    return a.type === resolver.type;
                }
            });
        }
    }
    hasToken(resolver, token) {
        if (!token) {
            return false;
        }
        if (resolver instanceof Container_1.Container) {
            return resolver.hasRegister(token);
        }
        else {
            if (resolver.type === token || this.container.getTokenKey(resolver.token) === token) {
                return true;
            }
            let exps = resolver.exports || [];
            return exps.concat(resolver.providers || []).some(t => {
                if (this.container.getTokenKey(t) === token) {
                    return true;
                }
                else if (!utils.isClass(token)) {
                    if (resolver.container.hasRegister(token)) {
                        let type = resolver.container.getTokenImpl(token);
                        return exps.indexOf(type) >= 0;
                    }
                }
                return false;
            });
        }
    }
    resolve(token, ...providers) {
        let resolver = this.toArray().find(r => this.hasToken(r, token));
        if (!resolver && !this.container.parent) {
            console.log('have not register', token);
            return null;
        }
        if (resolver) {
            if (resolver instanceof Container_1.Container) {
                return resolver.resolveValue(token, ...providers);
            }
            else {
                return resolver.container.resolveValue(token, ...providers);
            }
        }
        else {
            return this.container.parent.resolve(token, ...providers);
        }
    }
    unregister(token) {
        let resolver = this.toArray().find(r => this.hasToken(r, token));
        if (resolver) {
            if (resolver instanceof Container_1.Container) {
                resolver.unregister(token, false);
            }
            else {
                let idx = this.resolvers.indexOf(resolver);
                if (idx >= 0 && idx < this.resolvers.length) {
                    this.resolvers.splice(idx, 1);
                }
            }
        }
        else if (this.container.parent) {
            this.container.parent.unregister(token);
        }
    }
    getTokenImpl(token) {
        let resolver = this.toArray().find(r => this.hasToken(r, token));
        if (resolver) {
            if (resolver instanceof Container_1.Container) {
                return resolver.getTokenImpl(token, false);
            }
            else {
                return resolver.container.getTokenImpl(token, false);
            }
        }
        else if (this.container.parent) {
            return this.container.parent.getTokenImpl(token);
        }
        else {
            return null;
        }
    }
    hasRegister(token) {
        if (this.container.hasRegister(token)) {
            return true;
        }
        if (this.resolvers.length) {
            return this.resolvers.some(r => this.hasToken(r, token));
        }
        return false;
    }
    has(token) {
        if (this.hasRegister(token)) {
            return true;
        }
        if (this.container.parent) {
            return this.container.parent.has(token);
        }
        return false;
    }
}
ResolverChain.classAnnations = { "name": "ResolverChain", "params": { "constructor": ["container"], "next": ["resolver"], "toArray": [], "hasResolver": ["resolver"], "hasToken": ["resolver", "token"], "resolve": ["token", "providers"], "unregister": ["token"], "getTokenImpl": ["token"], "hasRegister": ["token"], "has": ["token"] } };
exports.ResolverChain = ResolverChain;




});

unwrapExports(ResolverChain_1);
var ResolverChain_2 = ResolverChain_1.ResolverChainToken;
var ResolverChain_3 = ResolverChain_1.ResolverChain;

var resolves = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

tslib_1.__exportStar(ResolverChain_1, exports);




});

unwrapExports(resolves);

var registerCores_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });









/**
 * register core for container.
 *
 * @export
 * @param {IContainer} container
 */
function registerCores(container) {
    container.registerSingleton(LifeScope.LifeScopeToken, () => new DefaultLifeScope_1.DefaultLifeScope(container));
    container.registerSingleton(ICacheManager.CacheManagerToken, () => new core.CacheManager(container));
    container.registerSingleton(resolves.ResolverChainToken, () => new resolves.ResolverChain(container));
    container.register(core.ProviderMapToken, () => new core.ProviderMap(container));
    container.bindProvider(core.ProviderMap, core.ProviderMapToken);
    container.registerSingleton(core.ProviderMatcherToken, () => new core.ProviderMatcher(container));
    container.registerSingleton(IMethodAccessor.MethodAccessorToken, () => new MethodAccessor_1.MethodAccessor(container));
    let lifeScope = container.get(LifeScope.LifeScopeToken);
    lifeScope.registerDecorator(decorators.Injectable, actions.CoreActions.bindProvider, actions.CoreActions.cache);
    lifeScope.registerDecorator(decorators.Component, actions.CoreActions.bindProvider, actions.CoreActions.cache, actions.CoreActions.componentBeforeInit, actions.CoreActions.componentInit, actions.CoreActions.componentAfterInit);
    lifeScope.registerDecorator(decorators.Singleton, actions.CoreActions.bindProvider);
    lifeScope.registerDecorator(decorators.Abstract, actions.CoreActions.bindProvider, actions.CoreActions.cache);
    lifeScope.registerDecorator(decorators.AutoWired, actions.CoreActions.bindParameterType, actions.CoreActions.bindPropertyType);
    lifeScope.registerDecorator(decorators.Inject, actions.CoreActions.bindParameterType, actions.CoreActions.bindPropertyType);
    lifeScope.registerDecorator(decorators.Param, actions.CoreActions.bindParameterType, actions.CoreActions.bindPropertyType);
    lifeScope.registerDecorator(decorators.Method, actions.CoreActions.bindParameterProviders);
    lifeScope.registerDecorator(decorators.Autorun, actions.CoreActions.autorun, actions.CoreActions.methodAutorun);
    lifeScope.registerDecorator(decorators.IocExt, actions.CoreActions.autorun, actions.CoreActions.componentBeforeInit, actions.CoreActions.componentInit, actions.CoreActions.componentAfterInit);
    container.register(Date, () => new Date());
    container.register(String, () => '');
    container.register(Number, () => Number.NaN);
    container.register(Boolean, () => undefined);
}
exports.registerCores = registerCores;




});

unwrapExports(registerCores_1);
var registerCores_2 = registerCores_1.registerCores;

var Container_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });












/**
 * Container
 *
 * @export
 * @class Container
 * @implements {IContainer}
 */
class Container {
    constructor() {
        this.init();
    }
    getRoot() {
        let root = this;
        while (root.parent) {
            root = root.parent;
        }
        return root;
    }
    getBuilder() {
        return this.resolveValue(IContainerBuilder.ContainerBuilderToken);
    }
    /**
     * Retrieves an instance from the container based on the provided token.
     *
     * @template T
     * @param {Token<T>} token
     * @param {string} [alias]
     * @param {...Providers[]} providers
     * @returns {T}
     * @memberof Container
     */
    get(token, alias, ...providers) {
        return this.resolve(alias ? this.getTokenKey(token, alias) : token, ...providers);
    }
    /**
    * resolve token value in this container only.
    *
    * @template T
    * @param {Token<T>} token
    * @param {...Providers[]} providers
    * @returns {T}
    * @memberof Container
    */
    get resolvers() {
        return this.resolveValue(resolves.ResolverChainToken);
    }
    /**
     * resolve type instance with token and param provider.
     *
     * @template T
     * @param {Token<T>} token
     * @param {T} [notFoundValue]
     * @param {...Providers[]} providers
     * @memberof Container
     */
    resolve(token, ...providers) {
        let key = this.getTokenKey(token);
        return this.resolvers.resolve(key, ...providers);
    }
    /**
     * resolve token value in this container only.
     *
     * @template T
     * @param {Token<T>} token
     * @param {...Providers[]} providers
     * @returns {T}
     * @memberof IContainer
     */
    resolveValue(token, ...providers) {
        let key = this.getTokenKey(token);
        if (!this.hasRegister(key)) {
            return null;
        }
        let factory = this.factories.get(key);
        return factory(...providers);
    }
    /**
     * clear cache.
     *
     * @param {Type<any>} targetType
     * @memberof IContainer
     */
    clearCache(targetType) {
        this.resolveValue(ICacheManager.CacheManagerToken).destroy(targetType);
    }
    /**
     * get token.
     *
     * @template T
     * @param {Token<T>} token
     * @param {string} [alias]
     * @returns {Token<T>}
     * @memberof Container
     */
    getToken(token, alias) {
        if (alias) {
            return new Registration_1.Registration(token, alias);
        }
        return token;
    }
    /**
     * get tocken key.
     *
     * @template T
     * @param {Token<T>} token
     * @param {string} [alias]
     * @returns {SymbolType<T>}
     * @memberof Container
     */
    getTokenKey(token, alias) {
        if (alias) {
            return new Registration_1.Registration(token, alias).toString();
        }
        else if (token instanceof Registration_1.Registration) {
            return token.toString();
        }
        return token;
    }
    /**
     * register type.
     * @abstract
     * @template T
     * @param {Token<T>} token
     * @param {T} [value]
     * @returns {this}
     * @memberOf Container
     */
    register(token, value) {
        this.registerFactory(token, value);
        return this;
    }
    /**
     * has register the token or not.
     *
     * @template T
     * @param {Token<T>} token
     * @param {string} [alias]
     * @returns {boolean}
     * @memberof Container
     */
    has(token, alias) {
        let key = this.getTokenKey(token, alias);
        return this.resolvers.has(key);
    }
    /**
     * has register type.
     *
     * @template T
     * @param {SymbolType<T>} key
     * @returns
     * @memberof Container
     */
    hasRegister(key) {
        return this.factories.has(key);
    }
    /**
     * unregister the token
     *
     * @template T
     * @param {Token<T>} token
     * @returns {this}
     * @memberof Container
     */
    unregister(token, inchain) {
        let key = this.getTokenKey(token);
        if (inchain === false) {
            if (this.hasRegister(key)) {
                this.factories.delete(key);
                if (this.provideTypes.has(key)) {
                    this.provideTypes.delete(key);
                }
                if (utils.isClass(key)) {
                    this.clearCache(key);
                }
            }
        }
        else {
            this.resolvers.unregister(key);
        }
        return this;
    }
    /**
     * register stingleton type.
     * @abstract
     * @template T
     * @param {Token<T>} token
     * @param {Factory<T>} [value]
     * @returns {this}
     * @memberOf Container
     */
    registerSingleton(token, value) {
        this.registerFactory(token, value, true);
        return this;
    }
    /**
     * register value.
     *
     * @template T
     * @param {Token<T>} token
     * @param {T} value
     * @returns {this}
     * @memberof Container
     */
    registerValue(token, value) {
        let key = this.getTokenKey(token);
        this.singleton.set(key, value);
        if (!this.factories.has(key)) {
            this.factories.set(key, () => {
                return this.singleton.get(key);
            });
        }
        return this;
    }
    /**
     * bind provider.
     *
     * @template T
     * @param {Token<T>} provide
     * @param {Token<T>} provider
     * @returns {this}
     * @memberof Container
     */
    bindProvider(provide, provider) {
        let provideKey = this.getTokenKey(provide);
        let factory;
        if (utils.isToken(provider)) {
            factory = (...providers) => {
                return this.resolve(provider, ...providers);
            };
        }
        else {
            if (utils.isFunction(provider)) {
                factory = (...providers) => {
                    return provider(this, ...providers);
                };
            }
            else {
                factory = () => {
                    return provider;
                };
            }
        }
        if (utils.isClass(provider)) {
            if (!this.has(provider)) {
                this.register(provider);
            }
            this.provideTypes.set(provideKey, provider);
        }
        else if (utils.isToken(provider)) {
            let token = provider;
            while (this.provideTypes.has(token) && !utils.isClass(token)) {
                token = this.provideTypes.get(token);
                if (utils.isClass(token)) {
                    this.provideTypes.set(provideKey, token);
                    break;
                }
            }
        }
        this.factories.set(provideKey, factory);
        return this;
    }
    /**
     * get token implements class type.
     *
     * @template T
     * @param {Token<T>} token
     * @param {boolean} [inchain]
     * @returns {Type<T>}
     * @memberof Container
     */
    getTokenImpl(token, inchain) {
        let tokenKey = this.getTokenKey(token);
        if (inchain === false) {
            if (utils.isClass(token)) {
                return token;
            }
            if (this.provideTypes.has(tokenKey)) {
                return this.provideTypes.get(tokenKey);
            }
            return null;
        }
        else {
            return this.resolvers.getTokenImpl(tokenKey);
        }
    }
    /**
     * get token implement class and base classes.
     *
     * @param {Token<any>} token
     * @returns {Token<any>[]}
     * @memberof Container
     */
    getTokenExtendsChain(token) {
        if (utils.isClass(token)) {
            return this.getBaseClasses(token);
        }
        else {
            return this.getBaseClasses(this.getTokenImpl(token)).concat([token]);
        }
    }
    getBaseClasses(target) {
        let types$$1 = [];
        while (utils.isClass(target) && target !== Object) {
            types$$1.push(target);
            target = utils.lang.getParentClass(target);
        }
        return types$$1;
    }
    /**
    * get life scope of container.
    *
    * @returns {LifeScope}
    * @memberof IContainer
    */
    getLifeScope() {
        return this.get(LifeScope.LifeScopeToken);
    }
    /**
     * use modules.
     *
     * @param {...Modules[]} modules
     * @returns {this}
     * @memberof Container
     */
    use(...modules) {
        this.getBuilder().syncLoadModule(this, ...modules);
        return this;
    }
    /**
     * async use modules.
     *
     * @param {...LoadType[]} modules load modules.
     * @returns {Promise<Type<any>[]>}  types loaded.
     * @memberof IContainer
     */
    loadModule(...modules) {
        return this.getBuilder().loadModule(this, ...modules);
    }
    /**
     * invoke method async.
     *
     * @template T
     * @param {Token<any>} token
     * @param {string} propertyKey
     * @param {*} [instance]
     * @param {...Providers[]} providers
     * @returns {Promise<T>}
     * @memberof Container
     */
    invoke(token, propertyKey, instance, ...providers) {
        return this.resolveValue(IMethodAccessor.MethodAccessorToken).invoke(token, propertyKey, instance, ...providers);
    }
    /**
     * invoke method.
     *
     * @template T
     * @param {Token<any>} token
     * @param {string} propertyKey
     * @param {*} [instance]
     * @param {...Providers[]} providers
     * @returns {T}
     * @memberof Container
     */
    syncInvoke(token, propertyKey, instance, ...providers) {
        return this.resolveValue(IMethodAccessor.MethodAccessorToken).syncInvoke(token, propertyKey, instance, ...providers);
    }
    createSyncParams(params, ...providers) {
        return this.resolveValue(IMethodAccessor.MethodAccessorToken).createSyncParams(params, ...providers);
    }
    createParams(params, ...providers) {
        return this.resolveValue(IMethodAccessor.MethodAccessorToken).createParams(params, ...providers);
    }
    cacheDecorator(map, action) {
        if (!map.has(action.name)) {
            map.set(action.name, action);
        }
    }
    init() {
        this.factories = new utils.MapSet();
        this.singleton = new utils.MapSet();
        this.provideTypes = new utils.MapSet();
        this.bindProvider(IContainer.ContainerToken, () => this);
        registerCores_1.registerCores(this);
    }
    registerFactory(token, value, singleton) {
        let key = this.getTokenKey(token);
        if (this.factories.has(key)) {
            return;
        }
        let classFactory;
        if (!utils.isUndefined(value)) {
            if (utils.isFunction(value)) {
                if (utils.isClass(value)) {
                    this.bindTypeFactory(key, value, singleton);
                }
                else {
                    classFactory = this.createCustomFactory(key, value, singleton);
                }
            }
            else if (singleton && value !== undefined) {
                classFactory = this.createCustomFactory(key, () => value, singleton);
            }
        }
        else if (!utils.isString(token) && !utils.isSymbol(token)) {
            let ClassT = (token instanceof Registration_1.Registration) ? token.getClass() : token;
            if (utils.isClass(ClassT)) {
                this.bindTypeFactory(key, ClassT, singleton);
            }
        }
        if (classFactory) {
            this.factories.set(key, classFactory);
        }
    }
    createCustomFactory(key, factory, singleton) {
        return singleton ?
            (...providers) => {
                if (this.singleton.has(key)) {
                    return this.singleton.get(key);
                }
                let instance = factory(this, ...providers);
                this.singleton.set(key, instance);
                return instance;
            }
            : (...providers) => factory(this, ...providers);
    }
    bindTypeFactory(key, ClassT, singleton) {
        if (!Reflect.isExtensible(ClassT)) {
            return;
        }
        let lifeScope = this.getLifeScope();
        let parameters = lifeScope.getConstructorParameters(ClassT);
        if (!singleton) {
            singleton = lifeScope.isSingletonType(ClassT);
        }
        let factory = (...providers) => {
            if (singleton && this.singleton.has(key)) {
                return this.singleton.get(key);
            }
            if (providers.length < 1) {
                let lifecycleData = {
                    tokenKey: key,
                    targetType: ClassT,
                    // raiseContainer: this,
                    singleton: singleton
                };
                lifeScope.execute(lifecycleData, core.CoreActions.cache);
                if (lifecycleData.execResult && lifecycleData.execResult instanceof ClassT) {
                    return lifecycleData.execResult;
                }
            }
            let providerMap = this.get(core.ProviderMatcherToken).toProviderMap(...providers);
            lifeScope.execute({
                tokenKey: key,
                targetType: ClassT,
                raiseContainer: this,
                params: parameters,
                providers: providers,
                providerMap: providerMap,
                singleton: singleton
            }, types.IocState.runtime, core.LifeState.beforeCreateArgs);
            let args = this.createSyncParams(parameters, providerMap);
            lifeScope.routeExecute({
                tokenKey: key,
                targetType: ClassT,
                raiseContainer: this,
                args: args,
                params: parameters,
                providers: providers,
                providerMap: providerMap,
                singleton: singleton
            }, types.IocState.runtime, core.LifeState.beforeConstructor);
            let instance = new ClassT(...args);
            lifeScope.routeExecute({
                tokenKey: key,
                target: instance,
                targetType: ClassT,
                raiseContainer: this,
                args: args,
                params: parameters,
                providers: providers,
                providerMap: providerMap,
                singleton: singleton
            }, types.IocState.runtime, core.LifeState.afterConstructor);
            lifeScope.execute({
                tokenKey: key,
                target: instance,
                targetType: ClassT,
                raiseContainer: this,
                args: args,
                params: parameters,
                providers: providers,
                providerMap: providerMap,
                singleton: singleton
            }, types.IocState.runtime, core.LifeState.onInit);
            lifeScope.routeExecute({
                tokenKey: key,
                target: instance,
                targetType: ClassT,
                raiseContainer: this,
                args: args,
                params: parameters,
                providers: providers,
                providerMap: providerMap,
                singleton: singleton
            }, types.IocState.runtime, core.LifeState.AfterInit);
            lifeScope.execute({
                tokenKey: key,
                target: instance,
                targetType: ClassT,
                raiseContainer: this
            }, core.CoreActions.cache);
            return instance;
        };
        this.factories.set(key, factory);
        lifeScope.routeExecute({
            tokenKey: key,
            targetType: ClassT,
            raiseContainer: this
        }, types.IocState.design);
    }
}
Container.classAnnations = { "name": "Container", "params": { "constructor": [], "getRoot": [], "getBuilder": [], "get": ["token", "alias", "providers"], "resolve": ["token", "providers"], "resolveValue": ["token", "providers"], "clearCache": ["targetType"], "getToken": ["token", "alias"], "getTokenKey": ["token", "alias"], "register": ["token", "value"], "has": ["token", "alias"], "hasRegister": ["key"], "unregister": ["token", "inchain"], "registerSingleton": ["token", "value"], "registerValue": ["token", "value"], "bindProvider": ["provide", "provider"], "getTokenImpl": ["token", "inchain"], "getTokenExtendsChain": ["token"], "getBaseClasses": ["target"], "getLifeScope": [], "use": ["modules"], "loadModule": ["modules"], "invoke": ["token", "propertyKey", "instance", "providers"], "syncInvoke": ["token", "propertyKey", "instance", "providers"], "createSyncParams": ["params", "providers"], "createParams": ["params", "providers"], "cacheDecorator": ["map", "action"], "init": [], "registerFactory": ["token", "value", "singleton"], "createCustomFactory": ["key", "factory", "singleton"], "bindTypeFactory": ["key", "ClassT", "singleton"] } };
exports.Container = Container;




});

unwrapExports(Container_1);
var Container_2 = Container_1.Container;

var IModuleLoader = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * module loader token.
 */
exports.ModuleLoaderToken = new InjectToken_1.InjectToken('DI_ModuleLoader');




});

unwrapExports(IModuleLoader);
var IModuleLoader_1 = IModuleLoader.ModuleLoaderToken;

var DefaultModuleLoader_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });


/**
 * default module loader.
 *
 * @export
 * @class DefaultModuleLoader
 * @implements {IModuleLoader}
 */
class DefaultModuleLoader {
    constructor() {
    }
    getLoader() {
        if (!this._loader) {
            this._loader = this.createLoader();
        }
        return this._loader;
    }
    /**
     * load module.
     *
     * @param {...LoadType[]} modules
     * @returns {Promise<Modules[]>}
     * @memberof DefaultModuleLoader
     */
    load(modules) {
        if (modules.length) {
            return Promise.all(modules.map(mdty => {
                if (utils.isString(mdty)) {
                    return this.isFile(mdty) ? this.loadFile(mdty) : this.loadModule(mdty);
                }
                else if (utils.isObject(mdty) && (mdty['modules'] || mdty['files'])) {
                    return this.loadPathModule(mdty);
                }
                else {
                    return mdty ? [mdty] : [];
                }
            }))
                .then(allms => {
                let rmodules = [];
                allms.forEach(ms => {
                    rmodules = rmodules.concat(ms);
                });
                return rmodules;
            });
        }
        else {
            return Promise.resolve([]);
        }
    }
    /**
     * load types from module.
     *
     * @param {...LoadType[]} modules
     * @returns {Promise<Type<any>[]>}
     * @memberof IContainerBuilder
     */
    loadTypes(modules) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let mdls = yield this.load(modules);
            return this.getTypes(mdls);
        });
    }
    /**
     * get all class type in modules.
     *
     * @param {Modules[]} modules
     * @param {...Express<Type<any>, boolean>[]} filters
     * @returns {Type<any>[]}
     * @memberof DefaultModuleLoader
     */
    getTypes(modules) {
        let regModules = [];
        modules.forEach(m => {
            let types = this.getContentTypes(m);
            regModules.push(types);
        });
        return regModules;
    }
    loadFile(files, basePath) {
        let loader = this.getLoader();
        let fRes;
        if (utils.isArray(files)) {
            fRes = Promise.all(files.map(f => loader(f)))
                .then(allms => {
                let rms = [];
                allms.forEach(ms => {
                    rms = rms.concat(ms);
                });
                return rms;
            });
        }
        else {
            fRes = loader(files);
        }
        return fRes.then(ms => ms.filter(it => !!it));
    }
    isFile(str) {
        return str && /\/((\w|%|\.))+\.\w+$/.test(str.replace(/\\\\/gi, '/'));
    }
    loadModule(moduleName) {
        let loader = this.getLoader();
        return loader(moduleName).then(ms => ms.filter(it => !!it));
    }
    loadPathModule(pmd) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let modules = [];
            if (pmd.files) {
                yield this.loadFile(pmd.files, pmd.basePath)
                    .then(allmoduls => {
                    allmoduls.forEach(ms => {
                        modules = modules.concat(ms);
                    });
                    return modules;
                });
            }
            if (pmd.modules) {
                yield Promise.all(pmd.modules.map(nmd => {
                    return utils.isString(nmd) ? this.loadModule(nmd) : nmd;
                })).then(ms => {
                    modules = modules.concat(ms);
                    return modules;
                });
            }
            return modules;
        });
    }
    createLoader() {
        if (typeof commonjsRequire !== 'undefined') {
            return (modulepath) => {
                return new Promise((resolve, reject) => {
                    commonjsRequire([modulepath], (mud) => {
                        resolve(mud);
                    }, err => {
                        reject(err);
                    });
                });
            };
        }
        else {
            throw new Error('has not module loader');
        }
    }
    getContentTypes(regModule) {
        let regModules = [];
        if (utils.isClass(regModule)) {
            regModules.push(regModule);
        }
        else {
            let rmodules = regModule['exports'] ? regModule['exports'] : regModule;
            for (let p in rmodules) {
                let type = rmodules[p];
                if (utils.isClass(type)) {
                    regModules.push(type);
                }
            }
        }
        return regModules;
    }
}
DefaultModuleLoader.classAnnations = { "name": "DefaultModuleLoader", "params": { "constructor": [], "getLoader": [], "load": ["modules"], "loadTypes": ["modules"], "getTypes": ["modules"], "loadFile": ["files", "basePath"], "isFile": ["str"], "loadModule": ["moduleName"], "loadPathModule": ["pmd"], "createLoader": [], "getContentTypes": ["regModule"] } };
exports.DefaultModuleLoader = DefaultModuleLoader;




});

unwrapExports(DefaultModuleLoader_1);
var DefaultModuleLoader_2 = DefaultModuleLoader_1.DefaultModuleLoader;

var IModuleValidate = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });


/**
 * inject module validate token.
 *
 * @export
 * @class InjectModuleValidateToken
 * @extends {Registration<T>}
 * @template T
 */
class InjectModuleValidateToken extends Registration_1.Registration {
    constructor(desc) {
        super('DI_ModuleValidate', desc);
    }
}
InjectModuleValidateToken.classAnnations = { "name": "InjectModuleValidateToken", "params": { "constructor": ["desc"] } };
exports.InjectModuleValidateToken = InjectModuleValidateToken;
/**
 * Module Validate Token
 */
exports.ModuleValidateToken = new InjectToken_1.InjectToken('DI_ModuleValidate');




});

unwrapExports(IModuleValidate);
var IModuleValidate_1 = IModuleValidate.InjectModuleValidateToken;
var IModuleValidate_2 = IModuleValidate.ModuleValidateToken;

var IMetaAccessor = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * application service token.
 *
 * @export
 * @class InjectMetaAccessorToken
 * @extends {Registration<MetaAccessor<T>>}
 * @template T
 */
class InjectMetaAccessorToken extends Registration_1.Registration {
    constructor(type) {
        super(type, 'boot__metaAccessor');
    }
}
InjectMetaAccessorToken.classAnnations = { "name": "InjectMetaAccessorToken", "params": { "constructor": ["type"] } };
exports.InjectMetaAccessorToken = InjectMetaAccessorToken;
/**
 * default MetaAccessor token.
 */
exports.DefaultMetaAccessorToken = new InjectMetaAccessorToken('default');
/**
 * Annotation MetaAccessor token.
 */
exports.AnnotationMetaAccessorToken = new InjectMetaAccessorToken('Annotation');




});

unwrapExports(IMetaAccessor);
var IMetaAccessor_1 = IMetaAccessor.InjectMetaAccessorToken;
var IMetaAccessor_2 = IMetaAccessor.DefaultMetaAccessorToken;
var IMetaAccessor_3 = IMetaAccessor.AnnotationMetaAccessorToken;

var ModuleValidate = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });




/**
 * base module validate.
 *
 * @export
 * @abstract
 * @class BaseModuelValidate
 * @implements {IModuleValidate}
 */
class BaseModuelValidate {
    constructor() {
    }
    validate(type) {
        if (!utils.isClass(type)) {
            return false;
        }
        let decorator = this.getDecorator();
        if (utils.isString(decorator)) {
            return core.hasOwnClassMetadata(decorator, type);
        }
        else if (utils.isArray(decorator)) {
            if (decorator.length > 0) {
                return decorator.some(decor => core.hasOwnClassMetadata(decor, type));
            }
        }
        return false;
    }
    getMetaConfig(token, container) {
        if (utils.isToken(token)) {
            let accessor = this.getMetaAccessor(container);
            return accessor.getMetadata(token, container);
        }
        return {};
    }
    getMetaAccessor(container) {
        let decorator = this.getDecorator();
        return container.resolve(IMetaAccessor.AnnotationMetaAccessorToken, { decorator: decorator });
    }
}
BaseModuelValidate.classAnnations = { "name": "BaseModuelValidate", "params": { "constructor": [], "validate": ["type"], "getMetaConfig": ["token", "container"], "getMetaAccessor": ["container"], "getDecorator": [] } };
exports.BaseModuelValidate = BaseModuelValidate;
/**
 * IocExt module validate token.
 */
exports.IocExtModuleValidateToken = new IModuleValidate.InjectModuleValidateToken(core.IocExt.toString());
/**
 * IocExt module validate.
 *
 * @export
 * @class IocExtModuleValidate
 * @extends {BaseModuelValidate}
 * @implements {IModuleValidate}
 */
class IocExtModuleValidate extends BaseModuelValidate {
    getDecorator() {
        return core.IocExt.toString();
    }
}
IocExtModuleValidate.classAnnations = { "name": "IocExtModuleValidate", "params": { "getDecorator": [] } };
exports.IocExtModuleValidate = IocExtModuleValidate;




});

unwrapExports(ModuleValidate);
var ModuleValidate_1 = ModuleValidate.BaseModuelValidate;
var ModuleValidate_2 = ModuleValidate.IocExtModuleValidateToken;
var ModuleValidate_3 = ModuleValidate.IocExtModuleValidate;

var MetaAccessor_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });




let MetaAccessor = class MetaAccessor {
    constructor(decorator) {
        this.decorators = utils.isArray(decorator) ? decorator : [decorator];
    }
    getDecorators() {
        return this.decorators;
    }
    getMetadata(token, container) {
        let type = utils.isClass(token) ? token : container.getTokenImpl(token);
        if (utils.isClass(type)) {
            let decorators = this.getDecorators();
            let firstDecor = decorators.find(decor => core.hasOwnClassMetadata(decor, type));
            let metas = core.getTypeMetadata(firstDecor, type);
            if (metas && metas.length) {
                let meta = metas[0];
                return meta;
            }
        }
        return {};
    }
};
MetaAccessor.classAnnations = { "name": "MetaAccessor", "params": { "constructor": ["decorator"], "getDecorators": [], "getMetadata": ["token", "container"] } };
MetaAccessor = tslib_1.__decorate([
    core.Injectable(IMetaAccessor.DefaultMetaAccessorToken),
    tslib_1.__metadata("design:paramtypes", [Object])
], MetaAccessor);
exports.MetaAccessor = MetaAccessor;
/**
 * Annotation MetaAccessor.
 *
 * @export
 * @class AnnotationMetaAccessor
 * @implements {IMetaAccessor<any>}
 */
let AnnotationMetaAccessor = class AnnotationMetaAccessor {
    constructor(decorator) {
        this.decorators = utils.isArray(decorator) ? decorator : [decorator];
    }
    getDecorators() {
        return this.decorators;
    }
    getMetadata(token, container) {
        if (utils.isToken(token)) {
            let accessor;
            let provider = { decorator: this.getDecorators() };
            container.getTokenExtendsChain(token).forEach(tk => {
                if (accessor) {
                    return false;
                }
                let accToken = new IMetaAccessor.InjectMetaAccessorToken(tk);
                if (container.has(accToken)) {
                    accessor = container.resolve(accToken, provider);
                }
                return true;
            });
            if (!accessor) {
                accessor = this.getDefaultMetaAccessor(container, provider);
            }
            if (accessor) {
                return accessor.getMetadata(token, container);
            }
            else {
                return {};
            }
        }
        return {};
    }
    getDefaultMetaAccessor(container, ...providers) {
        return container.resolve(IMetaAccessor.DefaultMetaAccessorToken, ...providers);
    }
};
AnnotationMetaAccessor.classAnnations = { "name": "AnnotationMetaAccessor", "params": { "constructor": ["decorator"], "getDecorators": [], "getMetadata": ["token", "container"], "getDefaultMetaAccessor": ["container", "providers"] } };
AnnotationMetaAccessor = tslib_1.__decorate([
    core.Injectable(IMetaAccessor.AnnotationMetaAccessorToken),
    tslib_1.__metadata("design:paramtypes", [Object])
], AnnotationMetaAccessor);
exports.AnnotationMetaAccessor = AnnotationMetaAccessor;




});

unwrapExports(MetaAccessor_1);
var MetaAccessor_2 = MetaAccessor_1.MetaAccessor;
var MetaAccessor_3 = MetaAccessor_1.AnnotationMetaAccessor;

var IModuleInjector = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 *  inject module injector token.
 */
class InjectModuleInjectorToken extends Registration_1.Registration {
    constructor(desc, sync = false) {
        super(sync ? 'DI_SyncModuleInjector' : 'DI_ModuleInjector', desc);
    }
}
InjectModuleInjectorToken.classAnnations = { "name": "InjectModuleInjectorToken", "params": { "constructor": ["desc", "sync"] } };
exports.InjectModuleInjectorToken = InjectModuleInjectorToken;
/**
 * async module injector token.
 */
exports.ModuleInjectorToken = new InjectModuleInjectorToken('');
/**
 * Sync module injector token.
 */
exports.SyncModuleInjectorToken = new InjectModuleInjectorToken('', true);




});

unwrapExports(IModuleInjector);
var IModuleInjector_1 = IModuleInjector.InjectModuleInjectorToken;
var IModuleInjector_2 = IModuleInjector.ModuleInjectorToken;
var IModuleInjector_3 = IModuleInjector.SyncModuleInjectorToken;

var ModuleInjector_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });




/**
 * base module injector. abstract class.
 *
 * @export
 * @abstract
 * @class BaseModuleInjector
 * @implements {IModuleInjector}
 */
class BaseModuleInjector {
    /**
     *Creates an instance of BaseModuleInjector.
     * @param {IModuleValidate} [validate]
     * @param {boolean} [skipNext] skip next when has match module to injector.
     * @memberof BaseModuleInjector
     */
    constructor(validate, skipNext) {
        this.validate = validate;
        this.skipNext = skipNext;
    }
    filter(modules) {
        modules = modules || [];
        return this.validate ? modules.filter(md => this.validate.validate(md)) : modules;
    }
    next(all, filtered) {
        if (filtered.length === 0) {
            return all;
        }
        if (this.skipNext) {
            return null;
        }
        if (filtered.length === all.length) {
            return null;
        }
        return all.filter(it => filtered.indexOf(it) < 0);
    }
    setup(container, type) {
        container.register(type);
    }
}
BaseModuleInjector.classAnnations = { "name": "BaseModuleInjector", "params": { "constructor": ["validate", "skipNext"], "inject": ["container", "modules"], "filter": ["modules"], "next": ["all", "filtered"], "setup": ["container", "type"] } };
exports.BaseModuleInjector = BaseModuleInjector;
/**
 * sync module injector.
 *
 * @export
 * @class SyncModuleInjector
 * @extends {BaseModuleInjector}
 * @implements {IModuleInjector}
 */
let SyncModuleInjector = class SyncModuleInjector extends BaseModuleInjector {
    constructor(validate, skipNext) {
        super(validate, skipNext);
        this.validate = validate;
    }
    inject(container, modules) {
        let types = this.filter(modules);
        if (types.length) {
            types.forEach(ty => {
                this.setup(container, ty);
            });
        }
        let next = this.next(modules, types);
        return { injected: types, next: next };
    }
};
SyncModuleInjector.classAnnations = { "name": "SyncModuleInjector", "params": { "constructor": ["validate", "skipNext"], "inject": ["container", "modules"] } };
SyncModuleInjector = tslib_1.__decorate([
    core.Injectable(IModuleInjector.SyncModuleInjectorToken),
    tslib_1.__metadata("design:paramtypes", [Object, Boolean])
], SyncModuleInjector);
exports.SyncModuleInjector = SyncModuleInjector;
/**
 * module injector.
 *
 * @export
 * @class ModuleInjector
 * @extends {BaseModuleInjector}
 * @implements {IModuleInjector}
 */
let ModuleInjector = class ModuleInjector extends BaseModuleInjector {
    constructor(validate, skipNext) {
        super(validate, skipNext);
        this.validate = validate;
    }
    inject(container, modules) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let types = this.filter(modules);
            if (types.length) {
                yield utils.PromiseUtil.step(types.map(ty => {
                    return this.setup(container, ty);
                }));
            }
            let next = this.next(modules, types);
            return { injected: types, next: next };
        });
    }
};
ModuleInjector.classAnnations = { "name": "ModuleInjector", "params": { "constructor": ["validate", "skipNext"], "inject": ["container", "modules"] } };
ModuleInjector = tslib_1.__decorate([
    core.Injectable(IModuleInjector.ModuleInjectorToken),
    tslib_1.__metadata("design:paramtypes", [Object, Boolean])
], ModuleInjector);
exports.ModuleInjector = ModuleInjector;




});

unwrapExports(ModuleInjector_1);
var ModuleInjector_2 = ModuleInjector_1.BaseModuleInjector;
var ModuleInjector_3 = ModuleInjector_1.SyncModuleInjector;
var ModuleInjector_4 = ModuleInjector_1.ModuleInjector;

var IModuleInjectorChain = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * module fileter token. mast use as singlton.
 */
exports.ModuleInjectorChainToken = new InjectToken_1.InjectToken('DI_ModuleInjectorChain');




});

unwrapExports(IModuleInjectorChain);
var IModuleInjectorChain_1 = IModuleInjectorChain.ModuleInjectorChainToken;

var ModuleInjectorChain_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });



/**
 * Module Injector chain, base injector chain.
 *
 * @export
 * @class ModuleInjectorChain
 * @implements {IModuleInjectorChain}
 */
class ModuleInjectorChain {
    constructor() {
        this._injectors = [];
    }
    get injectors() {
        return this._injectors;
    }
    first(injector) {
        if (this.isInjector(injector)) {
            this._injectors.unshift(injector);
        }
        return this;
    }
    next(injector) {
        if (this.isInjector(injector)) {
            this._injectors.push(injector);
        }
        return this;
    }
    isInjector(injector) {
        return injector instanceof ModuleInjector_1.ModuleInjector || injector instanceof ModuleInjector_1.SyncModuleInjector;
    }
    inject(container, modules) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let types = [];
            yield utils.PromiseUtil.forEach(this.injectors.map(jtor => (ijrt) => jtor.inject(container, ijrt.next)), result => {
                types = types.concat(result.injected || []);
                return result.next && result.next.length > 0;
            }, { injected: [], next: modules }).catch(err => []);
            return types;
        });
    }
    syncInject(container, modules) {
        let types = [];
        let completed = false;
        this.injectors.forEach(jtor => {
            if (completed) {
                return false;
            }
            if (jtor instanceof ModuleInjector_1.SyncModuleInjector) {
                let result = jtor.inject(container, modules);
                types = types.concat(result.injected);
                completed = (!result.next || result.next.length < 1);
            }
            return true;
        });
        return types;
    }
}
ModuleInjectorChain.classAnnations = { "name": "ModuleInjectorChain", "params": { "constructor": [], "first": ["injector"], "next": ["injector"], "isInjector": ["injector"], "inject": ["container", "modules"], "syncInject": ["container", "modules"] } };
exports.ModuleInjectorChain = ModuleInjectorChain;




});

unwrapExports(ModuleInjectorChain_1);
var ModuleInjectorChain_2 = ModuleInjectorChain_1.ModuleInjectorChain;

var injectors = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

tslib_1.__exportStar(IModuleLoader, exports);
tslib_1.__exportStar(DefaultModuleLoader_1, exports);
tslib_1.__exportStar(IModuleValidate, exports);
tslib_1.__exportStar(ModuleValidate, exports);
tslib_1.__exportStar(IMetaAccessor, exports);
tslib_1.__exportStar(MetaAccessor_1, exports);
tslib_1.__exportStar(IModuleInjector, exports);
tslib_1.__exportStar(ModuleInjector_1, exports);
tslib_1.__exportStar(IModuleInjectorChain, exports);
tslib_1.__exportStar(ModuleInjectorChain_1, exports);




});

unwrapExports(injectors);

var DefaultContainerBuilder_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });





/**
 * default container builder.
 *
 * @export
 * @class DefaultContainerBuilder
 * @implements {IContainerBuilder}
 */
class DefaultContainerBuilder {
    constructor(loader) {
        this._loader = loader;
    }
    get loader() {
        if (!this._loader) {
            this._loader = new injectors.DefaultModuleLoader();
        }
        return this._loader;
    }
    create() {
        let container = new Container_1.Container();
        container.bindProvider(IContainerBuilder.ContainerBuilderToken, () => this);
        container.bindProvider(injectors.ModuleLoaderToken, () => this.loader);
        return container;
    }
    /**
     * build container.
     *
     * @param {...LoadType[]} [modules]
     * @returns
     * @memberof DefaultContainerBuilder
     */
    build(...modules) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let container = this.create();
            if (modules.length) {
                yield this.loadModule(container, ...modules);
            }
            return container;
        });
    }
    /**
     * load modules for container.
     *
     * @param {IContainer} container
     * @param {...LoadType[]} modules
     * @returns {Promise<Type<any>[]>}
     * @memberof DefaultContainerBuilder
     */
    loadModule(container, ...modules) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let regModules = yield this.loader.loadTypes(modules);
            let injTypes = [];
            if (regModules && regModules.length) {
                let injChain = this.getInjectorChain(container);
                yield utils.PromiseUtil.step(regModules.map((typs) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                    let ityps = yield injChain.inject(container, typs);
                    injTypes = injTypes.concat(ityps);
                })));
            }
            return injTypes;
        });
    }
    syncBuild(...modules) {
        let container = this.create();
        if (modules.length) {
            this.syncLoadModule(container, ...modules);
        }
        return container;
    }
    syncLoadModule(container, ...modules) {
        let regModules = this.loader.getTypes(modules);
        let injTypes = [];
        if (regModules && regModules.length) {
            let injChain = this.getInjectorChain(container);
            regModules.forEach(typs => {
                let ityps = injChain.syncInject(container, typs);
                injTypes = injTypes.concat(ityps);
            });
        }
        return injTypes;
    }
    getInjectorChain(container) {
        if (!container.has(injectors.ModuleInjectorChainToken)) {
            container.register(injectors.SyncModuleInjector)
                .register(injectors.ModuleInjector)
                .register(injectors.MetaAccessor)
                .register(injectors.AnnotationMetaAccessor)
                .bindProvider(injectors.IocExtModuleValidateToken, new injectors.IocExtModuleValidate())
                .bindProvider(injectors.ModuleInjectorChainToken, new injectors.ModuleInjectorChain());
        }
        let currChain = container.get(injectors.ModuleInjectorChainToken);
        if (this.injectorChain !== currChain) {
            this.injectorChain = null;
        }
        if (!this.injectorChain) {
            this.injectorChain = currChain;
            this.injectorChain
                .next(container.resolve(injectors.SyncModuleInjectorToken, { validate: container.get(injectors.IocExtModuleValidateToken), skipNext: true }))
                .next(container.resolve(injectors.SyncModuleInjectorToken));
        }
        return this.injectorChain;
    }
}
DefaultContainerBuilder.classAnnations = { "name": "DefaultContainerBuilder", "params": { "constructor": ["loader"], "create": [], "build": ["modules"], "loadModule": ["container", "modules"], "syncBuild": ["modules"], "syncLoadModule": ["container", "modules"], "getInjectorChain": ["container"] } };
exports.DefaultContainerBuilder = DefaultContainerBuilder;




});

unwrapExports(DefaultContainerBuilder_1);
var DefaultContainerBuilder_2 = DefaultContainerBuilder_1.DefaultContainerBuilder;

var D__workspace_github_tsioc_packages_core_esnext = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

tslib_1.__exportStar(IContainer, exports);
tslib_1.__exportStar(Container_1, exports);
tslib_1.__exportStar(types, exports);
tslib_1.__exportStar(Registration_1, exports);
tslib_1.__exportStar(InjectToken_1, exports);
tslib_1.__exportStar(IContainerBuilder, exports);
tslib_1.__exportStar(IMethodAccessor, exports);
tslib_1.__exportStar(ICacheManager, exports);
tslib_1.__exportStar(LifeScope, exports);
tslib_1.__exportStar(DefaultContainerBuilder_1, exports);
tslib_1.__exportStar(utils, exports);
tslib_1.__exportStar(components, exports);
tslib_1.__exportStar(core, exports);
tslib_1.__exportStar(injectors, exports);
tslib_1.__exportStar(resolves, exports);




});

var index$9 = unwrapExports(D__workspace_github_tsioc_packages_core_esnext);

module.exports = index$9;

//# sourceMappingURL=sourcemaps/core.js.map

//# sourceMappingURL=sourcemaps/core.js.map
