(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('tslib'), require('reflect-metadata')) :
	typeof define === 'function' && define.amd ? define(['tslib', 'reflect-metadata'], factory) :
	(global.core = global.core || {}, global.core.umd = global.core.umd || {}, global.core.umd.js = factory(global.tslib_1,global.Reflect));
}(this, (function (tslib_1,reflectMetadata) { 'use strict';

tslib_1 = tslib_1 && tslib_1.hasOwnProperty('default') ? tslib_1['default'] : tslib_1;
reflectMetadata = reflectMetadata && reflectMetadata.hasOwnProperty('default') ? reflectMetadata['default'] : reflectMetadata;

function commonjsRequire () {
	throw new Error('Dynamic requires are not currently supported by rollup-plugin-commonjs');
}

function unwrapExports (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var toStr = Object.prototype.toString;

var isArguments = function isArguments(value) {
	var str = toStr.call(value);
	var isArgs = str === '[object Arguments]';
	if (!isArgs) {
		isArgs = str !== '[object Array]' &&
			value !== null &&
			typeof value === 'object' &&
			typeof value.length === 'number' &&
			value.length >= 0 &&
			toStr.call(value.callee) === '[object Function]';
	}
	return isArgs;
};

// modified from https://github.com/es-shims/es5-shim
var has = Object.prototype.hasOwnProperty;
var toStr$1 = Object.prototype.toString;
var slice = Array.prototype.slice;

var isEnumerable = Object.prototype.propertyIsEnumerable;
var hasDontEnumBug = !isEnumerable.call({ toString: null }, 'toString');
var hasProtoEnumBug = isEnumerable.call(function () {}, 'prototype');
var dontEnums = [
	'toString',
	'toLocaleString',
	'valueOf',
	'hasOwnProperty',
	'isPrototypeOf',
	'propertyIsEnumerable',
	'constructor'
];
var equalsConstructorPrototype = function (o) {
	var ctor = o.constructor;
	return ctor && ctor.prototype === o;
};
var excludedKeys = {
	$console: true,
	$external: true,
	$frame: true,
	$frameElement: true,
	$frames: true,
	$innerHeight: true,
	$innerWidth: true,
	$outerHeight: true,
	$outerWidth: true,
	$pageXOffset: true,
	$pageYOffset: true,
	$parent: true,
	$scrollLeft: true,
	$scrollTop: true,
	$scrollX: true,
	$scrollY: true,
	$self: true,
	$webkitIndexedDB: true,
	$webkitStorageInfo: true,
	$window: true
};
var hasAutomationEqualityBug = (function () {
	/* global window */
	if (typeof window === 'undefined') { return false; }
	for (var k in window) {
		try {
			if (!excludedKeys['$' + k] && has.call(window, k) && window[k] !== null && typeof window[k] === 'object') {
				try {
					equalsConstructorPrototype(window[k]);
				} catch (e) {
					return true;
				}
			}
		} catch (e) {
			return true;
		}
	}
	return false;
}());
var equalsConstructorPrototypeIfNotBuggy = function (o) {
	/* global window */
	if (typeof window === 'undefined' || !hasAutomationEqualityBug) {
		return equalsConstructorPrototype(o);
	}
	try {
		return equalsConstructorPrototype(o);
	} catch (e) {
		return false;
	}
};

var keysShim = function keys(object) {
	var isObject = object !== null && typeof object === 'object';
	var isFunction = toStr$1.call(object) === '[object Function]';
	var isArguments$$1 = isArguments(object);
	var isString = isObject && toStr$1.call(object) === '[object String]';
	var theKeys = [];

	if (!isObject && !isFunction && !isArguments$$1) {
		throw new TypeError('Object.keys called on a non-object');
	}

	var skipProto = hasProtoEnumBug && isFunction;
	if (isString && object.length > 0 && !has.call(object, 0)) {
		for (var i = 0; i < object.length; ++i) {
			theKeys.push(String(i));
		}
	}

	if (isArguments$$1 && object.length > 0) {
		for (var j = 0; j < object.length; ++j) {
			theKeys.push(String(j));
		}
	} else {
		for (var name in object) {
			if (!(skipProto && name === 'prototype') && has.call(object, name)) {
				theKeys.push(String(name));
			}
		}
	}

	if (hasDontEnumBug) {
		var skipConstructor = equalsConstructorPrototypeIfNotBuggy(object);

		for (var k = 0; k < dontEnums.length; ++k) {
			if (!(skipConstructor && dontEnums[k] === 'constructor') && has.call(object, dontEnums[k])) {
				theKeys.push(dontEnums[k]);
			}
		}
	}
	return theKeys;
};

keysShim.shim = function shimObjectKeys() {
	if (Object.keys) {
		var keysWorksWithArguments = (function () {
			// Safari 5.0 bug
			return (Object.keys(arguments) || '').length === 2;
		}(1, 2));
		if (!keysWorksWithArguments) {
			var originalKeys = Object.keys;
			Object.keys = function keys(object) {
				if (isArguments(object)) {
					return originalKeys(slice.call(object));
				} else {
					return originalKeys(object);
				}
			};
		}
	} else {
		Object.keys = keysShim;
	}
	return Object.keys || keysShim;
};

var objectKeys = keysShim;

var hasOwn = Object.prototype.hasOwnProperty;
var toString = Object.prototype.toString;

var foreach = function forEach (obj, fn, ctx) {
    if (toString.call(fn) !== '[object Function]') {
        throw new TypeError('iterator must be a function');
    }
    var l = obj.length;
    if (l === +l) {
        for (var i = 0; i < l; i++) {
            fn.call(ctx, obj[i], i, obj);
        }
    } else {
        for (var k in obj) {
            if (hasOwn.call(obj, k)) {
                fn.call(ctx, obj[k], k, obj);
            }
        }
    }
};

var hasSymbols = typeof Symbol === 'function' && typeof Symbol() === 'symbol';

var toStr$2 = Object.prototype.toString;

var isFunction = function (fn) {
	return typeof fn === 'function' && toStr$2.call(fn) === '[object Function]';
};

var arePropertyDescriptorsSupported = function () {
	var obj = {};
	try {
		Object.defineProperty(obj, 'x', { enumerable: false, value: obj });
        /* eslint-disable no-unused-vars, no-restricted-syntax */
        for (var _ in obj) { return false; }
        /* eslint-enable no-unused-vars, no-restricted-syntax */
		return obj.x === obj;
	} catch (e) { /* this is IE 8. */
		return false;
	}
};
var supportsDescriptors = Object.defineProperty && arePropertyDescriptorsSupported();

var defineProperty = function (object, name, value, predicate) {
	if (name in object && (!isFunction(predicate) || !predicate())) {
		return;
	}
	if (supportsDescriptors) {
		Object.defineProperty(object, name, {
			configurable: true,
			enumerable: false,
			value: value,
			writable: true
		});
	} else {
		object[name] = value;
	}
};

var defineProperties = function (object, map) {
	var predicates = arguments.length > 2 ? arguments[2] : {};
	var props = objectKeys(map);
	if (hasSymbols) {
		props = props.concat(Object.getOwnPropertySymbols(map));
	}
	foreach(props, function (name) {
		defineProperty(object, name, map[name], predicates[name]);
	});
};

defineProperties.supportsDescriptors = !!supportsDescriptors;

var defineProperties_1 = defineProperties;

var toStr$3 = Object.prototype.toString;

var isArguments$2 = function isArguments(value) {
	var str = toStr$3.call(value);
	var isArgs = str === '[object Arguments]';
	if (!isArgs) {
		isArgs = str !== '[object Array]' &&
			value !== null &&
			typeof value === 'object' &&
			typeof value.length === 'number' &&
			value.length >= 0 &&
			toStr$3.call(value.callee) === '[object Function]';
	}
	return isArgs;
};

// modified from https://github.com/es-shims/es5-shim
var has$1 = Object.prototype.hasOwnProperty;
var toStr$4 = Object.prototype.toString;
var slice$1 = Array.prototype.slice;

var isEnumerable$1 = Object.prototype.propertyIsEnumerable;
var hasDontEnumBug$1 = !isEnumerable$1.call({ toString: null }, 'toString');
var hasProtoEnumBug$1 = isEnumerable$1.call(function () {}, 'prototype');
var dontEnums$1 = [
	'toString',
	'toLocaleString',
	'valueOf',
	'hasOwnProperty',
	'isPrototypeOf',
	'propertyIsEnumerable',
	'constructor'
];
var equalsConstructorPrototype$1 = function (o) {
	var ctor = o.constructor;
	return ctor && ctor.prototype === o;
};
var excludedKeys$1 = {
	$console: true,
	$external: true,
	$frame: true,
	$frameElement: true,
	$frames: true,
	$innerHeight: true,
	$innerWidth: true,
	$outerHeight: true,
	$outerWidth: true,
	$pageXOffset: true,
	$pageYOffset: true,
	$parent: true,
	$scrollLeft: true,
	$scrollTop: true,
	$scrollX: true,
	$scrollY: true,
	$self: true,
	$webkitIndexedDB: true,
	$webkitStorageInfo: true,
	$window: true
};
var hasAutomationEqualityBug$1 = (function () {
	/* global window */
	if (typeof window === 'undefined') { return false; }
	for (var k in window) {
		try {
			if (!excludedKeys$1['$' + k] && has$1.call(window, k) && window[k] !== null && typeof window[k] === 'object') {
				try {
					equalsConstructorPrototype$1(window[k]);
				} catch (e) {
					return true;
				}
			}
		} catch (e) {
			return true;
		}
	}
	return false;
}());
var equalsConstructorPrototypeIfNotBuggy$1 = function (o) {
	/* global window */
	if (typeof window === 'undefined' || !hasAutomationEqualityBug$1) {
		return equalsConstructorPrototype$1(o);
	}
	try {
		return equalsConstructorPrototype$1(o);
	} catch (e) {
		return false;
	}
};

var keysShim$1 = function keys(object) {
	var isObject = object !== null && typeof object === 'object';
	var isFunction = toStr$4.call(object) === '[object Function]';
	var isArguments = isArguments$2(object);
	var isString = isObject && toStr$4.call(object) === '[object String]';
	var theKeys = [];

	if (!isObject && !isFunction && !isArguments) {
		throw new TypeError('Object.keys called on a non-object');
	}

	var skipProto = hasProtoEnumBug$1 && isFunction;
	if (isString && object.length > 0 && !has$1.call(object, 0)) {
		for (var i = 0; i < object.length; ++i) {
			theKeys.push(String(i));
		}
	}

	if (isArguments && object.length > 0) {
		for (var j = 0; j < object.length; ++j) {
			theKeys.push(String(j));
		}
	} else {
		for (var name in object) {
			if (!(skipProto && name === 'prototype') && has$1.call(object, name)) {
				theKeys.push(String(name));
			}
		}
	}

	if (hasDontEnumBug$1) {
		var skipConstructor = equalsConstructorPrototypeIfNotBuggy$1(object);

		for (var k = 0; k < dontEnums$1.length; ++k) {
			if (!(skipConstructor && dontEnums$1[k] === 'constructor') && has$1.call(object, dontEnums$1[k])) {
				theKeys.push(dontEnums$1[k]);
			}
		}
	}
	return theKeys;
};

keysShim$1.shim = function shimObjectKeys() {
	if (Object.keys) {
		var keysWorksWithArguments = (function () {
			// Safari 5.0 bug
			return (Object.keys(arguments) || '').length === 2;
		}(1, 2));
		if (!keysWorksWithArguments) {
			var originalKeys = Object.keys;
			Object.keys = function keys(object) {
				if (isArguments$2(object)) {
					return originalKeys(slice$1.call(object));
				} else {
					return originalKeys(object);
				}
			};
		}
	} else {
		Object.keys = keysShim$1;
	}
	return Object.keys || keysShim$1;
};

var objectKeys$2 = keysShim$1;

/* eslint no-invalid-this: 1 */

var ERROR_MESSAGE = 'Function.prototype.bind called on incompatible ';
var slice$2 = Array.prototype.slice;
var toStr$5 = Object.prototype.toString;
var funcType = '[object Function]';

var implementation = function bind(that) {
    var target = this;
    if (typeof target !== 'function' || toStr$5.call(target) !== funcType) {
        throw new TypeError(ERROR_MESSAGE + target);
    }
    var args = slice$2.call(arguments, 1);

    var bound;
    var binder = function () {
        if (this instanceof bound) {
            var result = target.apply(
                this,
                args.concat(slice$2.call(arguments))
            );
            if (Object(result) === result) {
                return result;
            }
            return this;
        } else {
            return target.apply(
                that,
                args.concat(slice$2.call(arguments))
            );
        }
    };

    var boundLength = Math.max(0, target.length - args.length);
    var boundArgs = [];
    for (var i = 0; i < boundLength; i++) {
        boundArgs.push('$' + i);
    }

    bound = Function('binder', 'return function (' + boundArgs.join(',') + '){ return binder.apply(this,arguments); }')(binder);

    if (target.prototype) {
        var Empty = function Empty() {};
        Empty.prototype = target.prototype;
        bound.prototype = new Empty();
        Empty.prototype = null;
    }

    return bound;
};

var functionBind = Function.prototype.bind || implementation;

/* eslint complexity: [2, 17], max-statements: [2, 33] */
var shams = function hasSymbols() {
	if (typeof Symbol !== 'function' || typeof Object.getOwnPropertySymbols !== 'function') { return false; }
	if (typeof Symbol.iterator === 'symbol') { return true; }

	var obj = {};
	var sym = Symbol('test');
	var symObj = Object(sym);
	if (typeof sym === 'string') { return false; }

	if (Object.prototype.toString.call(sym) !== '[object Symbol]') { return false; }
	if (Object.prototype.toString.call(symObj) !== '[object Symbol]') { return false; }

	// temp disabled per https://github.com/ljharb/object.assign/issues/17
	// if (sym instanceof Symbol) { return false; }
	// temp disabled per https://github.com/WebReflection/get-own-property-symbols/issues/4
	// if (!(symObj instanceof Symbol)) { return false; }

	// if (typeof Symbol.prototype.toString !== 'function') { return false; }
	// if (String(sym) !== Symbol.prototype.toString.call(sym)) { return false; }

	var symVal = 42;
	obj[sym] = symVal;
	for (sym in obj) { return false; } // eslint-disable-line no-restricted-syntax
	if (typeof Object.keys === 'function' && Object.keys(obj).length !== 0) { return false; }

	if (typeof Object.getOwnPropertyNames === 'function' && Object.getOwnPropertyNames(obj).length !== 0) { return false; }

	var syms = Object.getOwnPropertySymbols(obj);
	if (syms.length !== 1 || syms[0] !== sym) { return false; }

	if (!Object.prototype.propertyIsEnumerable.call(obj, sym)) { return false; }

	if (typeof Object.getOwnPropertyDescriptor === 'function') {
		var descriptor = Object.getOwnPropertyDescriptor(obj, sym);
		if (descriptor.value !== symVal || descriptor.enumerable !== true) { return false; }
	}

	return true;
};

// modified from https://github.com/es-shims/es6-shim


var canBeObject = function (obj) {
	return typeof obj !== 'undefined' && obj !== null;
};
var hasSymbols$1 = shams();
var toObject = Object;
var push = functionBind.call(Function.call, Array.prototype.push);
var propIsEnumerable = functionBind.call(Function.call, Object.prototype.propertyIsEnumerable);
var originalGetSymbols = hasSymbols$1 ? Object.getOwnPropertySymbols : null;

var implementation$3 = function assign(target, source1) {
	if (!canBeObject(target)) { throw new TypeError('target must be an object'); }
	var objTarget = toObject(target);
	var s, source, i, props, syms, value, key;
	for (s = 1; s < arguments.length; ++s) {
		source = toObject(arguments[s]);
		props = objectKeys$2(source);
		var getSymbols = hasSymbols$1 && (Object.getOwnPropertySymbols || originalGetSymbols);
		if (getSymbols) {
			syms = getSymbols(source);
			for (i = 0; i < syms.length; ++i) {
				key = syms[i];
				if (propIsEnumerable(source, key)) {
					push(props, key);
				}
			}
		}
		for (i = 0; i < props.length; ++i) {
			key = props[i];
			value = source[key];
			if (propIsEnumerable(source, key)) {
				objTarget[key] = value;
			}
		}
	}
	return objTarget;
};

var lacksProperEnumerationOrder = function () {
	if (!Object.assign) {
		return false;
	}
	// v8, specifically in node 4.x, has a bug with incorrect property enumeration order
	// note: this does not detect the bug unless there's 20 characters
	var str = 'abcdefghijklmnopqrst';
	var letters = str.split('');
	var map = {};
	for (var i = 0; i < letters.length; ++i) {
		map[letters[i]] = letters[i];
	}
	var obj = Object.assign({}, map);
	var actual = '';
	for (var k in obj) {
		actual += k;
	}
	return str !== actual;
};

var assignHasPendingExceptions = function () {
	if (!Object.assign || !Object.preventExtensions) {
		return false;
	}
	// Firefox 37 still has "pending exception" logic in its Object.assign implementation,
	// which is 72% slower than our shim, and Firefox 40's native implementation.
	var thrower = Object.preventExtensions({ 1: 2 });
	try {
		Object.assign(thrower, 'xy');
	} catch (e) {
		return thrower[1] === 'y';
	}
	return false;
};

var polyfill = function getPolyfill() {
	if (!Object.assign) {
		return implementation$3;
	}
	if (lacksProperEnumerationOrder()) {
		return implementation$3;
	}
	if (assignHasPendingExceptions()) {
		return implementation$3;
	}
	return Object.assign;
};

var shim = function shimAssign() {
	var polyfill$$1 = polyfill();
	defineProperties_1(
		Object,
		{ assign: polyfill$$1 },
		{ assign: function () { return Object.assign !== polyfill$$1; } }
	);
	return polyfill$$1;
};

var polyfill$2 = polyfill();

defineProperties_1(polyfill$2, {
	getPolyfill: polyfill,
	implementation: implementation$3,
	shim: shim
});

var object_assign = polyfill$2;

var lang_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });


object_assign.shim();
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
                var keys_1 = [];
                for (var name_1 in target) {
                    keys_1.push(name_1);
                }
                return keys_1;
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
                var values_1 = [];
                for (var name_2 in target) {
                    values_1.push(target[name_2]);
                }
                return values_1;
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
            return Object.assign.apply(Object, [target].concat(sources));
        }
        else if (source2) {
            return Object.assign(target, source1 || {}, source2);
        }
        else {
            return Object.assign(target, source1 || {});
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
    function omit(target) {
        var fields = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            fields[_i - 1] = arguments[_i];
        }
        if (typeCheck.isObject(target)) {
            var result_1 = {};
            keys(target).forEach(function (key) {
                if (fields.indexOf(key) < 0) {
                    result_1[key] = target[key];
                }
            });
            return result_1;
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
            keys(target).forEach(function (key, idx) {
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
        var item;
        forIn(target, function (it, idx) {
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
        var p = Reflect.getPrototypeOf(target.prototype);
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
        var type = target;
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
        return lang_1.lang.keys(target).some(function (n) { return props.indexOf(n) > 0; });
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
var ObjectMapSet = /** @class */ (function () {
    function ObjectMapSet() {
        this.valueMap = {};
        this.keyMap = {};
    }
    ObjectMapSet.prototype.clear = function () {
        this.valueMap = {};
        this.keyMap = {};
    };
    ObjectMapSet.prototype.getTypeKey = function (key) {
        var strKey = '';
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
    };
    ObjectMapSet.prototype.keys = function () {
        return lang_1.lang.values(this.keyMap);
    };
    ObjectMapSet.prototype.values = function () {
        return lang_1.lang.values(this.valueMap);
    };
    ObjectMapSet.prototype.delete = function (key) {
        var strkey = this.getTypeKey(key).toString();
        try {
            delete this.keyMap[strkey];
            delete this.valueMap[strkey];
            return true;
        }
        catch (_a) {
            return false;
        }
    };
    ObjectMapSet.prototype.forEach = function (callbackfn, thisArg) {
        var _this = this;
        lang_1.lang.forIn(this.keyMap, function (val, name) {
            callbackfn(_this.valueMap[name], val, _this);
        });
    };
    ObjectMapSet.prototype.get = function (key) {
        var strKey = this.getTypeKey(key);
        return this.valueMap[strKey];
    };
    ObjectMapSet.prototype.has = function (key) {
        var strKey = this.getTypeKey(key);
        return !typeCheck.isUndefined(this.keyMap[strKey]);
    };
    ObjectMapSet.prototype.set = function (key, value) {
        var strKey = this.getTypeKey(key);
        this.keyMap[strKey] = key;
        this.valueMap[strKey] = value;
        return this;
    };
    Object.defineProperty(ObjectMapSet.prototype, "size", {
        get: function () {
            return lang_1.lang.keys(this.keyMap).length;
        },
        enumerable: true,
        configurable: true
    });
    ObjectMapSet.classAnnations = { "name": "ObjectMapSet", "params": { "constructor": [], "clear": [], "getTypeKey": ["key"], "keys": [], "values": [], "delete": ["key"], "forEach": ["callbackfn", "thisArg"], "get": ["key"], "has": ["key"], "set": ["key", "value"] } };
    return ObjectMapSet;
}());
exports.ObjectMapSet = ObjectMapSet;
/**
 * map set.
 *
 * @export
 * @class MapSet
 * @template TKey
 * @template TVal
 */
var MapSet = /** @class */ (function () {
    function MapSet() {
        this.map = typeCheck.isClass(Map) ? new Map() : new ObjectMapSet();
    }
    MapSet.prototype.keys = function () {
        return this.map.keys();
    };
    MapSet.prototype.values = function () {
        return this.map.values();
    };
    MapSet.prototype.clear = function () {
        this.map.clear();
    };
    MapSet.prototype.delete = function (key) {
        return this.map.delete(key);
    };
    MapSet.prototype.forEach = function (callbackfn, thisArg) {
        var map = this.map;
        map.forEach(callbackfn, thisArg);
    };
    MapSet.prototype.get = function (key) {
        return this.map.get(key);
    };
    MapSet.prototype.has = function (key) {
        return this.map.has(key);
    };
    MapSet.prototype.set = function (key, value) {
        this.map.set(key, value);
        return this;
    };
    Object.defineProperty(MapSet.prototype, "size", {
        get: function () {
            return this.map.size;
        },
        enumerable: true,
        configurable: true
    });
    MapSet.classAnnations = { "name": "MapSet", "params": { "constructor": [], "keys": [], "values": [], "clear": [], "delete": ["key"], "forEach": ["callbackfn", "thisArg"], "get": ["key"], "has": ["key"], "set": ["key", "value"] } };
    return MapSet;
}());
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
var Defer = /** @class */ (function () {
    function Defer() {
        var _this = this;
        this.promise = new Promise(function (resolve, reject) {
            _this.resolve = resolve;
            _this.reject = reject;
        });
    }
    Defer.create = function (then) {
        var defer = new Defer();
        if (then) {
            defer.promise = defer.promise.then(then);
            return defer;
        }
        else {
            return defer;
        }
    };
    Defer.classAnnations = { "name": "Defer", "params": { "create": ["then"], "constructor": [] } };
    return Defer;
}());
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
        var defer = new Defer();
        var pf = Promise.resolve(defVal);
        var length = promises ? promises.length : 0;
        if (length) {
            promises.forEach(function (p, idx) {
                pf = pf.then(function (v) { return typeCheck.isFunction(p) ? p(v) : p; })
                    .then(function (data) {
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
            pf.catch(function (err) {
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
        var result = Promise.resolve(null);
        promises.forEach(function (p) {
            result = result.then(function (v) { return typeCheck.isFunction(p) ? p(v) : p; });
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
        var defer = new Defer();
        forEach(promises, function (val) {
            if (filter(val)) {
                defer.resolve(val);
                return false;
            }
            return true;
        }, defVal)
            .then(function () { return defer.resolve(null); })
            .catch(function () {
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
var Registration = /** @class */ (function () {
    /**
     * Creates an instance of Registration.
     * @param {(Token<T> | Token<any>)} provideType
     * @param {string} desc
     * @memberof Registration
     */
    function Registration(provideType, desc) {
        this.type = 'Reg';
        if (provideType instanceof Registration) {
            this.classType = provideType.getProvide();
            var pdec = provideType.getDesc();
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
    Registration.prototype.getProvide = function () {
        return this.classType;
    };
    /**
     * get class.
     *
     * @returns
     * @memberof Registration
     */
    Registration.prototype.getClass = function () {
        if (utils.isClass(this.classType)) {
            return this.classType;
        }
        return null;
    };
    /**
     * get desc.
     *
     * @returns
     * @memberof Registration
     */
    Registration.prototype.getDesc = function () {
        return this.desc;
    };
    /**
     * to string.
     *
     * @returns {string}
     * @memberof Registration
     */
    Registration.prototype.toString = function () {
        var name = '';
        if (utils.isFunction(this.classType)) {
            name = "{" + utils.getClassName(this.classType) + "}";
        }
        else if (this.classType) {
            name = this.classType.toString();
        }
        return (this.type + " " + name + " " + this.desc).trim();
    };
    Registration.classAnnations = { "name": "Registration", "params": { "constructor": ["provideType", "desc"], "getProvide": [], "getClass": [], "getDesc": [], "toString": [] } };
    return Registration;
}());
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
var InjectToken = /** @class */ (function (_super) {
    tslib_1.__extends(InjectToken, _super);
    function InjectToken(desc) {
        return _super.call(this, desc, '') || this;
    }
    InjectToken.classAnnations = { "name": "InjectToken", "params": { "constructor": ["desc"] } };
    return InjectToken;
}(Registration_1.Registration));
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
var NullComponent = /** @class */ (function () {
    function NullComponent() {
    }
    NullComponent.prototype.isEmpty = function () {
        return true;
    };
    NullComponent.prototype.add = function (action) {
        return this;
    };
    NullComponent.prototype.remove = function (action) {
        return this;
    };
    NullComponent.prototype.find = function (express, mode) {
        return exports.NullNode;
    };
    NullComponent.prototype.filter = function (express, mode) {
        return [];
    };
    NullComponent.prototype.each = function (express, mode) {
    };
    NullComponent.prototype.trans = function (express) {
    };
    NullComponent.prototype.transAfter = function (express) {
    };
    NullComponent.prototype.routeUp = function (express) {
    };
    NullComponent.prototype.equals = function (node) {
        return node === exports.NullNode;
    };
    NullComponent.prototype.empty = function () {
        return exports.NullNode;
    };
    NullComponent.classAnnations = { "name": "NullComponent", "params": { "isEmpty": [], "add": ["action"], "remove": ["action"], "find": ["express", "mode"], "filter": ["express", "mode"], "each": ["express", "mode"], "trans": ["express"], "transAfter": ["express"], "routeUp": ["express"], "equals": ["node"], "empty": [] } };
    return NullComponent;
}());
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
var GComposite = /** @class */ (function () {
    function GComposite(name) {
        this.name = name;
        this.children = [];
    }
    GComposite.prototype.add = function (node) {
        node.parent = this;
        this.children.push(node);
        return this;
    };
    GComposite.prototype.remove = function (node) {
        var component;
        if (utils.isString(node)) {
            component = this.find(function (cmp) { return utils.isString(node) ? cmp.name === node : cmp.equals(node); });
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
    };
    GComposite.prototype.find = function (express, mode) {
        var component;
        this.each(function (item) {
            if (component) {
                return false;
            }
            var isFinded = utils.isFunction(express) ? express(item) : express === (item);
            if (isFinded) {
                component = item;
                return false;
            }
            return true;
        }, mode);
        return (component || this.empty());
    };
    GComposite.prototype.filter = function (express, mode) {
        var nodes = [];
        this.each(function (item) {
            if (express(item)) {
                nodes.push(item);
            }
        }, mode);
        return nodes;
    };
    GComposite.prototype.each = function (iterate, mode) {
        mode = mode || types.Mode.traverse;
        var r;
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
    };
    GComposite.prototype.eachChildren = function (iterate) {
        (this.children || []).forEach(function (item) {
            return iterate(item);
        });
    };
    /**
     *do express work in routing.
     *
     *@param {Express<T, void | boolean>} express
     *
     *@memberOf IComponent
     */
    GComposite.prototype.routeUp = function (iterate) {
        var curr = this;
        if (iterate(curr) === false) {
            return false;
        }
        
        if (this.parent && this.parent.routeUp) {
            return this.parent.routeUp(iterate);
        }
    };
    /**
     *translate all sub context to do express work.
     *
     *@param {Express<T, void | boolean>} express
     *
     *@memberOf IComponent
     */
    GComposite.prototype.trans = function (express) {
        var curr = this;
        if (express(curr) === false) {
            return false;
        }
        var children = this.children || [];
        for (var i = 0; i < children.length; i++) {
            var result = children[i].trans(express);
            if (result === false) {
                return result;
            }
        }
        return true;
    };
    GComposite.prototype.transAfter = function (express) {
        var children = this.children || [];
        for (var i = 0; i < children.length; i++) {
            var result = children[i].transAfter(express);
            if (result === false) {
                return false;
            }
        }
        var curr = this;
        if (express(curr) === false) {
            return false;
        }
        return true;
    };
    GComposite.prototype.equals = function (node) {
        return this === node;
    };
    GComposite.prototype.empty = function () {
        return NullComponent_1.NullNode;
    };
    GComposite.prototype.isEmpty = function () {
        return this.equals(this.empty());
    };
    GComposite.classAnnations = { "name": "GComposite", "params": { "constructor": ["name"], "add": ["node"], "remove": ["node"], "find": ["express", "mode"], "filter": ["express", "mode"], "each": ["iterate", "mode"], "eachChildren": ["iterate"], "routeUp": ["iterate"], "trans": ["express"], "transAfter": ["express"], "equals": ["node"], "empty": [], "isEmpty": [] } };
    return GComposite;
}());
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
var Composite = /** @class */ (function (_super) {
    tslib_1.__extends(Composite, _super);
    function Composite(name) {
        return _super.call(this, name) || this;
    }
    Composite.prototype.find = function (express, mode) {
        return _super.prototype.find.call(this, express, mode);
    };
    Composite.prototype.filter = function (express, mode) {
        return _super.prototype.filter.call(this, express, mode);
    };
    Composite.prototype.each = function (express, mode) {
        return _super.prototype.each.call(this, express, mode);
    };
    Composite.prototype.eachChildren = function (express) {
        _super.prototype.eachChildren.call(this, express);
    };
    Composite.classAnnations = { "name": "Composite", "params": { "constructor": ["name"], "find": ["express", "mode"], "filter": ["express", "mode"], "each": ["express", "mode"], "eachChildren": ["express"] } };
    return Composite;
}(GComposite_1.GComposite));
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


var NullActionClass = /** @class */ (function (_super) {
    tslib_1.__extends(NullActionClass, _super);
    function NullActionClass() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    NullActionClass.prototype.insert = function (action, index) {
        return this;
    };
    NullActionClass.prototype.execute = function (container, data, name) {
    };
    NullActionClass.prototype.empty = function () {
        return exports.NullAction;
    };
    NullActionClass.classAnnations = { "name": "NullActionClass", "params": { "insert": ["action", "index"], "execute": ["container", "data", "name"], "empty": [] } };
    return NullActionClass;
}(components.NullComponent));
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
var ActionComposite = /** @class */ (function (_super) {
    tslib_1.__extends(ActionComposite, _super);
    function ActionComposite(name) {
        var _this = _super.call(this, name) || this;
        _this.children = [];
        return _this;
    }
    ActionComposite.prototype.insert = function (node, index) {
        node.parent = this;
        if (index < 0) {
            index = 0;
        }
        else if (index >= this.children.length) {
            index = this.children.length - 1;
        }
        this.children.splice(index, 0, node);
        return this;
    };
    ActionComposite.prototype.execute = function (container, data, name) {
        if (name) {
            this.find(function (it) { return it.name === name; })
                .execute(container, data);
        }
        else {
            this.trans(function (action) {
                if (action instanceof ActionComposite) {
                    action.working(container, data);
                }
            });
        }
    };
    ActionComposite.prototype.empty = function () {
        return NullAction.NullAction;
    };
    ActionComposite.prototype.working = function (container, data) {
        // do nothing.
    };
    ActionComposite.classAnnations = { "name": "ActionComposite", "params": { "constructor": ["name"], "insert": ["node", "index"], "execute": ["container", "data", "name"], "empty": [], "working": ["container", "data"] } };
    return ActionComposite;
}(components.GComposite));
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

var ArgsIterator = /** @class */ (function () {
    function ArgsIterator(args) {
        this.args = args;
        this.idx = -1;
        this.metadata = null;
    }
    ArgsIterator.prototype.isCompeted = function () {
        return this.idx >= this.args.length;
    };
    ArgsIterator.prototype.end = function () {
        this.idx = this.args.length;
    };
    ArgsIterator.prototype.next = function (express) {
        this.idx++;
        if (this.isCompeted()) {
            return null;
        }
        var arg = this.args[this.idx];
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
    };
    ArgsIterator.prototype.getArgs = function () {
        return this.args;
    };
    ArgsIterator.prototype.getMetadata = function () {
        return this.metadata;
    };
    ArgsIterator.classAnnations = { "name": "ArgsIterator", "params": { "constructor": ["args"], "isCompeted": [], "end": [], "next": ["express"], "getArgs": [], "getMetadata": [] } };
    return ArgsIterator;
}());
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
    var metaName = "@" + name;
    var factory = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var metadata = null;
        if (args.length < 1) {
            return function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                return storeMetadata(name, metaName, args, metadata, metadataExtends);
            };
        }
        metadata = argsToMetadata(args, adapter);
        if (metadata) {
            return function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                return storeMetadata(name, metaName, args, metadata, metadataExtends);
            };
        }
        else {
            if (args.length === 1) {
                if (!utils.isClass(args[0])) {
                    return function () {
                        var args = [];
                        for (var _i = 0; _i < arguments.length; _i++) {
                            args[_i] = arguments[_i];
                        }
                        return storeMetadata(name, metaName, args, metadata, metadataExtends);
                    };
                }
            }
        }
        return storeMetadata(name, metaName, args, metadata, metadataExtends);
    };
    factory.toString = function () { return metaName; };
    factory.decoratorType = DecoratorType_1.DecoratorType.All;
    return factory;
}
exports.createDecorator = createDecorator;
function argsToMetadata(args, adapter) {
    var metadata = null;
    if (args.length) {
        if (adapter) {
            var iterator = new ArgsIterator_1.ArgsIterator(args);
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
    var target;
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
            var propertyKey = args[1];
            setPropertyMetadata(name, metaName, target, propertyKey, metadata, metadataExtends);
            break;
        case 3:
            if (utils.isNumber(args[2])) {
                target = args[0];
                var propertyKey_1 = args[1];
                var parameterIndex = args[2];
                setParamMetadata(name, metaName, target, propertyKey_1, parameterIndex, metadata, metadataExtends);
            }
            else if (utils.isUndefined(args[2])) {
                target = args[0];
                var propertyKey_2 = args[1];
                setPropertyMetadata(name, metaName, target, propertyKey_2, metadata, metadataExtends);
            }
            else {
                target = args[0];
                var propertyKey_3 = args[1];
                var descriptor = args[2];
                setMethodMetadata(name, metaName, target, propertyKey_3, descriptor, metadata, metadataExtends);
                return descriptor;
            }
            break;
        default:
            throw new Error("Invalid @" + name + " Decorator declaration.");
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
    var annotations = Reflect.getOwnMetadata(utils.isFunction(decorator) ? decorator.toString() : decorator, target);
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
    var annotations = Reflect.getOwnMetadata(utils.isFunction(decorator) ? decorator.toString() : decorator, target);
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
    var name = utils.isFunction(decorator) ? decorator.toString() : decorator;
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
    var name = utils.isFunction(decorator) ? decorator.toString() : decorator;
    return Reflect.hasOwnMetadata(name, target);
}
exports.hasOwnClassMetadata = hasOwnClassMetadata;
function setTypeMetadata(name, metaName, target, metadata, metadataExtends) {
    var annotations = getOwnTypeMetadata(metaName, target).slice(0);
    // let designParams = Reflect.getMetadata('design:paramtypes', target) || [];
    var typeMetadata = (metadata || {});
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
var methodMetadataExt = '__method';
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
    var name = utils.isFunction(decorator) ? decorator.toString() : decorator;
    var meta = Reflect.getMetadata(name + methodMetadataExt, target);
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
    var name = utils.isFunction(decorator) ? decorator.toString() : decorator;
    var meta = Reflect.getOwnMetadata(name + methodMetadataExt, target);
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
    var name = utils.isFunction(decorator) ? decorator.toString() : decorator;
    if (propertyKey) {
        var meta = getOwnMethodMetadata(name, target);
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
    var name = utils.isFunction(decorator) ? decorator.toString() : decorator;
    if (propertyKey) {
        var meta = getMethodMetadata(name, target);
        return meta && meta.hasOwnProperty(propertyKey);
    }
    else {
        return Reflect.hasMetadata(name + methodMetadataExt, target);
    }
}
exports.hasMethodMetadata = hasMethodMetadata;
function setMethodMetadata(name, metaName, target, propertyKey, descriptor, metadata, metadataExtends) {
    var meta = utils.lang.assign({}, getOwnMethodMetadata(metaName, target));
    meta[propertyKey] = meta[propertyKey] || [];
    var methodMeadata = (metadata || {});
    methodMeadata.decorator = name;
    methodMeadata.propertyKey = propertyKey;
    // methodMeadata.descriptor = descriptor;
    if (metadataExtends) {
        methodMeadata = metadataExtends(methodMeadata);
    }
    meta[propertyKey].unshift(methodMeadata);
    Reflect.defineMetadata(metaName + methodMetadataExt, meta, target.constructor);
}
var propertyMetadataExt = '__props';
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
    var name = utils.isFunction(decorator) ? decorator.toString() : decorator;
    var meta = Reflect.getMetadata(name + propertyMetadataExt, target);
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
    var name = utils.isFunction(decorator) ? decorator.toString() : decorator;
    var meta = Reflect.getOwnMetadata(name + propertyMetadataExt, target);
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
    var name = utils.isFunction(decorator) ? decorator.toString() : decorator;
    if (propertyKey) {
        var meta = getPropertyMetadata(name, target);
        return meta && meta.hasOwnProperty(propertyKey);
    }
    else {
        return Reflect.hasMetadata(name + propertyMetadataExt, target);
    }
}
exports.hasPropertyMetadata = hasPropertyMetadata;
function setPropertyMetadata(name, metaName, target, propertyKey, metadata, metadataExtends) {
    var meta = utils.lang.assign({}, getOwnPropertyMetadata(metaName, target));
    var propmetadata = (metadata || {});
    propmetadata.propertyKey = propertyKey;
    propmetadata.decorator = name;
    if (!propmetadata.type) {
        var t = Reflect.getMetadata('design:type', target, propertyKey);
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
var paramsMetadataExt = '__params';
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
    var name = utils.isFunction(decorator) ? decorator.toString() : decorator;
    var parameters = Reflect.getMetadata(name + paramsMetadataExt, target, propertyKey);
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
    var name = utils.isFunction(decorator) ? decorator.toString() : decorator;
    var parameters = Reflect.getOwnMetadata(name + paramsMetadataExt, target, propertyKey);
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
    var name = utils.isFunction(decorator) ? decorator.toString() : decorator;
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
    var name = utils.isFunction(decorator) ? decorator.toString() : decorator;
    return Reflect.hasOwnMetadata(name + paramsMetadataExt, target, propertyKey);
}
exports.hasOwnParamMetadata = hasOwnParamMetadata;
function setParamMetadata(name, metaName, target, propertyKey, parameterIndex, metadata, metadataExtends) {
    var parameters = getOwnParamMetadata(metaName, target, propertyKey).slice(0);
    // there might be gaps if some in between parameters do not have annotations.
    // we pad with nulls.
    while (parameters.length <= parameterIndex) {
        parameters.push(null);
    }
    parameters[parameterIndex] = parameters[parameterIndex] || [];
    var paramMeadata = (metadata || {});
    if (!paramMeadata.type) {
        var t = Reflect.getOwnMetadata('design:type', target, propertyKey);
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
    var meta = Reflect.getMetadata(exports.ParamerterName, target);
    if (!meta || utils.isArray(meta) || !utils.lang.hasField(meta)) {
        meta = Reflect.getMetadata(exports.ParamerterName, target.constructor);
    }
    return utils.isArray(meta) ? {} : (meta || {});
}
exports.getParamerterNames = getParamerterNames;
function getOwnParamerterNames(target) {
    var meta = Reflect.getOwnMetadata(exports.ParamerterName, target);
    if (!meta || utils.isArray(meta) || !utils.lang.hasField(meta)) {
        meta = Reflect.getOwnMetadata(exports.ParamerterName, target.constructor);
    }
    return utils.isArray(meta) ? {} : (meta || {});
}
exports.getOwnParamerterNames = getOwnParamerterNames;
function setParamerterNames(target) {
    var meta = utils.lang.assign({}, getParamerterNames(target));
    var descriptors = Object.getOwnPropertyDescriptors(target.prototype);
    var isUglify = /^[a-z]/.test(target.name);
    var anName = '';
    if (target.classAnnations && target.classAnnations.params) {
        anName = target.classAnnations.name;
        meta = utils.lang.assign(meta, target.classAnnations.params);
    }
    if (!isUglify && target.name !== anName) {
        utils.lang.forIn(descriptors, function (item, name) {
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
var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
var ARGUMENT_NAMES = /([^\s,]+)/g;
function getParamNames(func) {
    if (!utils.isFunction(func)) {
        return [];
    }
    var fnStr = func.toString().replace(STRIP_COMMENTS, '');
    var result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
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
    var classAdapter = (function (args) {
        if (adapter) {
            adapter(args);
        }
        args.next({
            // isMetadata: (arg) => isClassMetadata(arg),
            match: function (arg) { return arg && (utils.isSymbol(arg) || utils.isString(arg) || (utils.isObject(arg) && arg instanceof Registration_1.Registration)); },
            setMetadata: function (metadata, arg) {
                metadata.provide = arg;
            }
        });
        args.next({
            match: function (arg) { return utils.isString(arg); },
            setMetadata: function (metadata, arg) {
                metadata.alias = arg;
            }
        });
        args.next({
            match: function (arg) { return utils.isBoolean(arg); },
            setMetadata: function (metadata, arg) {
                metadata.singleton = arg;
            }
        });
        args.next({
            match: function (arg) { return utils.isNumber(arg); },
            setMetadata: function (metadata, arg) {
                metadata.expires = arg;
            }
        });
    });
    var decorator = DecoratorFactory.createDecorator(name, classAdapter, metadataExtends);
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
    var methodAdapter = function (args) {
        if (adapter) {
            adapter(args);
        }
        args.next({
            match: function (arg) { return utils.isArray(arg); },
            setMetadata: function (metadata, arg) {
                metadata.providers = arg;
            }
        });
    };
    var decorator = DecoratorFactory.createDecorator(name, methodAdapter, metadataExtends);
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
    var paramAdapter = (function (args) {
        if (adapter) {
            adapter(args);
        }
        args.next({
            isMetadata: function (arg) { return utils.isParamMetadata(arg); },
            match: function (arg) { return utils.isToken(arg); },
            setMetadata: function (metadata, arg) {
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
    var decorator = DecoratorFactory.createDecorator(name, paramAdapter, metadataExtends);
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
    var propPropAdapter = (function (args) {
        if (adapter) {
            adapter(args);
        }
        args.next({
            isMetadata: function (arg) { return utils.isPropertyMetadata(arg); },
            match: function (arg) { return utils.isToken(arg); },
            setMetadata: function (metadata, arg) {
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
    var decorator = DecoratorFactory.createDecorator(name, propPropAdapter, metadataExtends);
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
    var paramPropAdapter = (function (args) {
        if (adapter) {
            adapter(args);
        }
        args.next({
            isMetadata: function (arg) { return utils.isParamPropMetadata(arg); },
            match: function (arg) { return utils.isToken(arg); },
            setMetadata: function (metadata, arg) {
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
    var decorator = DecoratorFactory.createDecorator(name, paramPropAdapter, metadataExtends);
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
    var decorator = DecoratorFactory.createDecorator(name, adapter, metadataExtends);
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
    var decorator = DecoratorFactory.createDecorator(name, adapter, metadataExtends);
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
    var decorator = DecoratorFactory.createDecorator(name, adapter, metadataExtends);
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
var BindProviderAction = /** @class */ (function (_super) {
    tslib_1.__extends(BindProviderAction, _super);
    function BindProviderAction() {
        return _super.call(this, CoreActions_1.CoreActions.bindProvider) || this;
    }
    BindProviderAction.prototype.working = function (container, data) {
        var type = data.targetType;
        var lifeScope = container.getLifeScope();
        var matchs = lifeScope.getClassDecorators(function (surm) { return surm.actions.includes(CoreActions_1.CoreActions.bindProvider) && factories.hasOwnClassMetadata(surm.name, type); });
        var provides = [];
        var raiseContainer = data.raiseContainer || container;
        matchs.forEach(function (surm) {
            var metadata = factories.getOwnTypeMetadata(surm.name, type);
            if (Array.isArray(metadata) && metadata.length > 0) {
                // bind all provider.
                metadata.forEach(function (c) {
                    if (c && c.provide) {
                        var provideKey = raiseContainer.getTokenKey(c.provide, c.alias);
                        provides.push(provideKey);
                        raiseContainer.bindProvider(provideKey, c.type);
                    }
                });
            }
        });
        data.execResult = provides;
    };
    BindProviderAction.classAnnations = { "name": "BindProviderAction", "params": { "constructor": [], "working": ["container", "data"] } };
    return BindProviderAction;
}(ActionComposite_1.ActionComposite));
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
var BindParameterTypeAction = /** @class */ (function (_super) {
    tslib_1.__extends(BindParameterTypeAction, _super);
    function BindParameterTypeAction() {
        return _super.call(this, CoreActions_1.CoreActions.bindParameterType) || this;
    }
    BindParameterTypeAction.prototype.working = function (container, data) {
        if (data.raiseContainer && data.raiseContainer !== container) {
            return;
        }
        var target = data.target;
        var type = data.targetType;
        var propertyKey = data.propertyKey;
        var lifeScope = container.getLifeScope();
        var designParams;
        if (target && propertyKey) {
            designParams = Reflect.getMetadata('design:paramtypes', target, propertyKey) || [];
        }
        else {
            designParams = Reflect.getMetadata('design:paramtypes', type) || [];
        }
        designParams = designParams.slice(0);
        designParams.forEach(function (dtype) {
            if (lifeScope.isVaildDependence(dtype)) {
                if (!container.has(dtype)) {
                    container.register(dtype);
                }
            }
        });
        var matchs = lifeScope.getParameterDecorators((function (surm) {
            return surm.actions.includes(CoreActions_1.CoreActions.bindParameterType) && ((target || propertyKey !== 'constructor') ? factories.hasParamMetadata(surm.name, target, propertyKey)
                : factories.hasOwnParamMetadata(surm.name, type));
        }));
        matchs.forEach(function (surm) {
            var parameters = (target || propertyKey !== 'constructor') ? factories.getParamMetadata(surm.name, target, propertyKey) : factories.getOwnParamMetadata(surm.name, type);
            if (utils.isArray(parameters) && parameters.length) {
                parameters.forEach(function (params) {
                    var parm = (utils.isArray(params) && params.length > 0) ? params[0] : null;
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
                        var token = parm.provider ? container.getTokenKey(parm.provider, parm.alias) : parm.type;
                        if (token) {
                            designParams[parm.index] = token;
                        }
                    }
                });
            }
        });
        data.execResult = designParams;
    };
    BindParameterTypeAction.classAnnations = { "name": "BindParameterTypeAction", "params": { "constructor": [], "working": ["container", "data"] } };
    return BindParameterTypeAction;
}(ActionComposite_1.ActionComposite));
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
var BindPropertyTypeAction = /** @class */ (function (_super) {
    tslib_1.__extends(BindPropertyTypeAction, _super);
    function BindPropertyTypeAction() {
        return _super.call(this, CoreActions_1.CoreActions.bindPropertyType) || this;
    }
    BindPropertyTypeAction.prototype.working = function (container, data) {
        if (data.raiseContainer && data.raiseContainer !== container) {
            return;
        }
        var type = data.targetType;
        var lifeScope = container.getLifeScope();
        var matchs = lifeScope.getPropertyDecorators(function (surm) { return surm.actions.includes(CoreActions_1.CoreActions.bindPropertyType) && factories.hasPropertyMetadata(surm.name, type); });
        var list = [];
        matchs.forEach(function (surm) {
            var propMetadata = factories.getPropertyMetadata(surm.name, type);
            for (var n in propMetadata) {
                list = list.concat(propMetadata[n]);
            }
            list = list.filter(function (n) { return !!n; });
            list.forEach(function (prop) {
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
    };
    BindPropertyTypeAction.classAnnations = { "name": "BindPropertyTypeAction", "params": { "constructor": [], "working": ["container", "data"] } };
    return BindPropertyTypeAction;
}(ActionComposite_1.ActionComposite));
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
var InjectPropertyAction = /** @class */ (function (_super) {
    tslib_1.__extends(InjectPropertyAction, _super);
    function InjectPropertyAction() {
        return _super.call(this, CoreActions_1.CoreActions.injectProperty) || this;
    }
    InjectPropertyAction.prototype.working = function (container, data) {
        if (!data.execResult) {
            this.parent.find(function (act) { return act.name === CoreActions_1.CoreActions.bindPropertyType; }).execute(container, data);
        }
        if (data.target && data.execResult && data.execResult.length) {
            var providerMap_1 = data.providerMap;
            data.execResult.reverse().forEach(function (prop, idx) {
                if (prop) {
                    var token = prop.provider ? container.getToken(prop.provider, prop.alias) : prop.type;
                    if (providerMap_1 && providerMap_1.has(token)) {
                        data.target[prop.propertyKey] = providerMap_1.resolve(token, providerMap_1);
                    }
                    else if (container.has(token)) {
                        data.target[prop.propertyKey] = container.resolve(token, providerMap_1);
                    }
                }
            });
        }
    };
    InjectPropertyAction.classAnnations = { "name": "InjectPropertyAction", "params": { "constructor": [], "working": ["container", "data"] } };
    return InjectPropertyAction;
}(ActionComposite_1.ActionComposite));
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
var BindParameterProviderAction = /** @class */ (function (_super) {
    tslib_1.__extends(BindParameterProviderAction, _super);
    function BindParameterProviderAction() {
        return _super.call(this, CoreActions_1.CoreActions.bindParameterProviders) || this;
    }
    BindParameterProviderAction.prototype.working = function (container, data) {
        if (data.raiseContainer && data.raiseContainer !== container) {
            return;
        }
        var type = data.targetType;
        var propertyKey = data.propertyKey;
        var lifeScope = container.getLifeScope();
        var matchs = lifeScope.getMethodDecorators(function (surm) { return surm.actions.includes(CoreActions_1.CoreActions.bindParameterProviders) && factories.hasOwnMethodMetadata(surm.name, type); });
        var providers = [];
        matchs.forEach(function (surm) {
            var methodmtas = factories.getOwnMethodMetadata(surm.name, type);
            var metadatas = methodmtas[propertyKey];
            if (metadatas && utils.isArray(metadatas) && metadatas.length > 0) {
                metadatas.forEach(function (meta) {
                    if (meta.providers && meta.providers.length > 0) {
                        providers = providers.concat(meta.providers);
                    }
                });
            }
        });
        data.execResult = providers;
    };
    BindParameterProviderAction.classAnnations = { "name": "BindParameterProviderAction", "params": { "constructor": [], "working": ["container", "data"] } };
    return BindParameterProviderAction;
}(ActionComposite_1.ActionComposite));
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
var ComponentBeforeInitAction = /** @class */ (function (_super) {
    tslib_1.__extends(ComponentBeforeInitAction, _super);
    function ComponentBeforeInitAction() {
        return _super.call(this, CoreActions_1.CoreActions.componentBeforeInit) || this;
    }
    ComponentBeforeInitAction.prototype.working = function (container, data) {
        if (data.raiseContainer && data.raiseContainer !== container) {
            return;
        }
        if (data.targetType && data.target) {
            var component = data.target;
            if (utils.isFunction(component.beforeInit)) {
                container.syncInvoke(data.targetType, 'beforeInit', data.target);
            }
        }
    };
    ComponentBeforeInitAction.classAnnations = { "name": "ComponentBeforeInitAction", "params": { "constructor": [], "working": ["container", "data"] } };
    return ComponentBeforeInitAction;
}(ActionComposite_1.ActionComposite));
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
var ComponentInitAction = /** @class */ (function (_super) {
    tslib_1.__extends(ComponentInitAction, _super);
    function ComponentInitAction() {
        return _super.call(this, CoreActions_1.CoreActions.componentInit) || this;
    }
    ComponentInitAction.prototype.working = function (container, data) {
        if (data.raiseContainer && data.raiseContainer !== container) {
            return;
        }
        if (data.targetType && data.target) {
            var component = data.target;
            if (utils.isFunction(component.onInit)) {
                container.syncInvoke(data.targetType, 'onInit', data.target);
            }
        }
    };
    ComponentInitAction.classAnnations = { "name": "ComponentInitAction", "params": { "constructor": [], "working": ["container", "data"] } };
    return ComponentInitAction;
}(ActionComposite_1.ActionComposite));
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
var ComponentAfterInitAction = /** @class */ (function (_super) {
    tslib_1.__extends(ComponentAfterInitAction, _super);
    function ComponentAfterInitAction() {
        return _super.call(this, CoreActions_1.CoreActions.componentAfterInit) || this;
    }
    ComponentAfterInitAction.prototype.working = function (container, data) {
        if (data.raiseContainer && data.raiseContainer !== container) {
            return;
        }
        if (data.targetType && data.target) {
            var component = data.target;
            if (utils.isFunction(component.afterInit)) {
                container.syncInvoke(data.targetType, 'afterInit', data.target);
            }
        }
    };
    ComponentAfterInitAction.classAnnations = { "name": "ComponentAfterInitAction", "params": { "constructor": [], "working": ["container", "data"] } };
    return ComponentAfterInitAction;
}(ActionComposite_1.ActionComposite));
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
var CacheAction = /** @class */ (function (_super) {
    tslib_1.__extends(CacheAction, _super);
    function CacheAction() {
        return _super.call(this, CoreActions_1.CoreActions.cache) || this;
    }
    CacheAction.prototype.working = function (container, data) {
        if (data.raiseContainer && data.raiseContainer !== container) {
            return data;
        }
        if (data.singleton || !data.targetType || !utils.isClass(data.targetType)) {
            return data;
        }
        var cacheManager = container.get(ICacheManager.CacheManagerToken);
        if (data.target) {
            if (!cacheManager.hasCache(data.targetType)) {
                var cacheMetadata = this.getCacheMetadata(container, data);
                if (cacheMetadata) {
                    cacheManager.cache(data.targetType, data.target, cacheMetadata.expires);
                }
            }
        }
        else {
            var target = cacheManager.get(data.targetType);
            if (target) {
                var cacheMetadata = this.getCacheMetadata(container, data);
                if (cacheMetadata) {
                    cacheManager.cache(data.targetType, target, cacheMetadata.expires);
                    data.execResult = target;
                }
            }
        }
        return data;
    };
    CacheAction.prototype.getCacheMetadata = function (container, data) {
        var lifeScope = container.getLifeScope();
        var matchs = lifeScope.getClassDecorators(function (surm) { return factories.hasOwnClassMetadata(surm.name, data.targetType); });
        var cacheMetadata;
        for (var i = 0; i < matchs.length; i++) {
            var surm = matchs[i];
            var metadata = factories.getOwnTypeMetadata(surm.name, data.targetType);
            if (Array.isArray(metadata) && metadata.length > 0) {
                cacheMetadata = metadata.find(function (c) { return c && utils.isNumber(c.expires) && c.expires > 0; });
                if (cacheMetadata) {
                    break;
                }
            }
        }
        return cacheMetadata;
    };
    CacheAction.classAnnations = { "name": "CacheAction", "params": { "constructor": [], "working": ["container", "data"], "getCacheMetadata": ["container", "data"] } };
    return CacheAction;
}(ActionComposite_1.ActionComposite));
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
var SingletionAction = /** @class */ (function (_super) {
    tslib_1.__extends(SingletionAction, _super);
    function SingletionAction() {
        return _super.call(this, CoreActions_1.CoreActions.singletion) || this;
    }
    SingletionAction.prototype.working = function (container, data) {
        if (data.raiseContainer && data.raiseContainer !== container) {
            return;
        }
        if (data.tokenKey && data.target && data.singleton) {
            container.registerValue(data.tokenKey, data.target);
        }
    };
    SingletionAction.classAnnations = { "name": "SingletionAction", "params": { "constructor": [], "working": ["container", "data"] } };
    return SingletionAction;
}(ActionComposite_1.ActionComposite));
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
exports.Singleton = factories.createClassDecorator('Singleton', null, function (metadata) {
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
exports.Autorun = factories.createClassMethodDecorator('Autorun', function (args) {
    args.next({
        isMetadata: function (arg) { return utils.isClassMetadata(arg, ['autorun']); },
        match: function (arg) { return utils.isString(arg) || utils.isNumber(arg); },
        setMetadata: function (metadata, arg) {
            if (utils.isString(arg)) {
                metadata.autorun = arg;
            }
            else {
                metadata.order = arg;
            }
        }
    });
}, function (metadata) {
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
exports.IocExt = factories.createClassDecorator('IocExt', function (args) {
    args.next({
        isMetadata: function (arg) { return utils.isClassMetadata(arg, ['autorun']); },
        match: function (arg) { return utils.isString(arg); },
        setMetadata: function (metadata, arg) {
            metadata.autorun = arg;
        }
    });
}, function (metadata) {
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
var AutorunAction = /** @class */ (function (_super) {
    tslib_1.__extends(AutorunAction, _super);
    function AutorunAction() {
        return _super.call(this, CoreActions_1.CoreActions.autorun) || this;
    }
    AutorunAction.prototype.getDecorator = function () {
        return [decorators.IocExt, decorators.Autorun];
    };
    AutorunAction.prototype.working = function (container, data) {
        if (data.raiseContainer && data.raiseContainer !== container) {
            return;
        }
        if (data.tokenKey && data.targetType) {
            var decorators$$1 = this.getDecorator();
            decorators$$1.forEach(function (decorator) {
                if (factories.hasClassMetadata(decorator, data.targetType)) {
                    var metas = factories.getTypeMetadata(decorator, data.targetType);
                    var meta = metas.find(function (it) { return !!it.autorun; });
                    if (!meta && metas.length) {
                        meta = metas[0];
                    }
                    if (meta) {
                        var instance = container.get(data.tokenKey);
                        if (instance && meta.autorun && utils.isFunction(instance[meta.autorun])) {
                            container.syncInvoke(data.tokenKey, meta.autorun, instance);
                        }
                    }
                }
            });
        }
    };
    AutorunAction.classAnnations = { "name": "AutorunAction", "params": { "constructor": [], "getDecorator": [], "working": ["container", "data"] } };
    return AutorunAction;
}(ActionComposite_1.ActionComposite));
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
var ProviderMap = /** @class */ (function () {
    function ProviderMap(container) {
        this.container = container;
        this.maps = new utils.MapSet();
    }
    ProviderMap.prototype.has = function (provide) {
        return this.maps.has(provide);
    };
    ProviderMap.prototype.get = function (provide) {
        return this.maps.get(provide);
    };
    ProviderMap.prototype.add = function (provide, provider) {
        var _this = this;
        if (utils.isUndefined(provide)) {
            return this;
        }
        var factory;
        if (utils.isToken(provider) && this.container.has(provider)) {
            factory = function () {
                var providers = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    providers[_i] = arguments[_i];
                }
                var _a;
                return (_a = _this.container).resolve.apply(_a, [provider].concat(providers));
            };
        }
        else {
            if (utils.isFunction(provider)) {
                factory = function () {
                    var providers = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        providers[_i] = arguments[_i];
                    }
                    return provider.apply(void 0, [_this.container].concat(providers));
                };
            }
            else {
                factory = function () {
                    return provider;
                };
            }
        }
        this.maps.set(provide, factory);
        return this;
    };
    ProviderMap.prototype.remove = function (provide) {
        if (this.maps.has(provide)) {
            this.maps.delete(provide);
        }
        return this;
    };
    ProviderMap.prototype.resolve = function (provide) {
        var providers = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            providers[_i - 1] = arguments[_i];
        }
        var _a, _b;
        if (!this.maps.has(provide)) {
            return (!utils.isNumber(provide) && this.container.has(provide)) ? (_a = this.container).resolve.apply(_a, [provide].concat(providers)) : null;
        }
        var provider = this.maps.get(provide);
        return utils.isToken(provider) ? (_b = this.container).resolve.apply(_b, [provider].concat(providers)) : provider.apply(void 0, providers);
    };
    ProviderMap.prototype.forEach = function (express) {
        this.maps.forEach(express);
    };
    ProviderMap.prototype.copy = function (map) {
        var _this = this;
        if (!map) {
            return;
        }
        map.forEach(function (val, token) {
            _this.maps.set(token, val);
        });
    };
    ProviderMap.classAnnations = { "name": "ProviderMap", "params": { "constructor": ["container"], "has": ["provide"], "get": ["provide"], "add": ["provide", "provider"], "remove": ["provide"], "resolve": ["provide", "providers"], "forEach": ["express"], "copy": ["map"] } };
    return ProviderMap;
}());
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
var Provider = /** @class */ (function () {
    function Provider(type, value) {
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
    Provider.prototype.resolve = function (container) {
        var providers = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            providers[_i - 1] = arguments[_i];
        }
        if (utils.isUndefined(this.value)) {
            return container.has(this.type) ? container.resolve.apply(container, [this.type].concat(providers)) : null;
        }
        else {
            return this.value; // isFunction(this.value) ? this.value(container) : this.value;
        }
    };
    /**
     * create provider.
     *
     * @static
     * @param {Token<any>} type
     * @param {(any)} value
     * @returns Provider
     * @memberof Provider
     */
    Provider.create = function (type, value) {
        return new Provider(type, value);
    };
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
    Provider.createExtends = function (token, value, extendsTarget) {
        return new ExtendsProvider(token, value, extendsTarget);
    };
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
    Provider.createInvoke = function (token, method, value) {
        return new InvokeProvider(token, method, value);
    };
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
    Provider.createParam = function (token, value, index, method) {
        return new ParamProvider(token, value, index, method);
    };
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
    return Provider;
}());
exports.Provider = Provider;
/**
 * InvokeProvider
 *
 * @export
 * @class InvokeProvider
 * @extends {Provider}
 */
var InvokeProvider = /** @class */ (function (_super) {
    tslib_1.__extends(InvokeProvider, _super);
    function InvokeProvider(type, method, value) {
        var _this = _super.call(this, type, value) || this;
        _this.method = method;
        return _this;
    }
    InvokeProvider.prototype.resolve = function (container) {
        var providers = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            providers[_i - 1] = arguments[_i];
        }
        if (this.method) {
            return container.syncInvoke.apply(container, [this.type, this.method].concat(providers));
        }
        return _super.prototype.resolve.apply(this, [container].concat(providers));
    };
    InvokeProvider.classAnnations = { "name": "InvokeProvider", "params": { "constructor": ["type", "method", "value"], "resolve": ["container", "providers"] } };
    return InvokeProvider;
}(Provider));
exports.InvokeProvider = InvokeProvider;
/**
 * param provider.
 *
 * @export
 * @interface ParamProvider
 */
var ParamProvider = /** @class */ (function (_super) {
    tslib_1.__extends(ParamProvider, _super);
    function ParamProvider(token, value, index, method) {
        var _this = _super.call(this, token, method, value) || this;
        _this.index = index;
        return _this;
    }
    ParamProvider.prototype.resolve = function (container) {
        var providers = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            providers[_i - 1] = arguments[_i];
        }
        return _super.prototype.resolve.apply(this, [container].concat(providers));
    };
    ParamProvider.classAnnations = { "name": "ParamProvider", "params": { "constructor": ["token", "value", "index", "method"], "resolve": ["container", "providers"] } };
    return ParamProvider;
}(InvokeProvider));
exports.ParamProvider = ParamProvider;
/**
 * Provider enable exntends target with provider in dynamic.
 *
 * @export
 * @class ExtendsProvider
 * @extends {Provider}
 */
var ExtendsProvider = /** @class */ (function (_super) {
    tslib_1.__extends(ExtendsProvider, _super);
    function ExtendsProvider(token, value, extendsTarget) {
        var _this = _super.call(this, token, value) || this;
        _this.extendsTarget = extendsTarget;
        return _this;
    }
    ExtendsProvider.prototype.resolve = function (container) {
        var providers = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            providers[_i - 1] = arguments[_i];
        }
        return _super.prototype.resolve.apply(this, [container].concat(providers));
    };
    ExtendsProvider.prototype.extends = function (target) {
        if (utils.isObject(target) && utils.isFunction(this.extendsTarget)) {
            this.extendsTarget(target, this);
        }
    };
    ExtendsProvider.classAnnations = { "name": "ExtendsProvider", "params": { "constructor": ["token", "value", "extendsTarget"], "resolve": ["container", "providers"], "extends": ["target"] } };
    return ExtendsProvider;
}(Provider));
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
var MethodAutorun = /** @class */ (function (_super) {
    tslib_1.__extends(MethodAutorun, _super);
    function MethodAutorun() {
        return _super.call(this, CoreActions_1.CoreActions.methodAutorun) || this;
    }
    MethodAutorun.prototype.working = function (container, data) {
        if (data.raiseContainer && data.raiseContainer !== container) {
            return;
        }
        if (data.target && data.targetType) {
            if (factories.hasMethodMetadata(decorators.Autorun, data.targetType)) {
                var metas = factories.getMethodMetadata(decorators.Autorun, data.targetType);
                var lastmetas_1 = [];
                var idx_1 = utils.lang.keys(metas).length;
                utils.lang.forIn(metas, function (mm, key) {
                    if (mm && mm.length) {
                        var m = mm[0];
                        m.autorun = key;
                        idx_1++;
                        if (!utils.isNumber(m.order)) {
                            m.order = idx_1;
                        }
                        lastmetas_1.push(m);
                    }
                });
                lastmetas_1.sort(function (au1, au2) {
                    return au1.order - au1.order;
                }).forEach(function (aut) {
                    container.syncInvoke(data.targetType, aut.autorun, data.target);
                });
            }
        }
    };
    MethodAutorun.classAnnations = { "name": "MethodAutorun", "params": { "constructor": [], "working": ["container", "data"] } };
    return MethodAutorun;
}(ActionComposite_1.ActionComposite));
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
var ActionFactory = /** @class */ (function () {
    function ActionFactory() {
    }
    /**
     * create action by action type. type in 'CoreActions'
     *
     * @param {string} type
     * @returns {ActionComponent}
     * @memberof ActionFactory
     */
    ActionFactory.prototype.create = function (type) {
        var action;
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
    };
    ActionFactory.classAnnations = { "name": "ActionFactory", "params": { "create": ["type"] } };
    return ActionFactory;
}());
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
var DefaultLifeScope = /** @class */ (function () {
    function DefaultLifeScope(container) {
        this.container = container;
        this.decorators = [];
        this.buildAction();
    }
    DefaultLifeScope.prototype.addAction = function (action) {
        var nodepaths = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            nodepaths[_i - 1] = arguments[_i];
        }
        var parent = this.action;
        nodepaths.forEach(function (pathname) {
            parent = parent.find(function (act) { return act.name === pathname; });
        });
        if (parent) {
            parent.add(action);
        }
        return this;
    };
    DefaultLifeScope.prototype.registerDecorator = function (decorator) {
        var actions$$2 = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            actions$$2[_i - 1] = arguments[_i];
        }
        var type = this.getDecoratorType(decorator);
        return this.registerCustomDecorator.apply(this, [decorator, type].concat(actions$$2));
    };
    DefaultLifeScope.prototype.registerCustomDecorator = function (decorator, type) {
        var actions$$2 = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            actions$$2[_i - 2] = arguments[_i];
        }
        var types$$2 = this.toActionName(type);
        var name = decorator.toString();
        if (!this.decorators.some(function (d) { return d.name === name; })) {
            this.decorators.push({
                name: name,
                types: types$$2,
                actions: actions$$2
            });
        }
        return this;
    };
    DefaultLifeScope.prototype.execute = function (data) {
        var names = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            names[_i - 1] = arguments[_i];
        }
        names = names.filter(function (n) { return !!n; });
        var act = this.action;
        names.forEach(function (name) {
            act = act.find(function (itm) { return itm.name === name; });
        });
        if (act) {
            act.execute(this.container, data);
        }
    };
    DefaultLifeScope.prototype.routeExecute = function (data) {
        var names = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            names[_i - 1] = arguments[_i];
        }
        var _a;
        this.execute.apply(this, [data].concat(names));
        var container = this.container.parent;
        while (container) {
            (_a = container.getLifeScope()).execute.apply(_a, [utils.lang.assign({}, data)].concat(names));
            container = container.parent;
        }
    };
    DefaultLifeScope.prototype.getClassDecorators = function (match) {
        return this.getTypeDecorators(this.toActionName(factories.DecoratorType.Class), match);
    };
    DefaultLifeScope.prototype.getMethodDecorators = function (match) {
        return this.getTypeDecorators(this.toActionName(factories.DecoratorType.Method), match);
    };
    DefaultLifeScope.prototype.getPropertyDecorators = function (match) {
        return this.getTypeDecorators(this.toActionName(factories.DecoratorType.Property), match);
    };
    DefaultLifeScope.prototype.getParameterDecorators = function (match) {
        return this.getTypeDecorators(this.toActionName(factories.DecoratorType.Parameter), match);
    };
    DefaultLifeScope.prototype.getDecoratorType = function (decirator) {
        return decirator.decoratorType || factories.DecoratorType.All;
    };
    /**
     * is vaildate dependence type or not. dependence type must with class decorator.
     *
     * @template T
     * @param {Type<T>} target
     * @returns {boolean}
     * @memberof Container
     */
    DefaultLifeScope.prototype.isVaildDependence = function (target) {
        if (!target) {
            return false;
        }
        if (!utils.isClass(target)) {
            return false;
        }
        if (utils.isAbstractDecoratorClass(target)) {
            return false;
        }
        return this.getClassDecorators().some(function (act) { return factories.hasOwnClassMetadata(act.name, target); });
    };
    DefaultLifeScope.prototype.getAtionByName = function (name) {
        return this.action.find(function (action) { return action.name === name; });
    };
    DefaultLifeScope.prototype.getClassAction = function () {
        return this.getAtionByName(this.toActionName(factories.DecoratorType.Class));
    };
    DefaultLifeScope.prototype.getMethodAction = function () {
        return this.getAtionByName(this.toActionName(factories.DecoratorType.Method));
    };
    DefaultLifeScope.prototype.getPropertyAction = function () {
        return this.getAtionByName(this.toActionName(factories.DecoratorType.Property));
    };
    DefaultLifeScope.prototype.getParameterAction = function () {
        return this.getAtionByName(this.toActionName(factories.DecoratorType.Parameter));
    };
    /**
     * get constructor parameters metadata.
     *
     * @template T
     * @param {Type<T>} type
     * @returns {IParameter[]}
     * @memberof IContainer
     */
    DefaultLifeScope.prototype.getConstructorParameters = function (type) {
        return this.getParameters(type);
    };
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
    DefaultLifeScope.prototype.getMethodParameters = function (type, instance, propertyKey) {
        return this.getParameters(type, instance, propertyKey);
    };
    /**
     * get paramerter names.
     *
     * @template T
     * @param {Type<T>} type
     * @param {string} propertyKey
     * @returns {string[]}
     * @memberof DefaultLifeScope
     */
    DefaultLifeScope.prototype.getParamerterNames = function (type, propertyKey) {
        var metadata = factories.getOwnParamerterNames(type);
        var paramNames = [];
        if (metadata && metadata.hasOwnProperty(propertyKey)) {
            paramNames = metadata[propertyKey];
        }
        if (!utils.isArray(paramNames)) {
            paramNames = [];
        }
        return paramNames;
    };
    DefaultLifeScope.prototype.isSingletonType = function (type) {
        if (factories.hasOwnClassMetadata(decorators.Singleton, type)) {
            return true;
        }
        return this.getClassDecorators().some(function (surm) {
            var metadatas = factories.getOwnTypeMetadata(surm.name, type) || [];
            if (utils.isArray(metadatas)) {
                return metadatas.some(function (m) { return m.singleton === true; });
            }
            return false;
        });
    };
    DefaultLifeScope.prototype.getMethodMetadatas = function (type, propertyKey) {
        var metadatas = [];
        this.getMethodDecorators().forEach(function (dec) {
            var metas = factories.getOwnMethodMetadata(dec.name, type);
            if (metas.hasOwnProperty(propertyKey)) {
                metadatas = metadatas.concat(metas[propertyKey] || []);
            }
        });
        return metadatas;
    };
    DefaultLifeScope.prototype.filerDecorators = function (express) {
        return this.decorators.filter(express);
    };
    DefaultLifeScope.prototype.getParameters = function (type, instance, propertyKey) {
        propertyKey = propertyKey || 'constructor';
        var data = {
            target: instance,
            targetType: type,
            propertyKey: propertyKey
        };
        this.execute(data, actions.LifeState.onInit, actions.CoreActions.bindParameterType);
        var paramNames = this.getParamerterNames(type, propertyKey);
        if (data.execResult.length) {
            return data.execResult.map(function (typ, idx) {
                return {
                    type: typ,
                    name: paramNames[idx]
                };
            });
        }
        else {
            return paramNames.map(function (name) {
                return {
                    name: name,
                    type: undefined
                };
            });
        }
    };
    DefaultLifeScope.prototype.getTypeDecorators = function (decType, match) {
        return this.filerDecorators(function (value) {
            var flag = (value.types || '').indexOf(decType) >= 0;
            if (flag && match) {
                flag = match(value);
            }
            return flag;
        });
    };
    DefaultLifeScope.prototype.buildAction = function () {
        var factory = new ActionFactory_1.ActionFactory();
        var action = factory.create('');
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
    };
    DefaultLifeScope.prototype.toActionName = function (type) {
        var types$$2 = [];
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
    };
    DefaultLifeScope.classAnnations = { "name": "DefaultLifeScope", "params": { "constructor": ["container"], "addAction": ["action", "nodepaths"], "registerDecorator": ["decorator", "actions"], "registerCustomDecorator": ["decorator", "type", "actions"], "execute": ["data", "names"], "routeExecute": ["data", "names"], "getClassDecorators": ["match"], "getMethodDecorators": ["match"], "getPropertyDecorators": ["match"], "getParameterDecorators": ["match"], "getDecoratorType": ["decirator"], "isVaildDependence": ["target"], "getAtionByName": ["name"], "getClassAction": [], "getMethodAction": [], "getPropertyAction": [], "getParameterAction": [], "getConstructorParameters": ["type"], "getMethodParameters": ["type", "instance", "propertyKey"], "getParamerterNames": ["type", "propertyKey"], "isSingletonType": ["type"], "getMethodMetadatas": ["type", "propertyKey"], "filerDecorators": ["express"], "getParameters": ["type", "instance", "propertyKey"], "getTypeDecorators": ["decType", "match"], "buildAction": [], "toActionName": ["type"] } };
    return DefaultLifeScope;
}());
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
var ProviderMatcher = /** @class */ (function () {
    function ProviderMatcher(container) {
        this.container = container;
    }
    ProviderMatcher.prototype.toProviderMap = function () {
        var _this = this;
        var providers$$1 = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            providers$$1[_i] = arguments[_i];
        }
        if (providers$$1.length === 1 && providers.isProviderMap(providers$$1[0])) {
            return providers$$1[0];
        }
        var map = this.container.resolve(providers.ProviderMapToken);
        providers$$1.forEach(function (p, index) {
            if (utils.isUndefined(p) || utils.isNull(p)) {
                return;
            }
            if (providers.isProviderMap(p)) {
                map.copy(p);
            }
            else if (p instanceof providers.Provider) {
                if (p instanceof providers.ParamProvider) {
                    if (!p.type && utils.isNumber(p.index)) {
                        map.add(p.index, function () {
                            var providers$$1 = [];
                            for (var _i = 0; _i < arguments.length; _i++) {
                                providers$$1[_i] = arguments[_i];
                            }
                            return p.resolve.apply(p, [_this.container].concat(providers$$1));
                        });
                    }
                    else {
                        map.add(p.type, function () {
                            var providers$$1 = [];
                            for (var _i = 0; _i < arguments.length; _i++) {
                                providers$$1[_i] = arguments[_i];
                            }
                            return p.resolve.apply(p, [_this.container].concat(providers$$1));
                        });
                    }
                }
                else {
                    map.add(p.type, function () {
                        var providers$$1 = [];
                        for (var _i = 0; _i < arguments.length; _i++) {
                            providers$$1[_i] = arguments[_i];
                        }
                        return p.resolve.apply(p, [_this.container].concat(providers$$1));
                    });
                }
            }
            else if (utils.isClass(p)) {
                if (!_this.container.has(p)) {
                    _this.container.register(p);
                }
                map.add(p, p);
            }
            else if (utils.isBaseObject(p)) {
                var pr_1 = p;
                var isobjMap = false;
                if (utils.isToken(pr_1.provide)) {
                    if (utils.isArray(pr_1.deps) && pr_1.deps.length) {
                        pr_1.deps.forEach(function (d) {
                            if (utils.isClass(d) && !_this.container.has(d)) {
                                _this.container.register(d);
                            }
                        });
                    }
                    if (!utils.isUndefined(pr_1.useValue)) {
                        map.add(pr_1.provide, function () { return pr_1.useValue; });
                    }
                    else if (utils.isClass(pr_1.useClass)) {
                        if (!_this.container.has(pr_1.useClass)) {
                            _this.container.register(pr_1.useClass);
                        }
                        map.add(pr_1.provide, pr_1.useClass);
                    }
                    else if (utils.isFunction(pr_1.useFactory)) {
                        map.add(pr_1.provide, function () {
                            var args = [];
                            if (utils.isArray(pr_1.deps) && pr_1.deps.length) {
                                args = pr_1.deps.map(function (d) {
                                    if (utils.isClass(d)) {
                                        return _this.container.get(d);
                                    }
                                    else {
                                        return d;
                                    }
                                });
                            }
                            return pr_1.useFactory.apply(pr_1, args);
                        });
                    }
                    else if (utils.isToken(pr_1.useExisting)) {
                        if (_this.container.has(pr_1.useExisting)) {
                            map.add(pr_1.provide, function () { return _this.container.resolve(pr_1.useExisting); });
                        }
                        else {
                            console.log('has not register:', pr_1.useExisting);
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
                    utils.lang.forIn(p, function (val, name) {
                        if (!utils.isUndefined(val)) {
                            if (utils.isClass(val)) {
                                map.add(name, val);
                            }
                            else if (utils.isFunction(val) || utils.isString(val)) {
                                map.add(name, function () { return val; });
                            }
                            else {
                                map.add(name, val);
                            }
                        }
                    });
                }
            }
            else if (utils.isFunction(p)) {
                map.add(name, function () { return p; });
            }
            else {
                map.add(index, p);
            }
        });
        return map;
    };
    ProviderMatcher.prototype.matchProviders = function (params) {
        var providers$$1 = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            providers$$1[_i - 1] = arguments[_i];
        }
        return this.match(params, this.toProviderMap.apply(this, providers$$1));
    };
    ProviderMatcher.prototype.match = function (params, providers$$1) {
        var _this = this;
        var map = this.container.resolve(providers.ProviderMapToken);
        if (!params.length) {
            return map;
        }
        params.forEach(function (param, index) {
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
                else if (_this.container.has(param.type)) {
                    map.add(param.name, param.type);
                }
            }
            else if (providers$$1.has(index)) {
                map.add(param.name, providers$$1.get(index));
            }
        });
        return map;
    };
    ProviderMatcher.classAnnations = { "name": "ProviderMatcher", "params": { "constructor": ["container"], "toProviderMap": ["providers"], "matchProviders": ["params", "providers"], "match": ["params", "providers"] } };
    return ProviderMatcher;
}());
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
var MethodAccessor = /** @class */ (function () {
    function MethodAccessor(container) {
        this.container = container;
    }
    MethodAccessor.prototype.getMatcher = function () {
        return this.container.get(IProviderMatcher.ProviderMatcherToken);
    };
    MethodAccessor.prototype.invoke = function (token, propertyKey, target) {
        var providers = [];
        for (var _i = 3; _i < arguments.length; _i++) {
            providers[_i - 3] = arguments[_i];
        }
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var _a, targetClass, actionData, lifeScope, parameters, paramInstances;
            return tslib_1.__generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!target) {
                            target = (_a = this.container).resolve.apply(_a, [token].concat(providers));
                        }
                        targetClass = this.container.getTokenImpl(token);
                        if (!targetClass) {
                            throw Error(token.toString() + ' is not implements by any class.');
                        }
                        if (!(target && utils.isFunction(target[propertyKey]))) return [3 /*break*/, 2];
                        actionData = {
                            target: target,
                            targetType: targetClass,
                            propertyKey: propertyKey,
                        };
                        lifeScope = this.container.getLifeScope();
                        lifeScope.execute(actionData, actions.LifeState.onInit, actions.CoreActions.bindParameterProviders);
                        providers = providers.concat(actionData.execResult);
                        parameters = lifeScope.getMethodParameters(targetClass, target, propertyKey);
                        return [4 /*yield*/, this.createParams.apply(this, [parameters].concat(providers))];
                    case 1:
                        paramInstances = _b.sent();
                        return [2 /*return*/, target[propertyKey].apply(target, paramInstances)];
                    case 2: throw new Error("type: " + targetClass + " has no method " + propertyKey.toString() + ".");
                }
            });
        });
    };
    MethodAccessor.prototype.syncInvoke = function (token, propertyKey, target) {
        var providers = [];
        for (var _i = 3; _i < arguments.length; _i++) {
            providers[_i - 3] = arguments[_i];
        }
        var _a;
        if (!target) {
            target = (_a = this.container).resolve.apply(_a, [token].concat(providers));
        }
        var targetClass = this.container.getTokenImpl(token);
        if (!targetClass) {
            throw Error(token.toString() + ' is not implements by any class.');
        }
        if (target && utils.isFunction(target[propertyKey])) {
            var actionData = {
                target: target,
                targetType: targetClass,
                propertyKey: propertyKey,
            };
            var lifeScope = this.container.getLifeScope();
            lifeScope.execute(actionData, actions.LifeState.onInit, actions.CoreActions.bindParameterProviders);
            providers = providers.concat(actionData.execResult);
            var parameters = lifeScope.getMethodParameters(targetClass, target, propertyKey);
            var paramInstances = this.createSyncParams.apply(this, [parameters].concat(providers));
            return target[propertyKey].apply(target, paramInstances);
        }
        else {
            throw new Error("type: " + targetClass + " has no method " + propertyKey.toString() + ".");
        }
    };
    MethodAccessor.prototype.createSyncParams = function (params) {
        var _this = this;
        var providers = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            providers[_i - 1] = arguments[_i];
        }
        var _a;
        var providerMap = (_a = this.getMatcher()).matchProviders.apply(_a, [params].concat(providers));
        return params.map(function (param, index) {
            var _a;
            if (param.name && providerMap.has(param.name)) {
                return providerMap.resolve(param.name);
            }
            else if (utils.isToken(param.type)) {
                return (_a = _this.container).resolve.apply(_a, [param.type].concat(providers));
            }
            else {
                return undefined;
            }
        });
    };
    MethodAccessor.prototype.createParams = function (params) {
        var _this = this;
        var providers = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            providers[_i - 1] = arguments[_i];
        }
        var _a;
        var providerMap = (_a = this.getMatcher()).matchProviders.apply(_a, [params].concat(providers));
        return Promise.all(params.map(function (param, index) {
            var _a;
            if (param.name && providerMap.has(param.name)) {
                return providerMap.resolve(param.name);
            }
            else if (utils.isToken(param.type)) {
                return (_a = _this.container).resolve.apply(_a, [param.type].concat(providers));
            }
            else {
                return undefined;
            }
        }));
    };
    MethodAccessor.classAnnations = { "name": "MethodAccessor", "params": { "constructor": ["container"], "getMatcher": [], "invoke": ["token", "propertyKey", "target", "providers"], "syncInvoke": ["token", "propertyKey", "target", "providers"], "createSyncParams": ["params", "providers"], "createParams": ["params", "providers"] } };
    return MethodAccessor;
}());
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
var CacheManager = /** @class */ (function () {
    function CacheManager(container) {
        this.container = container;
        this.cacheTokens = new utils.MapSet();
    }
    CacheManager.prototype.isChecking = function () {
        return !!this.timeout;
    };
    CacheManager.prototype.hasCache = function (targetType) {
        return this.cacheTokens.has(targetType);
    };
    CacheManager.prototype.cache = function (targetType, target, expires) {
        var cache;
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
    };
    CacheManager.prototype.get = function (targetType, expires) {
        var result = null;
        if (!this.cacheTokens.has(targetType)) {
            return null;
        }
        var cache = this.cacheTokens.get(targetType);
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
    };
    CacheManager.prototype.checkExpires = function () {
        var _this = this;
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = 0;
        }
        if (this.cacheTokens.size > 0) {
            var timeoutCaches_1 = [];
            this.cacheTokens.forEach(function (cache, targetType) {
                if (cache.expires >= Date.now()) {
                    timeoutCaches_1.push(targetType);
                }
            });
            if (timeoutCaches_1.length) {
                timeoutCaches_1.forEach(function (targetType) {
                    _this.destroy(targetType, _this.cacheTokens.get(targetType).target);
                });
            }
            this.timeout = setTimeout(function () {
                _this.checkExpires();
            }, 60000);
        }
    };
    CacheManager.prototype.destroy = function (targetType, target) {
        if (!this.hasCache(targetType)) {
            return;
        }
        if (!target) {
            target = this.cacheTokens.get(targetType).target;
        }
        try {
            var component = target;
            if (utils.isFunction(component.onDestroy)) {
                this.container.syncInvoke(targetType, 'onDestroy', target);
            }
            this.cacheTokens.delete(targetType);
        }
        catch (err) {
            console.error && console.error(err);
        }
    };
    CacheManager.classAnnations = { "name": "CacheManager", "params": { "constructor": ["container"], "isChecking": [], "hasCache": ["targetType"], "cache": ["targetType", "target", "expires"], "get": ["targetType", "expires"], "checkExpires": [], "destroy": ["targetType", "target"] } };
    return CacheManager;
}());
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
var ResolverChain = /** @class */ (function () {
    function ResolverChain(container) {
        this.container = container;
        this.resolvers = [];
    }
    ResolverChain.prototype.next = function (resolver) {
        if (!this.hasResolver(resolver)) {
            this.resolvers.push(resolver);
        }
    };
    ResolverChain.prototype.toArray = function () {
        return [this.container].concat(this.resolvers);
    };
    ResolverChain.prototype.hasResolver = function (resolver) {
        if (resolver instanceof Container_1.Container) {
            return this.resolvers.indexOf(resolver) >= 0;
        }
        else {
            return this.resolvers.some(function (a) {
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
    };
    ResolverChain.prototype.hasToken = function (resolver, token) {
        var _this = this;
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
            var exps_1 = resolver.exports || [];
            return exps_1.concat(resolver.providers || []).some(function (t) {
                if (_this.container.getTokenKey(t) === token) {
                    return true;
                }
                else if (!utils.isClass(token)) {
                    if (resolver.container.hasRegister(token)) {
                        var type = resolver.container.getTokenImpl(token);
                        return exps_1.indexOf(type) >= 0;
                    }
                }
                return false;
            });
        }
    };
    ResolverChain.prototype.resolve = function (token) {
        var _this = this;
        var providers = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            providers[_i - 1] = arguments[_i];
        }
        var _a, _b;
        var resolver = this.toArray().find(function (r) { return _this.hasToken(r, token); });
        if (!resolver && !this.container.parent) {
            console.log('have not register', token);
            return null;
        }
        if (resolver) {
            if (resolver instanceof Container_1.Container) {
                return resolver.resolveValue.apply(resolver, [token].concat(providers));
            }
            else {
                return (_a = resolver.container).resolveValue.apply(_a, [token].concat(providers));
            }
        }
        else {
            // if (!this.hasContainerProvider(providers)) {
            //     providers.push({ provide: ContainerToken, useValue: this.container });
            // }
            return (_b = this.container.parent).resolve.apply(_b, [token].concat(providers));
        }
    };
    ResolverChain.prototype.unregister = function (token) {
        var _this = this;
        var resolver = this.toArray().find(function (r) { return _this.hasToken(r, token); });
        if (resolver) {
            if (resolver instanceof Container_1.Container) {
                resolver.unregister(token, false);
            }
            else {
                var idx = this.resolvers.indexOf(resolver);
                if (idx >= 0 && idx < this.resolvers.length) {
                    this.resolvers.splice(idx, 1);
                }
            }
        }
        else if (this.container.parent) {
            this.container.parent.unregister(token);
        }
    };
    ResolverChain.prototype.getTokenImpl = function (token) {
        var _this = this;
        var resolver = this.toArray().find(function (r) { return _this.hasToken(r, token); });
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
    };
    // getTypeProvides<T>(target: Type<T>): Token<T>[] {
    //     let tokens: Token<T>[] = [];
    //     this.toArray().forEach(r => {
    //         if (tokens && tokens.length) {
    //             return false;
    //         }
    //         if (r instanceof Container) {
    //             tokens = r.getTypeProvides(target, false);
    //         } else {
    //             tokens = r.container.getTypeProvides(target, false);
    //         }
    //         return true;
    //     });
    //     if (tokens && tokens.length) {
    //         return tokens;
    //     }
    //     if (this.container.parent) {
    //         return this.container.parent.getTypeProvides(target);
    //     }
    //     return tokens;
    // }
    ResolverChain.prototype.hasRegister = function (token) {
        var _this = this;
        if (this.container.hasRegister(token)) {
            return true;
        }
        if (this.resolvers.length) {
            return this.resolvers.some(function (r) { return _this.hasToken(r, token); });
        }
        return false;
    };
    ResolverChain.prototype.has = function (token) {
        if (this.hasRegister(token)) {
            return true;
        }
        if (this.container.parent) {
            return this.container.parent.has(token);
        }
        return false;
    };
    // protected hasContainerProvider(providers: Providers[]): boolean {
    //     return providers.some(p => {
    //         if (p instanceof ProviderMap) {
    //             return p.has(ContainerToken);
    //         } else if (isMetadataObject(p)) {
    //             let prd = p as IProvider;
    //             return prd.provide === ContainerToken;
    //         }
    //         return false;
    //     });
    // }
    ResolverChain.classAnnations = { "name": "ResolverChain", "params": { "constructor": ["container"], "next": ["resolver"], "toArray": [], "hasResolver": ["resolver"], "hasToken": ["resolver", "token"], "resolve": ["token", "providers"], "unregister": ["token"], "getTokenImpl": ["token"], "hasRegister": ["token"], "has": ["token"] } };
    return ResolverChain;
}());
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
    container.registerSingleton(LifeScope.LifeScopeToken, function () { return new DefaultLifeScope_1.DefaultLifeScope(container); });
    container.registerSingleton(ICacheManager.CacheManagerToken, function () { return new core.CacheManager(container); });
    container.registerSingleton(resolves.ResolverChainToken, function () { return new resolves.ResolverChain(container); });
    container.register(core.ProviderMapToken, function () { return new core.ProviderMap(container); });
    container.bindProvider(core.ProviderMap, core.ProviderMapToken);
    container.registerSingleton(core.ProviderMatcherToken, function () { return new core.ProviderMatcher(container); });
    container.registerSingleton(IMethodAccessor.MethodAccessorToken, function () { return new MethodAccessor_1.MethodAccessor(container); });
    var lifeScope = container.get(LifeScope.LifeScopeToken);
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
    container.register(Date, function () { return new Date(); });
    container.register(String, function () { return ''; });
    container.register(Number, function () { return Number.NaN; });
    container.register(Boolean, function () { return undefined; });
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
var Container = /** @class */ (function () {
    function Container() {
        this.init();
    }
    Container.prototype.getRoot = function () {
        var root = this;
        while (root.parent) {
            root = root.parent;
        }
        return root;
    };
    Container.prototype.getBuilder = function () {
        return this.resolveValue(IContainerBuilder.ContainerBuilderToken);
    };
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
    Container.prototype.get = function (token, alias) {
        var providers = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            providers[_i - 2] = arguments[_i];
        }
        return this.resolve.apply(this, [alias ? this.getTokenKey(token, alias) : token].concat(providers));
    };
    Object.defineProperty(Container.prototype, "resolvers", {
        /**
        * resolve token value in this container only.
        *
        * @template T
        * @param {Token<T>} token
        * @param {...Providers[]} providers
        * @returns {T}
        * @memberof Container
        */
        get: function () {
            return this.resolveValue(resolves.ResolverChainToken);
        },
        enumerable: true,
        configurable: true
    });
    /**
     * resolve type instance with token and param provider.
     *
     * @template T
     * @param {Token<T>} token
     * @param {T} [notFoundValue]
     * @param {...Providers[]} providers
     * @memberof Container
     */
    Container.prototype.resolve = function (token) {
        var providers = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            providers[_i - 1] = arguments[_i];
        }
        var _a;
        var key = this.getTokenKey(token);
        return (_a = this.resolvers).resolve.apply(_a, [key].concat(providers));
    };
    /**
     * resolve token value in this container only.
     *
     * @template T
     * @param {Token<T>} token
     * @param {...Providers[]} providers
     * @returns {T}
     * @memberof IContainer
     */
    Container.prototype.resolveValue = function (token) {
        var providers = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            providers[_i - 1] = arguments[_i];
        }
        var key = this.getTokenKey(token);
        if (!this.hasRegister(key)) {
            return null;
        }
        var factory = this.factories.get(key);
        return factory.apply(void 0, providers);
    };
    /**
     * clear cache.
     *
     * @param {Type<any>} targetType
     * @memberof IContainer
     */
    Container.prototype.clearCache = function (targetType) {
        this.resolveValue(ICacheManager.CacheManagerToken).destroy(targetType);
    };
    /**
     * get token.
     *
     * @template T
     * @param {Token<T>} token
     * @param {string} [alias]
     * @returns {Token<T>}
     * @memberof Container
     */
    Container.prototype.getToken = function (token, alias) {
        if (alias) {
            return new Registration_1.Registration(token, alias);
        }
        return token;
    };
    /**
     * get tocken key.
     *
     * @template T
     * @param {Token<T>} token
     * @param {string} [alias]
     * @returns {SymbolType<T>}
     * @memberof Container
     */
    Container.prototype.getTokenKey = function (token, alias) {
        if (alias) {
            return new Registration_1.Registration(token, alias).toString();
        }
        else if (token instanceof Registration_1.Registration) {
            return token.toString();
        }
        return token;
    };
    /**
     * register type.
     * @abstract
     * @template T
     * @param {Token<T>} token
     * @param {T} [value]
     * @returns {this}
     * @memberOf Container
     */
    Container.prototype.register = function (token, value) {
        this.registerFactory(token, value);
        return this;
    };
    /**
     * has register the token or not.
     *
     * @template T
     * @param {Token<T>} token
     * @param {string} [alias]
     * @returns {boolean}
     * @memberof Container
     */
    Container.prototype.has = function (token, alias) {
        var key = this.getTokenKey(token, alias);
        return this.resolvers.has(key);
    };
    /**
     * has register type.
     *
     * @template T
     * @param {SymbolType<T>} key
     * @returns
     * @memberof Container
     */
    Container.prototype.hasRegister = function (key) {
        return this.factories.has(key);
    };
    /**
     * unregister the token
     *
     * @template T
     * @param {Token<T>} token
     * @returns {this}
     * @memberof Container
     */
    Container.prototype.unregister = function (token, inchain) {
        var key = this.getTokenKey(token);
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
    };
    /**
     * register stingleton type.
     * @abstract
     * @template T
     * @param {Token<T>} token
     * @param {Factory<T>} [value]
     * @returns {this}
     * @memberOf Container
     */
    Container.prototype.registerSingleton = function (token, value) {
        this.registerFactory(token, value, true);
        return this;
    };
    /**
     * register value.
     *
     * @template T
     * @param {Token<T>} token
     * @param {T} value
     * @returns {this}
     * @memberof Container
     */
    Container.prototype.registerValue = function (token, value) {
        var _this = this;
        var key = this.getTokenKey(token);
        this.singleton.set(key, value);
        if (!this.factories.has(key)) {
            this.factories.set(key, function () {
                return _this.singleton.get(key);
            });
        }
        return this;
    };
    /**
     * bind provider.
     *
     * @template T
     * @param {Token<T>} provide
     * @param {Token<T>} provider
     * @returns {this}
     * @memberof Container
     */
    Container.prototype.bindProvider = function (provide, provider) {
        var _this = this;
        var provideKey = this.getTokenKey(provide);
        var factory;
        if (utils.isToken(provider)) {
            factory = function () {
                var providers = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    providers[_i] = arguments[_i];
                }
                return _this.resolve.apply(_this, [provider].concat(providers));
            };
        }
        else {
            if (utils.isFunction(provider)) {
                factory = function () {
                    var providers = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        providers[_i] = arguments[_i];
                    }
                    return provider.apply(void 0, [_this].concat(providers));
                };
            }
            else {
                factory = function () {
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
            var token = provider;
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
    };
    /**
     * get token implements class type.
     *
     * @template T
     * @param {Token<T>} token
     * @param {boolean} [inchain]
     * @returns {Type<T>}
     * @memberof Container
     */
    Container.prototype.getTokenImpl = function (token, inchain) {
        var tokenKey = this.getTokenKey(token);
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
    };
    // /**
    //  * get type provider for provides.
    //  *
    //  * @template T
    //  * @param {Type<T>} target
    //  * @returns {Token<T>[]}
    //  * @memberof Container
    //  */
    // getTypeProvides<T>(target: Type<T>, inchain?: boolean): Token<T>[] {
    //     if (inchain === false) {
    //         if (!isClass(target)) {
    //             return [];
    //         }
    //         let tokens: Token<T>[] = [];
    //         if (this.provideTypes.values().some(a => a === target)) {
    //             this.provideTypes.forEach((val, key) => {
    //                 if (val === target) {
    //                     tokens.push(key);
    //                 }
    //             });
    //         }
    //         return tokens;
    //     } else {
    //         return this.resolveChain.getTypeProvides(target);
    //     }
    // }
    /**
     * get token implement class and base classes.
     *
     * @param {Token<any>} token
     * @returns {Token<any>[]}
     * @memberof Container
     */
    Container.prototype.getTokenExtendsChain = function (token) {
        if (utils.isClass(token)) {
            return this.getBaseClasses(token);
        }
        else {
            return this.getBaseClasses(this.getTokenImpl(token)).concat([token]);
        }
    };
    Container.prototype.getBaseClasses = function (target) {
        var types$$1 = [];
        while (utils.isClass(target) && target !== Object) {
            types$$1.push(target);
            target = utils.lang.getParentClass(target);
        }
        return types$$1;
    };
    /**
    * get life scope of container.
    *
    * @returns {LifeScope}
    * @memberof IContainer
    */
    Container.prototype.getLifeScope = function () {
        return this.get(LifeScope.LifeScopeToken);
    };
    /**
     * use modules.
     *
     * @param {...Modules[]} modules
     * @returns {this}
     * @memberof Container
     */
    Container.prototype.use = function () {
        var modules = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            modules[_i] = arguments[_i];
        }
        var _a;
        (_a = this.getBuilder()).syncLoadModule.apply(_a, [this].concat(modules));
        return this;
    };
    /**
     * async use modules.
     *
     * @param {...LoadType[]} modules load modules.
     * @returns {Promise<Type<any>[]>}  types loaded.
     * @memberof IContainer
     */
    Container.prototype.loadModule = function () {
        var modules = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            modules[_i] = arguments[_i];
        }
        var _a;
        return (_a = this.getBuilder()).loadModule.apply(_a, [this].concat(modules));
    };
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
    Container.prototype.invoke = function (token, propertyKey, instance) {
        var providers = [];
        for (var _i = 3; _i < arguments.length; _i++) {
            providers[_i - 3] = arguments[_i];
        }
        var _a;
        return (_a = this.resolveValue(IMethodAccessor.MethodAccessorToken)).invoke.apply(_a, [token, propertyKey, instance].concat(providers));
    };
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
    Container.prototype.syncInvoke = function (token, propertyKey, instance) {
        var providers = [];
        for (var _i = 3; _i < arguments.length; _i++) {
            providers[_i - 3] = arguments[_i];
        }
        var _a;
        return (_a = this.resolveValue(IMethodAccessor.MethodAccessorToken)).syncInvoke.apply(_a, [token, propertyKey, instance].concat(providers));
    };
    Container.prototype.createSyncParams = function (params) {
        var providers = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            providers[_i - 1] = arguments[_i];
        }
        var _a;
        return (_a = this.resolveValue(IMethodAccessor.MethodAccessorToken)).createSyncParams.apply(_a, [params].concat(providers));
    };
    Container.prototype.createParams = function (params) {
        var providers = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            providers[_i - 1] = arguments[_i];
        }
        var _a;
        return (_a = this.resolveValue(IMethodAccessor.MethodAccessorToken)).createParams.apply(_a, [params].concat(providers));
    };
    Container.prototype.cacheDecorator = function (map, action) {
        if (!map.has(action.name)) {
            map.set(action.name, action);
        }
    };
    Container.prototype.init = function () {
        var _this = this;
        this.factories = new utils.MapSet();
        this.singleton = new utils.MapSet();
        this.provideTypes = new utils.MapSet();
        this.bindProvider(IContainer.ContainerToken, function () { return _this; });
        registerCores_1.registerCores(this);
    };
    Container.prototype.registerFactory = function (token, value, singleton) {
        var key = this.getTokenKey(token);
        if (this.factories.has(key)) {
            return;
        }
        var classFactory;
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
                classFactory = this.createCustomFactory(key, function () { return value; }, singleton);
            }
        }
        else if (!utils.isString(token) && !utils.isSymbol(token)) {
            var ClassT = (token instanceof Registration_1.Registration) ? token.getClass() : token;
            if (utils.isClass(ClassT)) {
                this.bindTypeFactory(key, ClassT, singleton);
            }
        }
        if (classFactory) {
            this.factories.set(key, classFactory);
        }
    };
    Container.prototype.createCustomFactory = function (key, factory, singleton) {
        var _this = this;
        return singleton ?
            function () {
                var providers = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    providers[_i] = arguments[_i];
                }
                if (_this.singleton.has(key)) {
                    return _this.singleton.get(key);
                }
                var instance = factory.apply(void 0, [_this].concat(providers));
                _this.singleton.set(key, instance);
                return instance;
            }
            : function () {
                var providers = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    providers[_i] = arguments[_i];
                }
                return factory.apply(void 0, [_this].concat(providers));
            };
    };
    Container.prototype.bindTypeFactory = function (key, ClassT, singleton) {
        var _this = this;
        if (!Reflect.isExtensible(ClassT)) {
            return;
        }
        var lifeScope = this.getLifeScope();
        var parameters = lifeScope.getConstructorParameters(ClassT);
        if (!singleton) {
            singleton = lifeScope.isSingletonType(ClassT);
        }
        var factory = function () {
            var providers = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                providers[_i] = arguments[_i];
            }
            var _a;
            if (singleton && _this.singleton.has(key)) {
                return _this.singleton.get(key);
            }
            if (providers.length < 1) {
                var lifecycleData = {
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
            var providerMap = (_a = _this.get(core.ProviderMatcherToken)).toProviderMap.apply(_a, providers);
            lifeScope.execute({
                tokenKey: key,
                targetType: ClassT,
                raiseContainer: _this,
                params: parameters,
                providers: providers,
                providerMap: providerMap,
                singleton: singleton
            }, types.IocState.runtime, core.LifeState.beforeCreateArgs);
            var args = _this.createSyncParams(parameters, providerMap);
            lifeScope.routeExecute({
                tokenKey: key,
                targetType: ClassT,
                raiseContainer: _this,
                args: args,
                params: parameters,
                providers: providers,
                providerMap: providerMap,
                singleton: singleton
            }, types.IocState.runtime, core.LifeState.beforeConstructor);
            var instance = new (ClassT.bind.apply(ClassT, [void 0].concat(args)))();
            lifeScope.routeExecute({
                tokenKey: key,
                target: instance,
                targetType: ClassT,
                raiseContainer: _this,
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
                raiseContainer: _this,
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
                raiseContainer: _this,
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
                raiseContainer: _this
            }, core.CoreActions.cache);
            return instance;
        };
        this.factories.set(key, factory);
        lifeScope.routeExecute({
            tokenKey: key,
            targetType: ClassT,
            raiseContainer: this
        }, types.IocState.design);
    };
    Container.classAnnations = { "name": "Container", "params": { "constructor": [], "getRoot": [], "getBuilder": [], "get": ["token", "alias", "providers"], "resolve": ["token", "providers"], "resolveValue": ["token", "providers"], "clearCache": ["targetType"], "getToken": ["token", "alias"], "getTokenKey": ["token", "alias"], "register": ["token", "value"], "has": ["token", "alias"], "hasRegister": ["key"], "unregister": ["token", "inchain"], "registerSingleton": ["token", "value"], "registerValue": ["token", "value"], "bindProvider": ["provide", "provider"], "getTokenImpl": ["token", "inchain"], "getTokenExtendsChain": ["token"], "getBaseClasses": ["target"], "getLifeScope": [], "use": ["modules"], "loadModule": ["modules"], "invoke": ["token", "propertyKey", "instance", "providers"], "syncInvoke": ["token", "propertyKey", "instance", "providers"], "createSyncParams": ["params", "providers"], "createParams": ["params", "providers"], "cacheDecorator": ["map", "action"], "init": [], "registerFactory": ["token", "value", "singleton"], "createCustomFactory": ["key", "factory", "singleton"], "bindTypeFactory": ["key", "ClassT", "singleton"] } };
    return Container;
}());
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
var DefaultModuleLoader = /** @class */ (function () {
    function DefaultModuleLoader() {
    }
    DefaultModuleLoader.prototype.getLoader = function () {
        if (!this._loader) {
            this._loader = this.createLoader();
        }
        return this._loader;
    };
    /**
     * load module.
     *
     * @param {...LoadType[]} modules
     * @returns {Promise<Modules[]>}
     * @memberof DefaultModuleLoader
     */
    DefaultModuleLoader.prototype.load = function (modules) {
        var _this = this;
        if (modules.length) {
            return Promise.all(modules.map(function (mdty) {
                if (utils.isString(mdty)) {
                    return _this.isFile(mdty) ? _this.loadFile(mdty) : _this.loadModule(mdty);
                }
                else if (utils.isObject(mdty) && (mdty['modules'] || mdty['files'])) {
                    return _this.loadPathModule(mdty);
                }
                else {
                    return mdty ? [mdty] : [];
                }
            }))
                .then(function (allms) {
                var rmodules = [];
                allms.forEach(function (ms) {
                    rmodules = rmodules.concat(ms);
                });
                return rmodules;
            });
        }
        else {
            return Promise.resolve([]);
        }
    };
    /**
     * load types from module.
     *
     * @param {...LoadType[]} modules
     * @returns {Promise<Type<any>[]>}
     * @memberof IContainerBuilder
     */
    DefaultModuleLoader.prototype.loadTypes = function (modules) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var mdls;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.load(modules)];
                    case 1:
                        mdls = _a.sent();
                        return [2 /*return*/, this.getTypes(mdls)];
                }
            });
        });
    };
    /**
     * get all class type in modules.
     *
     * @param {Modules[]} modules
     * @param {...Express<Type<any>, boolean>[]} filters
     * @returns {Type<any>[]}
     * @memberof DefaultModuleLoader
     */
    DefaultModuleLoader.prototype.getTypes = function (modules) {
        var _this = this;
        var regModules = [];
        modules.forEach(function (m) {
            var types = _this.getContentTypes(m);
            regModules.push(types);
        });
        return regModules;
    };
    DefaultModuleLoader.prototype.loadFile = function (files, basePath) {
        var loader = this.getLoader();
        var fRes;
        if (utils.isArray(files)) {
            fRes = Promise.all(files.map(function (f) { return loader(f); }))
                .then(function (allms) {
                var rms = [];
                allms.forEach(function (ms) {
                    rms = rms.concat(ms);
                });
                return rms;
            });
        }
        else {
            fRes = loader(files);
        }
        return fRes.then(function (ms) { return ms.filter(function (it) { return !!it; }); });
    };
    DefaultModuleLoader.prototype.isFile = function (str) {
        return str && /\/((\w|%|\.))+\.\w+$/.test(str.replace(/\\\\/gi, '/'));
    };
    DefaultModuleLoader.prototype.loadModule = function (moduleName) {
        var loader = this.getLoader();
        return loader(moduleName).then(function (ms) { return ms.filter(function (it) { return !!it; }); });
    };
    DefaultModuleLoader.prototype.loadPathModule = function (pmd) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var modules;
            var _this = this;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        modules = [];
                        if (!pmd.files) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.loadFile(pmd.files, pmd.basePath)
                                .then(function (allmoduls) {
                                allmoduls.forEach(function (ms) {
                                    modules = modules.concat(ms);
                                });
                                return modules;
                            })];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        if (!pmd.modules) return [3 /*break*/, 4];
                        return [4 /*yield*/, Promise.all(pmd.modules.map(function (nmd) {
                                return utils.isString(nmd) ? _this.loadModule(nmd) : nmd;
                            })).then(function (ms) {
                                modules = modules.concat(ms);
                                return modules;
                            })];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [2 /*return*/, modules];
                }
            });
        });
    };
    DefaultModuleLoader.prototype.createLoader = function () {
        if (typeof commonjsRequire !== 'undefined') {
            return function (modulepath) {
                return new Promise(function (resolve, reject) {
                    commonjsRequire([modulepath], function (mud) {
                        resolve(mud);
                    }, function (err) {
                        reject(err);
                    });
                });
            };
        }
        else {
            throw new Error('has not module loader');
        }
    };
    DefaultModuleLoader.prototype.getContentTypes = function (regModule) {
        var regModules = [];
        if (utils.isClass(regModule)) {
            regModules.push(regModule);
        }
        else {
            var rmodules = regModule['exports'] ? regModule['exports'] : regModule;
            for (var p in rmodules) {
                var type = rmodules[p];
                if (utils.isClass(type)) {
                    regModules.push(type);
                }
            }
        }
        return regModules;
    };
    DefaultModuleLoader.classAnnations = { "name": "DefaultModuleLoader", "params": { "constructor": [], "getLoader": [], "load": ["modules"], "loadTypes": ["modules"], "getTypes": ["modules"], "loadFile": ["files", "basePath"], "isFile": ["str"], "loadModule": ["moduleName"], "loadPathModule": ["pmd"], "createLoader": [], "getContentTypes": ["regModule"] } };
    return DefaultModuleLoader;
}());
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
var InjectModuleValidateToken = /** @class */ (function (_super) {
    tslib_1.__extends(InjectModuleValidateToken, _super);
    function InjectModuleValidateToken(desc) {
        return _super.call(this, 'DI_ModuleValidate', desc) || this;
    }
    InjectModuleValidateToken.classAnnations = { "name": "InjectModuleValidateToken", "params": { "constructor": ["desc"] } };
    return InjectModuleValidateToken;
}(Registration_1.Registration));
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
var InjectMetaAccessorToken = /** @class */ (function (_super) {
    tslib_1.__extends(InjectMetaAccessorToken, _super);
    function InjectMetaAccessorToken(type) {
        return _super.call(this, type, 'boot__metaAccessor') || this;
    }
    InjectMetaAccessorToken.classAnnations = { "name": "InjectMetaAccessorToken", "params": { "constructor": ["type"] } };
    return InjectMetaAccessorToken;
}(Registration_1.Registration));
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
var BaseModuelValidate = /** @class */ (function () {
    function BaseModuelValidate() {
    }
    BaseModuelValidate.prototype.validate = function (type) {
        if (!utils.isClass(type)) {
            return false;
        }
        var decorator = this.getDecorator();
        if (utils.isString(decorator)) {
            return core.hasOwnClassMetadata(decorator, type);
        }
        else if (utils.isArray(decorator)) {
            if (decorator.length > 0) {
                return decorator.some(function (decor) { return core.hasOwnClassMetadata(decor, type); });
            }
        }
        return false;
    };
    BaseModuelValidate.prototype.getMetaConfig = function (token, container) {
        if (utils.isToken(token)) {
            var accessor = this.getMetaAccessor(container);
            return accessor.getMetadata(token, container);
        }
        return {};
    };
    BaseModuelValidate.prototype.getMetaAccessor = function (container) {
        var decorator = this.getDecorator();
        return container.resolve(IMetaAccessor.AnnotationMetaAccessorToken, { decorator: decorator });
    };
    BaseModuelValidate.classAnnations = { "name": "BaseModuelValidate", "params": { "constructor": [], "validate": ["type"], "getMetaConfig": ["token", "container"], "getMetaAccessor": ["container"], "getDecorator": [] } };
    return BaseModuelValidate;
}());
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
var IocExtModuleValidate = /** @class */ (function (_super) {
    tslib_1.__extends(IocExtModuleValidate, _super);
    function IocExtModuleValidate() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    IocExtModuleValidate.prototype.getDecorator = function () {
        return core.IocExt.toString();
    };
    IocExtModuleValidate.classAnnations = { "name": "IocExtModuleValidate", "params": { "getDecorator": [] } };
    return IocExtModuleValidate;
}(BaseModuelValidate));
exports.IocExtModuleValidate = IocExtModuleValidate;


});

unwrapExports(ModuleValidate);
var ModuleValidate_1 = ModuleValidate.BaseModuelValidate;
var ModuleValidate_2 = ModuleValidate.IocExtModuleValidateToken;
var ModuleValidate_3 = ModuleValidate.IocExtModuleValidate;

var MetaAccessor_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });




var MetaAccessor = /** @class */ (function () {
    function MetaAccessor(decorator) {
        this.decorators = utils.isArray(decorator) ? decorator : [decorator];
    }
    MetaAccessor.prototype.getDecorators = function () {
        return this.decorators;
    };
    MetaAccessor.prototype.getMetadata = function (token, container) {
        var type = utils.isClass(token) ? token : container.getTokenImpl(token);
        if (utils.isClass(type)) {
            var decorators = this.getDecorators();
            var firstDecor = decorators.find(function (decor) { return core.hasOwnClassMetadata(decor, type); });
            var metas = core.getTypeMetadata(firstDecor, type);
            if (metas && metas.length) {
                var meta = metas[0];
                return meta;
            }
        }
        return {};
    };
    MetaAccessor.classAnnations = { "name": "MetaAccessor", "params": { "constructor": ["decorator"], "getDecorators": [], "getMetadata": ["token", "container"] } };
    MetaAccessor = tslib_1.__decorate([
        core.Injectable(IMetaAccessor.DefaultMetaAccessorToken),
        tslib_1.__metadata("design:paramtypes", [Object])
    ], MetaAccessor);
    return MetaAccessor;
}());
exports.MetaAccessor = MetaAccessor;
/**
 * Annotation MetaAccessor.
 *
 * @export
 * @class AnnotationMetaAccessor
 * @implements {IMetaAccessor<any>}
 */
var AnnotationMetaAccessor = /** @class */ (function () {
    function AnnotationMetaAccessor(decorator) {
        this.decorators = utils.isArray(decorator) ? decorator : [decorator];
    }
    AnnotationMetaAccessor.prototype.getDecorators = function () {
        return this.decorators;
    };
    AnnotationMetaAccessor.prototype.getMetadata = function (token, container) {
        if (utils.isToken(token)) {
            var accessor_1;
            var provider_1 = { decorator: this.getDecorators() };
            container.getTokenExtendsChain(token).forEach(function (tk) {
                if (accessor_1) {
                    return false;
                }
                var accToken = new IMetaAccessor.InjectMetaAccessorToken(tk);
                if (container.has(accToken)) {
                    accessor_1 = container.resolve(accToken, provider_1);
                }
                return true;
            });
            if (!accessor_1) {
                accessor_1 = this.getDefaultMetaAccessor(container, provider_1);
            }
            if (accessor_1) {
                return accessor_1.getMetadata(token, container);
            }
            else {
                return {};
            }
        }
        return {};
    };
    AnnotationMetaAccessor.prototype.getDefaultMetaAccessor = function (container) {
        var providers = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            providers[_i - 1] = arguments[_i];
        }
        return container.resolve.apply(container, [IMetaAccessor.DefaultMetaAccessorToken].concat(providers));
    };
    AnnotationMetaAccessor.classAnnations = { "name": "AnnotationMetaAccessor", "params": { "constructor": ["decorator"], "getDecorators": [], "getMetadata": ["token", "container"], "getDefaultMetaAccessor": ["container", "providers"] } };
    AnnotationMetaAccessor = tslib_1.__decorate([
        core.Injectable(IMetaAccessor.AnnotationMetaAccessorToken),
        tslib_1.__metadata("design:paramtypes", [Object])
    ], AnnotationMetaAccessor);
    return AnnotationMetaAccessor;
}());
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
var InjectModuleInjectorToken = /** @class */ (function (_super) {
    tslib_1.__extends(InjectModuleInjectorToken, _super);
    function InjectModuleInjectorToken(desc, sync) {
        if (sync === void 0) { sync = false; }
        return _super.call(this, sync ? 'DI_SyncModuleInjector' : 'DI_ModuleInjector', desc) || this;
    }
    InjectModuleInjectorToken.classAnnations = { "name": "InjectModuleInjectorToken", "params": { "constructor": ["desc", "sync"] } };
    return InjectModuleInjectorToken;
}(Registration_1.Registration));
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
var BaseModuleInjector = /** @class */ (function () {
    /**
     *Creates an instance of BaseModuleInjector.
     * @param {IModuleValidate} [validate]
     * @param {boolean} [skipNext] skip next when has match module to injector.
     * @memberof BaseModuleInjector
     */
    function BaseModuleInjector(validate, skipNext) {
        this.validate = validate;
        this.skipNext = skipNext;
    }
    BaseModuleInjector.prototype.filter = function (modules) {
        var _this = this;
        modules = modules || [];
        return this.validate ? modules.filter(function (md) { return _this.validate.validate(md); }) : modules;
    };
    BaseModuleInjector.prototype.next = function (all, filtered) {
        if (filtered.length === 0) {
            return all;
        }
        if (this.skipNext) {
            return null;
        }
        if (filtered.length === all.length) {
            return null;
        }
        return all.filter(function (it) { return filtered.indexOf(it) < 0; });
    };
    BaseModuleInjector.prototype.setup = function (container, type) {
        container.register(type);
    };
    BaseModuleInjector.classAnnations = { "name": "BaseModuleInjector", "params": { "constructor": ["validate", "skipNext"], "inject": ["container", "modules"], "filter": ["modules"], "next": ["all", "filtered"], "setup": ["container", "type"] } };
    return BaseModuleInjector;
}());
exports.BaseModuleInjector = BaseModuleInjector;
/**
 * sync module injector.
 *
 * @export
 * @class SyncModuleInjector
 * @extends {BaseModuleInjector}
 * @implements {IModuleInjector}
 */
var SyncModuleInjector = /** @class */ (function (_super) {
    tslib_1.__extends(SyncModuleInjector, _super);
    function SyncModuleInjector(validate, skipNext) {
        var _this = _super.call(this, validate, skipNext) || this;
        _this.validate = validate;
        return _this;
    }
    SyncModuleInjector.prototype.inject = function (container, modules) {
        var _this = this;
        var types = this.filter(modules);
        if (types.length) {
            types.forEach(function (ty) {
                _this.setup(container, ty);
            });
        }
        var next = this.next(modules, types);
        return { injected: types, next: next };
    };
    SyncModuleInjector.classAnnations = { "name": "SyncModuleInjector", "params": { "constructor": ["validate", "skipNext"], "inject": ["container", "modules"] } };
    SyncModuleInjector = tslib_1.__decorate([
        core.Injectable(IModuleInjector.SyncModuleInjectorToken),
        tslib_1.__metadata("design:paramtypes", [Object, Boolean])
    ], SyncModuleInjector);
    return SyncModuleInjector;
}(BaseModuleInjector));
exports.SyncModuleInjector = SyncModuleInjector;
/**
 * module injector.
 *
 * @export
 * @class ModuleInjector
 * @extends {BaseModuleInjector}
 * @implements {IModuleInjector}
 */
var ModuleInjector = /** @class */ (function (_super) {
    tslib_1.__extends(ModuleInjector, _super);
    function ModuleInjector(validate, skipNext) {
        var _this = _super.call(this, validate, skipNext) || this;
        _this.validate = validate;
        return _this;
    }
    ModuleInjector.prototype.inject = function (container, modules) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var types, next;
            var _this = this;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        types = this.filter(modules);
                        if (!types.length) return [3 /*break*/, 2];
                        return [4 /*yield*/, utils.PromiseUtil.step(types.map(function (ty) {
                                return _this.setup(container, ty);
                            }))];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        next = this.next(modules, types);
                        return [2 /*return*/, { injected: types, next: next }];
                }
            });
        });
    };
    ModuleInjector.classAnnations = { "name": "ModuleInjector", "params": { "constructor": ["validate", "skipNext"], "inject": ["container", "modules"] } };
    ModuleInjector = tslib_1.__decorate([
        core.Injectable(IModuleInjector.ModuleInjectorToken),
        tslib_1.__metadata("design:paramtypes", [Object, Boolean])
    ], ModuleInjector);
    return ModuleInjector;
}(BaseModuleInjector));
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
var ModuleInjectorChain = /** @class */ (function () {
    function ModuleInjectorChain() {
        this._injectors = [];
    }
    Object.defineProperty(ModuleInjectorChain.prototype, "injectors", {
        get: function () {
            return this._injectors;
        },
        enumerable: true,
        configurable: true
    });
    ModuleInjectorChain.prototype.first = function (injector) {
        if (this.isInjector(injector)) {
            this._injectors.unshift(injector);
        }
        return this;
    };
    ModuleInjectorChain.prototype.next = function (injector) {
        if (this.isInjector(injector)) {
            this._injectors.push(injector);
        }
        return this;
    };
    ModuleInjectorChain.prototype.isInjector = function (injector) {
        return injector instanceof ModuleInjector_1.ModuleInjector || injector instanceof ModuleInjector_1.SyncModuleInjector;
    };
    ModuleInjectorChain.prototype.inject = function (container, modules) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var types;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        types = [];
                        return [4 /*yield*/, utils.PromiseUtil.forEach(this.injectors.map(function (jtor) { return function (ijrt) { return jtor.inject(container, ijrt.next); }; }), function (result) {
                                types = types.concat(result.injected || []);
                                return result.next && result.next.length > 0;
                            }, { injected: [], next: modules }).catch(function (err) { return []; })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, types];
                }
            });
        });
    };
    ModuleInjectorChain.prototype.syncInject = function (container, modules) {
        var types = [];
        var completed = false;
        this.injectors.forEach(function (jtor) {
            if (completed) {
                return false;
            }
            if (jtor instanceof ModuleInjector_1.SyncModuleInjector) {
                var result = jtor.inject(container, modules);
                types = types.concat(result.injected);
                completed = (!result.next || result.next.length < 1);
            }
            return true;
        });
        return types;
    };
    ModuleInjectorChain.classAnnations = { "name": "ModuleInjectorChain", "params": { "constructor": [], "first": ["injector"], "next": ["injector"], "isInjector": ["injector"], "inject": ["container", "modules"], "syncInject": ["container", "modules"] } };
    return ModuleInjectorChain;
}());
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
var DefaultContainerBuilder = /** @class */ (function () {
    function DefaultContainerBuilder(loader) {
        this._loader = loader;
    }
    Object.defineProperty(DefaultContainerBuilder.prototype, "loader", {
        get: function () {
            if (!this._loader) {
                this._loader = new injectors.DefaultModuleLoader();
            }
            return this._loader;
        },
        enumerable: true,
        configurable: true
    });
    DefaultContainerBuilder.prototype.create = function () {
        var _this = this;
        var container = new Container_1.Container();
        container.bindProvider(IContainerBuilder.ContainerBuilderToken, function () { return _this; });
        container.bindProvider(injectors.ModuleLoaderToken, function () { return _this.loader; });
        return container;
    };
    /**
     * build container.
     *
     * @param {...LoadType[]} [modules]
     * @returns
     * @memberof DefaultContainerBuilder
     */
    DefaultContainerBuilder.prototype.build = function () {
        var modules = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            modules[_i] = arguments[_i];
        }
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var container;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        container = this.create();
                        if (!modules.length) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.loadModule.apply(this, [container].concat(modules))];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/, container];
                }
            });
        });
    };
    /**
     * load modules for container.
     *
     * @param {IContainer} container
     * @param {...LoadType[]} modules
     * @returns {Promise<Type<any>[]>}
     * @memberof DefaultContainerBuilder
     */
    DefaultContainerBuilder.prototype.loadModule = function (container) {
        var modules = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            modules[_i - 1] = arguments[_i];
        }
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var regModules, injTypes, injChain_1;
            var _this = this;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.loader.loadTypes(modules)];
                    case 1:
                        regModules = _a.sent();
                        injTypes = [];
                        if (!(regModules && regModules.length)) return [3 /*break*/, 3];
                        injChain_1 = this.getInjectorChain(container);
                        return [4 /*yield*/, utils.PromiseUtil.step(regModules.map(function (typs) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                                var ityps;
                                return tslib_1.__generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, injChain_1.inject(container, typs)];
                                        case 1:
                                            ityps = _a.sent();
                                            injTypes = injTypes.concat(ityps);
                                            return [2 /*return*/];
                                    }
                                });
                            }); }))];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [2 /*return*/, injTypes];
                }
            });
        });
    };
    DefaultContainerBuilder.prototype.syncBuild = function () {
        var modules = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            modules[_i] = arguments[_i];
        }
        var container = this.create();
        if (modules.length) {
            this.syncLoadModule.apply(this, [container].concat(modules));
        }
        return container;
    };
    DefaultContainerBuilder.prototype.syncLoadModule = function (container) {
        var modules = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            modules[_i - 1] = arguments[_i];
        }
        var regModules = this.loader.getTypes(modules);
        var injTypes = [];
        if (regModules && regModules.length) {
            var injChain_2 = this.getInjectorChain(container);
            regModules.forEach(function (typs) {
                var ityps = injChain_2.syncInject(container, typs);
                injTypes = injTypes.concat(ityps);
            });
        }
        return injTypes;
    };
    DefaultContainerBuilder.prototype.getInjectorChain = function (container) {
        if (!container.has(injectors.ModuleInjectorChainToken)) {
            container.register(injectors.SyncModuleInjector)
                .register(injectors.ModuleInjector)
                .register(injectors.MetaAccessor)
                .register(injectors.AnnotationMetaAccessor)
                .bindProvider(injectors.IocExtModuleValidateToken, new injectors.IocExtModuleValidate())
                .bindProvider(injectors.ModuleInjectorChainToken, new injectors.ModuleInjectorChain());
        }
        var currChain = container.get(injectors.ModuleInjectorChainToken);
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
    };
    DefaultContainerBuilder.classAnnations = { "name": "DefaultContainerBuilder", "params": { "constructor": ["loader"], "create": [], "build": ["modules"], "loadModule": ["container", "modules"], "syncBuild": ["modules"], "syncLoadModule": ["container", "modules"], "getInjectorChain": ["container"] } };
    return DefaultContainerBuilder;
}());
exports.DefaultContainerBuilder = DefaultContainerBuilder;


});

unwrapExports(DefaultContainerBuilder_1);
var DefaultContainerBuilder_2 = DefaultContainerBuilder_1.DefaultContainerBuilder;

var D__workspace_github_tsioc_packages_core_lib = createCommonjsModule(function (module, exports) {
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

var index$9 = unwrapExports(D__workspace_github_tsioc_packages_core_lib);

return index$9;

})));
