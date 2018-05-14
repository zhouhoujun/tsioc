(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('reflect-metadata')) :
	typeof define === 'function' && define.amd ? define(['reflect-metadata'], factory) :
	(global.core = global.core || {}, global.core.umd = global.core.umd || {}, global.core.umd.js = factory(global.Reflect));
}(this, (function (reflectMetadata) { 'use strict';

reflectMetadata = reflectMetadata && reflectMetadata.hasOwnProperty('default') ? reflectMetadata['default'] : reflectMetadata;

var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function commonjsRequire () {
	throw new Error('Dynamic requires are not currently supported by rollup-plugin-commonjs');
}

function unwrapExports (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

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

var lang = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * get object keys.
 *
 * @param {*} target
 * @returns {string[]}
 */
function keys(target) {
    if (typeCheck.isObject(target)) {
        return Object.keys(target);
    }
    return [];
}
exports.keys = keys;
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
exports.assign = assign;
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
        Object.keys(target).forEach(function (key) {
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
exports.omit = omit;
/**
 * object has field or not.
 *
 * @export
 * @param {ObjectMap<any>} target
 * @returns
 */
function hasField(target) {
    if (typeCheck.isObject(target)) {
        return Object.keys(target).length > 0;
    }
    return false;
}
exports.hasField = hasField;
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
        Object.keys(target).forEach(function (key, idx) {
            iterator(target[key], key);
        });
    }
}
exports.forIn = forIn;
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
exports.find = find;


});

unwrapExports(lang);
var lang_1 = lang.keys;
var lang_2 = lang.assign;
var lang_3 = lang.omit;
var lang_4 = lang.hasField;
var lang_5 = lang.forIn;
var lang_6 = lang.find;

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
    if (isToken(target)) {
        return false;
    }
    if (target instanceof RegExp || target instanceof Date) {
        return false;
    }
    if (target.constructor && target.constructor.name !== 'Object') {
        return false;
    }
    props = props || ['type'];
    if (extendsProps) {
        props = extendsProps.concat(props);
    }
    return lang.keys(target).some(function (n) { return props.indexOf(n) > 0; });
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
        lang.forIn(this.keyMap, function (val, name) {
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
            return lang.keys(this.keyMap).length;
        },
        enumerable: true,
        configurable: true
    });
    ObjectMapSet.classAnnations = { "name": "ObjectMapSet", "params": { "constructor": [], "clear": [], "getTypeKey": ["key"], "delete": ["key"], "forEach": ["callbackfn", "thisArg"], "get": ["key"], "has": ["key"], "set": ["key", "value"] } };
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
    MapSet.classAnnations = { "name": "MapSet", "params": { "constructor": [], "clear": [], "delete": ["key"], "forEach": ["callbackfn", "thisArg"], "get": ["key"], "has": ["key"], "set": ["key", "value"] } };
    return MapSet;
}());
exports.MapSet = MapSet;


});

unwrapExports(MapSet_1);
var MapSet_2 = MapSet_1.ObjectMapSet;
var MapSet_3 = MapSet_1.MapSet;

var symbols = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * symbols of ioc module.
 */
exports.symbols = {
    /**
     * IContainer interface symbol.
     * it is a symbol id, you can use  @Inject, @Autowried or @Param to get container instance in yourself class.
     */
    IContainer: Symbol('IContainer'),
    /**
     * life scope interface symbol.
     * it is a symbol id, you can register yourself MethodAccessor for this.
     */
    LifeScope: Symbol('LifeScope'),
    /**
     * Providers match interface symbol.
     * it is a symbol id, you can register yourself MethodAccessor for this.
     */
    IProviderMatcher: Symbol('IProviderMatcher'),
    /**
     * IMethodAccessor interface symbol.
     * it is a symbol id, you can register yourself MethodAccessor for this.
     */
    IMethodAccessor: Symbol('IMethodAccessor'),
    /**
     * ICacheManager interface symbol.
     * it is a symbol id, you can register yourself ICacheManager for this.
     */
    ICacheManager: Symbol('ICacheManager'),
    /**
     * ContainerBuilder interface symbol.
     * it is a symbol id, you can register yourself IContainerBuilder for this.
     */
    IContainerBuilder: Symbol('IContainerBuilder'),
    /**
     * IRecognizer interface symbol.
     * it is a symbol id, you can register yourself IRecognizer for this.
     */
    IRecognizer: Symbol('IRecognizer')
};


});

unwrapExports(symbols);
var symbols_1 = symbols.symbols;

var utils = createCommonjsModule(function (module, exports) {
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(typeCheck);
__export(MapSet_1);
__export(symbols);

exports.lang = lang;


});

unwrapExports(utils);
var utils_1 = utils.lang;

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
     * @param {Type<T> | AbstractType<T>} classType
     * @param {string} desc
     * @memberof Registration
     */
    function Registration(classType, desc) {
        this.classType = classType;
        this.desc = desc;
        this.type = 'Registration';
    }
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
            name = utils.getClassName(this.classType);
        }
        else {
            name = this.classType.toString();
        }
        return this.type + " " + name + " " + this.desc;
    };
    Registration.classAnnations = { "name": "Registration", "params": { "constructor": ["classType", "desc"], "getClass": [], "getDesc": [], "toString": [] } };
    return Registration;
}());
exports.Registration = Registration;


});

unwrapExports(Registration_1);
var Registration_2 = Registration_1.Registration;

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
        if (this.isCompeted()) {
            return null;
        }
        this.idx++;
        if (this.isCompeted()) {
            return null;
        }
        var arg = this.args[this.idx];
        if (express.isMetadata && express.isMetadata(arg)) {
            this.metadata = arg;
            this.end();
        }
        else if (express.match(arg)) {
            this.metadata = this.metadata || {};
            express.setMetadata(this.metadata, arg);
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
        if (args.length === 1 && utils.isMetadataObject(args[0])) {
            metadata = args[0];
        }
        else if (adapter) {
            var iterator = new ArgsIterator_1.ArgsIterator(args);
            adapter(iterator);
            metadata = iterator.getMetadata();
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
    var meta = utils.lang.assign({}, getMethodMetadata(metaName, target));
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
    var meta = utils.lang.assign({}, getPropertyMetadata(metaName, target));
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
            isMetadata: function (arg) { return utils.isClassMetadata(arg); },
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
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(ArgsIterator_1);
__export(DecoratorType_1);
__export(DecoratorFactory);
__export(ClassDecoratorFactory);
__export(MethodDecoratorFactory);
__export(ParamDecoratorFactory);
__export(PropertyDecoratorFactory);
__export(ParamPropDecoratorFactory);
__export(ClassMethodDecoratorFactory);
__export(MethodPropDecoratorFactory);
__export(MethodPropParamDecoratorFactory);


});

unwrapExports(factories);

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
        match: function (arg) { return utils.isString(arg); },
        setMetadata: function (metadata, arg) {
            metadata.autorun = arg;
        }
    });
});


});

unwrapExports(AutoRun);
var AutoRun_1 = AutoRun.Autorun;

var IocModule = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });


/**
 * IocModule decorator. define for class, use to define the class is Ioc extends module. it will auto run after registered to helper your to setup module.
 *
 * @IocModule
 */
exports.IocModule = factories.createClassDecorator('IocModule', function (args) {
    args.next({
        isMetadata: function (arg) { return utils.isClassMetadata(arg, ['autorun']); },
        match: function (arg) { return utils.isString(arg); },
        setMetadata: function (metadata, arg) {
            metadata.autorun = arg;
        }
    });
});


});

unwrapExports(IocModule);
var IocModule_1 = IocModule.IocModule;

var decorators = createCommonjsModule(function (module, exports) {
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(Component);
__export(Injectable);
__export(Inject);
__export(AutoWried);
__export(Param);
__export(Method);
__export(Singleton);
__export(Abstract);
__export(AutoRun);
__export(IocModule);


});

unwrapExports(decorators);

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

var Composite_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });



/**
 * compoiste.
 *
 * @export
 * @class Composite
 * @implements {IComponent}
 */
var Composite = /** @class */ (function () {
    function Composite(name) {
        this.name = name;
        this.children = [];
    }
    Composite.prototype.add = function (node) {
        node.parent = this;
        this.children.push(node);
        return this;
    };
    Composite.prototype.remove = function (node) {
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
            return this;
        }
    };
    Composite.prototype.find = function (express, mode) {
        var component;
        this.each(function (item) {
            if (component) {
                return false;
            }
            var isFinded = utils.isFunction(express) ? express(item) : express === item;
            if (isFinded) {
                component = item;
                return false;
            }
            return true;
        }, mode);
        return (component || this.empty());
    };
    Composite.prototype.filter = function (express, mode) {
        var nodes = [];
        this.each(function (item) {
            if (express(item)) {
                nodes.push(item);
            }
        }, mode);
        return nodes;
    };
    Composite.prototype.each = function (express, mode) {
        mode = mode || types.Mode.traverse;
        var r;
        switch (mode) {
            case types.Mode.route:
                r = this.routeUp(express);
                break;
            case types.Mode.children:
                r = this.eachChildren(express);
                break;
            case types.Mode.traverse:
                r = this.trans(express);
                break;
            case types.Mode.traverseLast:
                r = this.transAfter(express);
                break;
            default:
                r = this.trans(express);
                break;
        }
        return r;
    };
    Composite.prototype.eachChildren = function (express) {
        (this.children || []).forEach(function (item) {
            return express(item);
        });
    };
    /**
     *do express work in routing.
     *
     *@param {Express<T, void | boolean>} express
     *
     *@memberOf IComponent
     */
    Composite.prototype.routeUp = function (express) {
        if (express(this) === false) {
            return false;
        }
        
        if (this.parent && this.parent.routeUp) {
            return this.parent.routeUp(express);
        }
    };
    /**
     *translate all sub context to do express work.
     *
     *@param {Express<IComponent, void | boolean>} express
     *
     *@memberOf IComponent
     */
    Composite.prototype.trans = function (express) {
        if (express(this) === false) {
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
    Composite.prototype.transAfter = function (express) {
        var children = this.children || [];
        for (var i = 0; i < children.length; i++) {
            var result = children[i].transAfter(express);
            if (result === false) {
                return false;
            }
        }
        if (express(this) === false) {
            return false;
        }
        return true;
    };
    Composite.prototype.equals = function (node) {
        return this === node;
    };
    Composite.prototype.empty = function () {
        return NullComponent_1.NullNode;
    };
    Composite.prototype.isEmpty = function () {
        return this.equals(this.empty());
    };
    Composite.classAnnations = { "name": "Composite", "params": { "constructor": ["name"], "add": ["node"], "remove": ["node"], "find": ["express", "mode"], "filter": ["express", "mode"], "each": ["express", "mode"], "eachChildren": ["express"], "routeUp": ["express"], "trans": ["express"], "transAfter": ["express"], "equals": ["node"], "empty": [], "isEmpty": [] } };
    return Composite;
}());
exports.Composite = Composite;


});

unwrapExports(Composite_1);
var Composite_2 = Composite_1.Composite;

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

var components = createCommonjsModule(function (module, exports) {
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(Composite_1);
__export(GComposite_1);
__export(NullComponent_1);


});

unwrapExports(components);

var NullAction = createCommonjsModule(function (module, exports) {
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

var NullActionClass = /** @class */ (function (_super) {
    __extends(NullActionClass, _super);
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
 * action composite
 *
 * @export
 * @class ActionComposite
 * @extends {GComposite<ActionComponent>}
 * @implements {ActionComponent}
 */
var ActionComposite = /** @class */ (function (_super) {
    __extends(ActionComposite, _super);
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
})(CoreActions = exports.CoreActions || (exports.CoreActions = {}));


});

unwrapExports(CoreActions_1);
var CoreActions_2 = CoreActions_1.CoreActions;

var BindProviderAction_1 = createCommonjsModule(function (module, exports) {
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
 * bind provider action. for binding a factory to an token.
 *
 * @export
 * @class BindProviderAction
 * @extends {ActionComposite}
 */
var BindProviderAction = /** @class */ (function (_super) {
    __extends(BindProviderAction, _super);
    function BindProviderAction() {
        return _super.call(this, CoreActions_1.CoreActions.bindProvider) || this;
    }
    BindProviderAction.prototype.working = function (container, data) {
        var target = data.target;
        var type = data.targetType;
        var propertyKey = data.propertyKey;
        var lifeScope = container.getLifeScope();
        var matchs = lifeScope.getClassDecorators(function (surm) { return surm.actions.includes(CoreActions_1.CoreActions.bindProvider) && factories.hasOwnClassMetadata(surm.name, type); });
        var provides = [];
        matchs.forEach(function (surm) {
            var metadata = factories.getOwnTypeMetadata(surm.name, type);
            if (Array.isArray(metadata) && metadata.length > 0) {
                var jcfg = metadata.find(function (c) { return c && !!c.provide; });
                if (jcfg) {
                    var provideKey = container.getTokenKey(jcfg.provide, jcfg.alias);
                    provides.push(provideKey);
                    container.bindProvider(provideKey, jcfg.type);
                }
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
 * bind parameter type action.
 *
 * @export
 * @class BindParameterTypeAction
 * @extends {ActionComposite}
 */
var BindParameterTypeAction = /** @class */ (function (_super) {
    __extends(BindParameterTypeAction, _super);
    function BindParameterTypeAction() {
        return _super.call(this, CoreActions_1.CoreActions.bindParameterType) || this;
    }
    BindParameterTypeAction.prototype.working = function (container, data) {
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
 * bind property type action. to get the property autowride token of Type calss.
 *
 * @export
 * @class SetPropAction
 * @extends {ActionComposite}
 */
var BindPropertyTypeAction = /** @class */ (function (_super) {
    __extends(BindPropertyTypeAction, _super);
    function BindPropertyTypeAction() {
        return _super.call(this, CoreActions_1.CoreActions.bindPropertyType) || this;
    }
    BindPropertyTypeAction.prototype.working = function (container, data) {
        var target = data.target;
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
 * inject property value action, to inject property value for resolve instance.
 *
 * @export
 * @class SetPropAction
 * @extends {ActionComposite}
 */
var InjectPropertyAction = /** @class */ (function (_super) {
    __extends(InjectPropertyAction, _super);
    function InjectPropertyAction() {
        return _super.call(this, CoreActions_1.CoreActions.injectProperty) || this;
    }
    InjectPropertyAction.prototype.working = function (container, data) {
        if (!data.execResult) {
            this.parent.find(function (act) { return act.name === CoreActions_1.CoreActions.bindPropertyType; }).execute(container, data);
        }
        if (data.target && data.execResult && data.execResult.length) {
            data.execResult.reverse().forEach(function (prop, idx) {
                if (prop) {
                    var token = prop.provider ? container.getToken(prop.provider, prop.alias) : prop.type;
                    if (container.has(token)) {
                        data.target[prop.propertyKey] = container.resolve.apply(container, [token].concat((data.providers || [])));
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
 * bind parameters action.
 *
 * @export
 * @class BindParameterProviderAction
 * @extends {ActionComposite}
 */
var BindParameterProviderAction = /** @class */ (function (_super) {
    __extends(BindParameterProviderAction, _super);
    function BindParameterProviderAction() {
        return _super.call(this, CoreActions_1.CoreActions.bindParameterProviders) || this;
    }
    BindParameterProviderAction.prototype.working = function (container, data) {
        var target = data.target;
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
 * component before init action, to run @Component decorator class before init hooks.
 *
 * @export
 * @class ComponentBeforeInitAction
 * @extends {ActionComposite}
 */
var ComponentBeforeInitAction = /** @class */ (function (_super) {
    __extends(ComponentBeforeInitAction, _super);
    function ComponentBeforeInitAction() {
        return _super.call(this, CoreActions_1.CoreActions.componentBeforeInit) || this;
    }
    ComponentBeforeInitAction.prototype.working = function (container, data) {
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
 * component before init action, to run @Component decorator class before init hooks.
 *
 * @export
 * @class ComponentInitAction
 * @extends {ActionComposite}
 */
var ComponentInitAction = /** @class */ (function (_super) {
    __extends(ComponentInitAction, _super);
    function ComponentInitAction() {
        return _super.call(this, CoreActions_1.CoreActions.componentInit) || this;
    }
    ComponentInitAction.prototype.working = function (container, data) {
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
 * component after init action, to run @Component decorator class after init hooks.
 *
 * @export
 * @class ComponentAfterInitAction
 * @extends {ActionComposite}
 */
var ComponentAfterInitAction = /** @class */ (function (_super) {
    __extends(ComponentAfterInitAction, _super);
    function ComponentAfterInitAction() {
        return _super.call(this, CoreActions_1.CoreActions.componentAfterInit) || this;
    }
    ComponentAfterInitAction.prototype.working = function (container, data) {
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

var CacheAction_1 = createCommonjsModule(function (module, exports) {
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
 * cache action. To cache instance of Token. define cache expires in decorator.
 *
 * @export
 * @class CacheAction
 * @extends {ActionComposite}
 */
var CacheAction = /** @class */ (function (_super) {
    __extends(CacheAction, _super);
    function CacheAction() {
        return _super.call(this, CoreActions_1.CoreActions.cache) || this;
    }
    CacheAction.prototype.working = function (container, data) {
        if (data.singleton || !data.targetType || !utils.isClass(data.targetType)) {
            return data;
        }
        var cacheManager = container.get(utils.symbols.ICacheManager);
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
 * singleton action, to set the factory of Token as singleton.
 *
 * @export
 * @class SingletionAction
 * @extends {ActionComposite}
 */
var SingletionAction = /** @class */ (function (_super) {
    __extends(SingletionAction, _super);
    function SingletionAction() {
        return _super.call(this, CoreActions_1.CoreActions.singletion) || this;
    }
    SingletionAction.prototype.working = function (container, data) {
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

var AutorunAction_1 = createCommonjsModule(function (module, exports) {
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
 * Inject DrawType action.
 *
 * @export
 * @class SetPropAction
 * @extends {ActionComposite}
 */
var AutorunAction = /** @class */ (function (_super) {
    __extends(AutorunAction, _super);
    function AutorunAction() {
        return _super.call(this, CoreActions_1.CoreActions.autorun) || this;
    }
    AutorunAction.prototype.getDecorator = function () {
        return [decorators.IocModule, decorators.Autorun];
    };
    AutorunAction.prototype.working = function (container, data) {
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
                else if (factories.hasMethodMetadata(decorator, data.targetType)) {
                    var metas = factories.getMethodMetadata(decorator, data.targetType);
                    var meta_1;
                    utils.lang.forIn(metas, function (mm) {
                        if (mm && !meta_1) {
                            meta_1 = mm.find(function (it) { return !!it.autorun; });
                        }
                    });
                    if (meta_1 && meta_1.autorun) {
                        container.syncInvoke(data.tokenKey, meta_1.autorun);
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
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(ActionComposite_1);
__export(LifeState_1);
__export(CoreActions_1);
__export(NullAction);
__export(BindProviderAction_1);
__export(BindParameterTypeAction_1);
__export(BindPropertyTypeAction_1);
__export(InjectPropertyAction_1);
__export(BindParameterProviderAction_1);
__export(ComponentBeforeInitAction_1);
__export(ComponentInitAction_1);
__export(ComponentAfterInitAction_1);
__export(CacheAction_1);
__export(SingletonAction);
__export(AutorunAction_1);


});

unwrapExports(actions);

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
        var actions$$1 = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            actions$$1[_i - 1] = arguments[_i];
        }
        var type = this.getDecoratorType(decorator);
        return this.registerCustomDecorator.apply(this, [decorator, type].concat(actions$$1));
    };
    DefaultLifeScope.prototype.registerCustomDecorator = function (decorator, type) {
        var actions$$1 = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            actions$$1[_i - 2] = arguments[_i];
        }
        var types$$2 = this.toActionName(type);
        var name = decorator.toString();
        if (!this.decorators.some(function (d) { return d.name === name; })) {
            this.decorators.push({
                name: name,
                types: types$$2,
                actions: actions$$1
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
     * @param {(string | symbol)} propertyKey
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
            .add(factory.create(actions.CoreActions.componentAfterInit))))
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
    DefaultLifeScope.classAnnations = { "name": "DefaultLifeScope", "params": { "constructor": ["container"], "addAction": ["action", "nodepaths"], "registerDecorator": ["decorator", "actions"], "registerCustomDecorator": ["decorator", "type", "actions"], "execute": ["data", "names"], "getClassDecorators": ["match"], "getMethodDecorators": ["match"], "getPropertyDecorators": ["match"], "getParameterDecorators": ["match"], "getDecoratorType": ["decirator"], "isVaildDependence": ["target"], "getAtionByName": ["name"], "getClassAction": [], "getMethodAction": [], "getPropertyAction": [], "getParameterAction": [], "getConstructorParameters": ["type"], "getMethodParameters": ["type", "instance", "propertyKey"], "getParamerterNames": ["type", "propertyKey"], "isSingletonType": ["type"], "getMethodMetadatas": ["type", "propertyKey"], "filerDecorators": ["express"], "getParameters": ["type", "instance", "propertyKey"], "getTypeDecorators": ["decType", "match"], "buildAction": [], "toActionName": ["type"] } };
    return DefaultLifeScope;
}());
exports.DefaultLifeScope = DefaultLifeScope;


});

unwrapExports(DefaultLifeScope_1);
var DefaultLifeScope_2 = DefaultLifeScope_1.DefaultLifeScope;

var MethodAccessor_1 = createCommonjsModule(function (module, exports) {
var __awaiter = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (commonjsGlobal && commonjsGlobal.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
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
        return this.container.get(utils.symbols.IProviderMatcher);
    };
    MethodAccessor.prototype.invoke = function (token, propertyKey, target) {
        var providers = [];
        for (var _i = 3; _i < arguments.length; _i++) {
            providers[_i - 3] = arguments[_i];
        }
        return __awaiter(this, void 0, void 0, function () {
            var targetClass, actionData, lifeScope, parameters, paramInstances, _a;
            return __generator(this, function (_b) {
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
                    case 2: throw new Error("type: " + targetClass + " has no method " + propertyKey + ".");
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    MethodAccessor.prototype.syncInvoke = function (token, propertyKey, target) {
        var providers = [];
        for (var _i = 3; _i < arguments.length; _i++) {
            providers[_i - 3] = arguments[_i];
        }
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
            throw new Error("type: " + targetClass + " has no method " + propertyKey + ".");
        }
        var _a;
    };
    MethodAccessor.prototype.createSyncParams = function (params) {
        var _this = this;
        var providers = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            providers[_i - 1] = arguments[_i];
        }
        var providerMap = (_a = this.getMatcher()).matchProviders.apply(_a, [params].concat(providers));
        return params.map(function (param, index) {
            if (param.name && providerMap.has(param.name)) {
                return providerMap.resolve(param.name);
            }
            else if (utils.isToken(param.type)) {
                return (_a = _this.container).resolve.apply(_a, [param.type].concat(providers));
            }
            else {
                return undefined;
            }
            var _a;
        });
        var _a;
    };
    MethodAccessor.prototype.createParams = function (params) {
        var _this = this;
        var providers = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            providers[_i - 1] = arguments[_i];
        }
        var providerMap = (_a = this.getMatcher()).matchProviders.apply(_a, [params].concat(providers));
        return Promise.all(params.map(function (param, index) {
            if (param.name && providerMap.has(param.name)) {
                return providerMap.resolve(param.name);
            }
            else if (utils.isToken(param.type)) {
                return (_a = _this.container).resolve.apply(_a, [param.type].concat(providers));
            }
            else {
                return undefined;
            }
            var _a;
        }));
        var _a;
    };
    MethodAccessor.classAnnations = { "name": "MethodAccessor", "params": { "constructor": ["container"], "getMatcher": [], "invoke": ["token", "propertyKey", "target", "providers"], "syncInvoke": ["token", "propertyKey", "target", "providers"], "createSyncParams": ["params", "providers"], "createParams": ["params", "providers"] } };
    return MethodAccessor;
}());
exports.MethodAccessor = MethodAccessor;


});

unwrapExports(MethodAccessor_1);
var MethodAccessor_2 = MethodAccessor_1.MethodAccessor;

var ProviderMap_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

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
                return (_a = _this.container).resolve.apply(_a, [provider].concat(providers));
                var _a;
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
        if (!this.maps.has(provide)) {
            return (!utils.isNumber(provide) && this.container.has(provide)) ? (_a = this.container).resolve.apply(_a, [provide].concat(providers)) : null;
        }
        var provider = this.maps.get(provide);
        return utils.isToken(provider) ? (_b = this.container).resolve.apply(_b, [provider].concat(providers)) : provider.apply(void 0, providers);
        var _a, _b;
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
var ProviderMap_2 = ProviderMap_1.ProviderMap;

var Provider_1 = createCommonjsModule(function (module, exports) {
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
    /**
     * create custom provider.
     *
     * @static
     * @param {Token<any>} [type]
     * @param {ToInstance<any>} [toInstance]
     * @param {*} [value]
     * @returns {CustomProvider}
     * @memberof Provider
     */
    Provider.createCustom = function (type, toInstance, value) {
        return new CustomProvider(type, toInstance, value);
    };
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
    /**
     * create async param provider.
     *
     * @static
     * @param {(string | string[])} files
     * @param {Token<any>} token
     * @param {number} [index]
     * @param {string} [method]
     * @param {(any)} [value]
     * @returns {AsyncParamProvider}
     * @memberof Provider
     */
    Provider.createAsyncParam = function (files, token, index, method, value) {
        return new AsyncParamProvider(files, token, index, method, value);
    };
    Provider.classAnnations = { "name": "Provider", "params": { "constructor": ["type", "value"], "resolve": ["container", "providers"], "create": ["type", "value"], "createExtends": ["token", "value", "extendsTarget"], "createCustom": ["type", "toInstance", "value"], "createInvoke": ["token", "method", "value"], "createParam": ["token", "value", "index", "method"], "createAsyncParam": ["files", "token", "index", "method", "value"] } };
    return Provider;
}());
exports.Provider = Provider;
var CustomProvider = /** @class */ (function (_super) {
    __extends(CustomProvider, _super);
    function CustomProvider(type, toInstance, value) {
        var _this = _super.call(this, type, value) || this;
        _this.toInstance = toInstance;
        return _this;
    }
    CustomProvider.prototype.resolve = function (container) {
        var providers = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            providers[_i - 1] = arguments[_i];
        }
        if (this.toInstance) {
            return this.toInstance.apply(this, [container].concat(providers));
        }
        return _super.prototype.resolve.apply(this, [container].concat(providers));
    };
    CustomProvider.classAnnations = { "name": "CustomProvider", "params": { "constructor": ["type", "toInstance", "value"], "resolve": ["container", "providers"] } };
    return CustomProvider;
}(Provider));
exports.CustomProvider = CustomProvider;
/**
 * InvokeProvider
 *
 * @export
 * @class InvokeProvider
 * @extends {Provider}
 */
var InvokeProvider = /** @class */ (function (_super) {
    __extends(InvokeProvider, _super);
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
    __extends(ParamProvider, _super);
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
    __extends(ExtendsProvider, _super);
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
/**
 * async param provider.
 * async load source file and execution as param value.
 *
 * @export
 * @interface AsyncParamProvider
 * @extends {ParamProvider}
 */
var AsyncParamProvider = /** @class */ (function (_super) {
    __extends(AsyncParamProvider, _super);
    function AsyncParamProvider(files, token, index, method, value) {
        var _this = _super.call(this, token, value, index, method) || this;
        _this.files = files;
        return _this;
    }
    AsyncParamProvider.prototype.resolve = function (container) {
        var _this = this;
        var providers = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            providers[_i - 1] = arguments[_i];
        }
        var buider = container.get(utils.symbols.IContainerBuilder);
        return buider.loadModule(container, {
            files: this.files
        })
            .then(function () {
            return _super.prototype.resolve.apply(_this, [container].concat(providers));
        });
    };
    AsyncParamProvider.classAnnations = { "name": "AsyncParamProvider", "params": { "constructor": ["files", "token", "index", "method", "value"], "resolve": ["container", "providers"] } };
    return AsyncParamProvider;
}(ParamProvider));
exports.AsyncParamProvider = AsyncParamProvider;


});

unwrapExports(Provider_1);
var Provider_2 = Provider_1.Provider;
var Provider_3 = Provider_1.CustomProvider;
var Provider_4 = Provider_1.InvokeProvider;
var Provider_5 = Provider_1.ParamProvider;
var Provider_6 = Provider_1.ExtendsProvider;
var Provider_7 = Provider_1.AsyncParamProvider;

var providers = createCommonjsModule(function (module, exports) {
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });


__export(Provider_1);
// export * from './ExtendsProvider';
__export(ProviderMap_1);
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
        var map = this.container.resolve(providers.ProviderMap);
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
            else {
                if (utils.isBaseObject(p)) {
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
                else if (utils.isFunction(p)) {
                    map.add(name, function () { return p; });
                }
                else {
                    map.add(index, p);
                }
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
        var map = this.container.resolve(providers.ProviderMap);
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
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });








__export(actions);
__export(decorators);
__export(factories);
__export(providers);
__export(ActionFactory_1);
__export(DefaultLifeScope_1);
__export(ProviderMatcher_1);
__export(MethodAccessor_1);
__export(CacheManager_1);
/**
 * register core for container.
 *
 * @export
 * @param {IContainer} container
 */
function registerCores(container) {
    container.registerSingleton(utils.symbols.LifeScope, function () { return new DefaultLifeScope_1.DefaultLifeScope(container); });
    container.register(providers.ProviderMap, function () { return new providers.ProviderMap(container); });
    container.registerSingleton(utils.symbols.ICacheManager, function () { return new CacheManager_1.CacheManager(container); });
    container.registerSingleton(utils.symbols.IProviderMatcher, function () { return new ProviderMatcher_1.ProviderMatcher(container); });
    container.registerSingleton(utils.symbols.IMethodAccessor, function () { return new MethodAccessor_1.MethodAccessor(container); });
    var lifeScope = container.get(utils.symbols.LifeScope);
    lifeScope.registerDecorator(decorators.Injectable, actions.CoreActions.bindProvider, actions.CoreActions.cache);
    lifeScope.registerDecorator(decorators.Component, actions.CoreActions.bindProvider, actions.CoreActions.cache, actions.CoreActions.componentBeforeInit, actions.CoreActions.componentInit, actions.CoreActions.componentAfterInit);
    lifeScope.registerDecorator(decorators.Singleton, actions.CoreActions.bindProvider);
    lifeScope.registerDecorator(decorators.Abstract, actions.CoreActions.bindProvider, actions.CoreActions.cache);
    lifeScope.registerDecorator(decorators.AutoWired, actions.CoreActions.bindParameterType, actions.CoreActions.bindPropertyType);
    lifeScope.registerDecorator(decorators.Inject, actions.CoreActions.bindParameterType, actions.CoreActions.bindPropertyType);
    lifeScope.registerDecorator(decorators.Param, actions.CoreActions.bindParameterType, actions.CoreActions.bindPropertyType);
    lifeScope.registerDecorator(decorators.Method, actions.CoreActions.bindParameterProviders);
    lifeScope.registerDecorator(decorators.Autorun, actions.CoreActions.autorun);
    lifeScope.registerDecorator(decorators.IocModule, actions.CoreActions.autorun, actions.CoreActions.componentBeforeInit, actions.CoreActions.componentInit, actions.CoreActions.componentAfterInit);
    container.register(Date, function () { return new Date(); });
    container.register(String, function () { return ''; });
    container.register(Number, function () { return Number.NaN; });
    container.register(Boolean, function () { return undefined; });
}
exports.registerCores = registerCores;


});

unwrapExports(core);
var core_1 = core.registerCores;

var Container_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });





/**
 * Container.
 */
var Container = /** @class */ (function () {
    function Container() {
        this.init();
    }
    /**
     * Retrieves an instance from the container based on the provided token.
     *
     * @template T
     * @param {Token<T>} token
     * @param {string} [alias]
     * @param {T} [notFoundValue]
     * @returns {T}
     * @memberof Container
     */
    Container.prototype.get = function (token, alias) {
        return this.resolve(alias ? this.getTokenKey(token, alias) : token);
    };
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
        var key = this.getTokenKey(token);
        if (!this.hasRegister(key)) {
            console.error('have not register', key);
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
        this.get(utils.symbols.ICacheManager).destroy(targetType);
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
        if (token instanceof Registration_1.Registration) {
            return token;
        }
        else {
            if (alias && utils.isFunction(token)) {
                return new Registration_1.Registration(token, alias);
            }
            return token;
        }
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
        if (token instanceof Registration_1.Registration) {
            return token.toString();
        }
        else {
            if (alias) {
                return new Registration_1.Registration(token, alias).toString();
            }
            return token;
        }
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
        return this.hasRegister(key);
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
    Container.prototype.unregister = function (token) {
        var key = this.getTokenKey(token);
        if (this.hasRegister(key)) {
            this.factories.delete(key);
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
            this.provideTypes.set(provide, provider);
        }
        else if (utils.isToken(provider)) {
            var token = provider;
            while (this.provideTypes.has(token) && !utils.isClass(token)) {
                token = this.provideTypes.get(token);
                if (utils.isClass(token)) {
                    this.provideTypes.set(provide, token);
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
     * @returns {Type<T>}
     * @memberof Container
     */
    Container.prototype.getTokenImpl = function (token) {
        if (utils.isClass(token)) {
            return token;
        }
        if (this.provideTypes.has(token)) {
            return this.provideTypes.get(token);
        }
        return null;
    };
    /**
    * get life scope of container.
    *
    * @returns {LifeScope}
    * @memberof IContainer
    */
    Container.prototype.getLifeScope = function () {
        return this.get(utils.symbols.LifeScope);
    };
    /**
     * use modules.
     *
     * @param {...ModuleType[]} modules
     * @returns {this}
     * @memberof Container
     */
    Container.prototype.use = function () {
        var modules = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            modules[_i] = arguments[_i];
        }
        (_a = this.get(utils.symbols.IContainerBuilder)).syncLoadModule.apply(_a, [this].concat(modules));
        return this;
        var _a;
    };
    /**
     * invoke method async.
     *
     * @template T
     * @param {Token<any>} token
     * @param {(string | symbol)} propertyKey
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
        return (_a = this.get(utils.symbols.IMethodAccessor)).invoke.apply(_a, [token, propertyKey, instance].concat(providers));
        var _a;
    };
    /**
     * invoke method.
     *
     * @template T
     * @param {Token<any>} token
     * @param {(string | symbol)} propertyKey
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
        return (_a = this.get(utils.symbols.IMethodAccessor)).syncInvoke.apply(_a, [token, propertyKey, instance].concat(providers));
        var _a;
    };
    Container.prototype.createSyncParams = function (params) {
        var providers = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            providers[_i - 1] = arguments[_i];
        }
        return (_a = this.get(utils.symbols.IMethodAccessor)).createSyncParams.apply(_a, [params].concat(providers));
        var _a;
    };
    Container.prototype.createParams = function (params) {
        var providers = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            providers[_i - 1] = arguments[_i];
        }
        return (_a = this.get(utils.symbols.IMethodAccessor)).createParams.apply(_a, [params].concat(providers));
        var _a;
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
        this.bindProvider(utils.symbols.IContainer, function () { return _this; });
        core.registerCores(this);
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
            if (singleton && _this.singleton.has(key)) {
                return _this.singleton.get(key);
            }
            if (providers.length < 1) {
                var lifecycleData = {
                    tokenKey: key,
                    targetType: ClassT,
                    singleton: singleton
                };
                lifeScope.execute(lifecycleData, core.CoreActions.cache);
                if (lifecycleData.execResult && lifecycleData.execResult instanceof ClassT) {
                    return lifecycleData.execResult;
                }
            }
            lifeScope.execute({
                tokenKey: key,
                targetType: ClassT,
                params: parameters,
                providers: providers,
                singleton: singleton
            }, types.IocState.runtime, core.LifeState.beforeCreateArgs);
            var args = _this.createSyncParams.apply(_this, [parameters].concat(providers));
            lifeScope.execute({
                tokenKey: key,
                targetType: ClassT,
                args: args,
                params: parameters,
                providers: providers,
                singleton: singleton
            }, types.IocState.runtime, core.LifeState.beforeConstructor);
            var instance = new (ClassT.bind.apply(ClassT, [void 0].concat(args)))();
            lifeScope.execute({
                tokenKey: key,
                target: instance,
                targetType: ClassT,
                args: args,
                params: parameters,
                providers: providers,
                singleton: singleton
            }, types.IocState.runtime, core.LifeState.afterConstructor);
            lifeScope.execute({
                tokenKey: key,
                target: instance,
                targetType: ClassT,
                args: args,
                params: parameters,
                providers: providers,
                singleton: singleton
            }, types.IocState.runtime, core.LifeState.onInit);
            lifeScope.execute({
                tokenKey: key,
                target: instance,
                targetType: ClassT,
                args: args,
                params: parameters,
                providers: providers,
                singleton: singleton
            }, types.IocState.runtime, core.LifeState.AfterInit);
            lifeScope.execute({
                tokenKey: key,
                target: instance,
                targetType: ClassT
            }, core.CoreActions.cache);
            return instance;
        };
        this.factories.set(key, factory);
        lifeScope.execute({
            tokenKey: key,
            targetType: ClassT
        }, types.IocState.design);
    };
    Container.classAnnations = { "name": "Container", "params": { "constructor": [], "get": ["token", "alias"], "resolve": ["token", "providers"], "clearCache": ["targetType"], "getToken": ["token", "alias"], "getTokenKey": ["token", "alias"], "register": ["token", "value"], "has": ["token", "alias"], "hasRegister": ["key"], "unregister": ["token"], "registerSingleton": ["token", "value"], "registerValue": ["token", "value"], "bindProvider": ["provide", "provider"], "getTokenImpl": ["token"], "getLifeScope": [], "use": ["modules"], "invoke": ["token", "propertyKey", "instance", "providers"], "syncInvoke": ["token", "propertyKey", "instance", "providers"], "createSyncParams": ["params", "providers"], "createParams": ["params", "providers"], "cacheDecorator": ["map", "action"], "init": [], "registerFactory": ["token", "value", "singleton"], "createCustomFactory": ["key", "factory", "singleton"], "bindTypeFactory": ["key", "ClassT", "singleton"] } };
    return Container;
}());
exports.Container = Container;


});

unwrapExports(Container_1);
var Container_2 = Container_1.Container;

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
    DefaultModuleLoader.prototype.load = function (options) {
        var _this = this;
        if (options.files) {
            return Promise.all(options.files).then(function (flies) {
                return flies.map(function (fp) {
                    return _this.loadModule(fp);
                });
            });
        }
        else {
            return Promise.resolve([]);
        }
    };
    DefaultModuleLoader.prototype.loadModule = function (file) {
        var loader = this.getLoader();
        return loader(file);
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
    DefaultModuleLoader.classAnnations = { "name": "DefaultModuleLoader", "params": { "constructor": [], "getLoader": [], "load": ["options"], "loadModule": ["file"], "createLoader": [] } };
    return DefaultModuleLoader;
}());
exports.DefaultModuleLoader = DefaultModuleLoader;


});

unwrapExports(DefaultModuleLoader_1);
var DefaultModuleLoader_2 = DefaultModuleLoader_1.DefaultModuleLoader;

var DefaultContainerBuilder_1 = createCommonjsModule(function (module, exports) {
var __awaiter = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (commonjsGlobal && commonjsGlobal.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
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
        this.loader = loader;
        if (!loader) {
            this.loader = new DefaultModuleLoader_1.DefaultModuleLoader();
        }
    }
    DefaultContainerBuilder.prototype.create = function () {
        var _this = this;
        var container = new Container_1.Container();
        container.bindProvider(utils.symbols.IContainerBuilder, function () { return _this; });
        return container;
    };
    /**
     * build container.
     *
     * @param {AsyncLoadOptions} [options]
     * @returns { Promise<IContainer>}
     * @memberof ContainerBuilder
     */
    DefaultContainerBuilder.prototype.build = function (options) {
        return __awaiter(this, void 0, void 0, function () {
            var container;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        container = this.create();
                        if (!options) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.loadModule(container, options)];
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
     * @param {AsyncLoadOptions} options
     * @returns {Promise<Type<any>[]>}
     * @memberof ContainerBuilder
     */
    DefaultContainerBuilder.prototype.loadModule = function (container, options) {
        return __awaiter(this, void 0, void 0, function () {
            var regModules;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.loadTypes(options)];
                    case 1:
                        regModules = _a.sent();
                        return [2 /*return*/, this.registers(container, regModules)];
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
        var regModules = this.getModules.apply(this, modules);
        return this.registers(container, regModules);
    };
    /**
     * load types from module.
     *
     * @param {LoadOptions} options
     * @returns {Promise<Type<any>[]>}
     * @memberof IContainerBuilder
     */
    DefaultContainerBuilder.prototype.loadTypes = function (options) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var modules, mds;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!options) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.loader.load(options)];
                    case 1:
                        modules = _a.sent();
                        if (!(options.modules && options.modules.length)) return [3 /*break*/, 3];
                        return [4 /*yield*/, Promise.all(options.modules.map(function (nmd) {
                                return utils.isString(nmd) ? _this.loader.loadModule(nmd) : nmd;
                            }))];
                    case 2:
                        mds = _a.sent();
                        modules = modules.concat(mds);
                        _a.label = 3;
                    case 3: return [2 /*return*/, this.getModules.apply(this, modules)];
                }
            });
        });
    };
    DefaultContainerBuilder.prototype.registers = function (container, types) {
        types = types || [];
        types.forEach(function (typ) {
            container.register(typ);
        });
        return types;
    };
    DefaultContainerBuilder.prototype.getModules = function () {
        var _this = this;
        var modules = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            modules[_i] = arguments[_i];
        }
        var regModules = [];
        modules.forEach(function (m) {
            var types = _this.getTypes(m);
            var iocModule = types.find(function (it) { return core.hasOwnClassMetadata(core.IocModule, it); });
            if (iocModule) {
                regModules.push(iocModule);
            }
            else {
                regModules.push.apply(regModules, types);
            }
        });
        return regModules;
    };
    DefaultContainerBuilder.prototype.getTypes = function (regModule) {
        var regModules = [];
        if (utils.isClass(regModule)) {
            regModules.push(regModule);
        }
        else {
            var rmodules = regModule['exports'] ? regModule['exports'] : regModule;
            for (var p in rmodules) {
                if (utils.isClass(rmodules[p])) {
                    regModules.push(rmodules[p]);
                }
            }
        }
        return regModules;
    };
    DefaultContainerBuilder.classAnnations = { "name": "DefaultContainerBuilder", "params": { "constructor": ["loader"], "create": [], "build": ["options"], "loadModule": ["container", "options"], "syncBuild": ["modules"], "syncLoadModule": ["container", "modules"], "loadTypes": ["options"], "registers": ["container", "types"], "getModules": ["modules"], "getTypes": ["regModule"] } };
    return DefaultContainerBuilder;
}());
exports.DefaultContainerBuilder = DefaultContainerBuilder;


});

unwrapExports(DefaultContainerBuilder_1);
var DefaultContainerBuilder_2 = DefaultContainerBuilder_1.DefaultContainerBuilder;

var D__workspace_github_tsioc_packages_core_lib = createCommonjsModule(function (module, exports) {
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(Container_1);
__export(types);
__export(Registration_1);
__export(DefaultModuleLoader_1);
__export(DefaultContainerBuilder_1);
__export(utils);
__export(components);
__export(core);


});

var index$7 = unwrapExports(D__workspace_github_tsioc_packages_core_lib);

return index$7;

})));
