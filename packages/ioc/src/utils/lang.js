"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nextTick = exports.immediate = exports.Defer = void 0;
exports.assign = assign;
exports.omit = omit;
exports.pick = pick;
exports.forIn = forIn;
exports.deepForEach = deepForEach;
exports.deepClone = deepClone;
exports.first = first;
exports.remove = remove;
exports.last = last;
exports.getParentType = getParentType;
exports.getTypeChain = getTypeChain;
exports.deepTypeChain = deepTypeChain;
exports.hasItem = hasItem;
exports.isBaseOf = isBaseOf;
exports.isExtends = isExtends;
exports.getTypes = getTypes;
exports.cleanObj = cleanObj;
exports.defer = defer;
exports.delay = delay;
exports.step = step;
exports.some = some;
exports.promisify = promisify;
const chk_1 = require("./chk");
const obj_1 = require("./obj");
const type_1 = require("../metadata/type");
/**
 * assign source object to target object.
 *
 * @export
 * @param {any} target target object
 * @param {any} source source object
 * @param {...string[]} excludes  exclude fields
 * @returns {*}
 */
function assign(target, source, ...excludes) {
    if (!target || !source)
        return null;
    for (const key in source) {
        if (!excludes.includes(key)) {
            target[key] = source[key];
        }
    }
    return target;
}
/**
 * create an new object from target object omit some field.
 *
 * @export
 * @param {any} target
 * @param {...string[]} excludes  exclude fields
 * @returns {*}
 */
function omit(target, ...excludes) {
    if (!target)
        return null;
    const result = {};
    for (const key in target) {
        if (!excludes.includes(key)) {
            result[key] = target[key];
        }
    }
    return result;
}
/**
 * create new object with pick fields.
 * @param target
 * @param fields
 * @returns
 */
function pick(target, ...fields) {
    const obj = {};
    for (const fd of fields) {
        const val = target[fd];
        if (!(0, chk_1.isNil)(val)) {
            obj[fd] = val;
        }
    }
    return obj;
}
function forIn(target, iterator) {
    if (!target)
        return;
    if ((0, chk_1.isArray)(target)) {
        for (let i = 0, len = target.length; i < len; i++) {
            if (iterator(target[i], i) === false) {
                break;
            }
        }
    }
    else {
        for (const key in target) {
            if (iterator(target[key], key) === false) {
                break;
            }
        }
    }
}
/**
 * deep for each.
 * @param input
 * @param fn iterator callback.
 * @param isRecord is item record or not.
 * @param getRecord get record values.
 */
function deepForEach(input, fn, isRecord, getRecord) {
    const ps = [];
    for (let i = 0, len = input.length; i < len; i++) {
        const value = input[i];
        if ((0, chk_1.isArray)(value)) {
            const reslut = deepForEach(value, fn, isRecord, getRecord);
            if (reslut) {
                ps.push(reslut);
            }
        }
        else if (value && isRecord && isRecord(value)) {
            const reslut = deepForEach(getRecord ? getRecord(value) : Object.values(value), fn, isRecord, getRecord);
            if (reslut) {
                ps.push(reslut);
            }
        }
        else if (value) {
            const reslut = fn(value);
            if (reslut && (0, chk_1.isPromise)(reslut)) {
                ps.push(reslut);
            }
        }
    }
    if (ps.length)
        return Promise.all(ps).then();
}
/**
 * deep clone.
 * @param input
 * @returns
 */
function deepClone(input, defaultValue, mergeArray) {
    if (!(0, chk_1.isObject)(input))
        return defaultValue ? deepClone(defaultValue) : null;
    if (Array.isArray(input))
        return input.map(item => deepClone(item, defaultValue, mergeArray));
    return Object.entries(input).reduce((result, [key, value]) => {
        if ((0, obj_1.isPlainObject)(value)) {
            result[key] = deepClone(value, defaultValue?.[key], mergeArray);
        }
        else if (!(0, chk_1.isUndefined)(value)) {
            if (mergeArray && Array.isArray(value) && Array.isArray(defaultValue?.[key])) {
                value = mergeArray(key, value, defaultValue[key]);
            }
            result[key] = value;
        }
        return result;
    }, { ...defaultValue });
}
/**
 * first.
 *
 * @export
 * @template T
 * @param {T[]} list
 * @returns {T}
 */
function first(list) {
    if (list?.length) {
        return list[0];
    }
    return null;
}
/**
 * remove element.
 * @param list list
 * @param el remove item.
 */
function remove(list, el) {
    if (!list?.length || (0, chk_1.isNil)(el)) {
        return null;
    }
    const idx = list.indexOf(el);
    return idx >= 0 ? list.splice(idx, 1) : null;
}
/**
 * last.
 *
 * @export
 * @template T
 * @param {T[]} list
 * @returns {T}
 */
function last(list) {
    if (list?.length) {
        return list[list.length - 1];
    }
    return null;
}
/**
 * get target type parent type.
 *
 * @export
 * @param {AbstractType} target
 * @returns {AbstractType}
 */
function getParentType(target) {
    const ty = Object.getPrototypeOf(target?.prototype)?.constructor ?? Object.getPrototypeOf(target);
    return ty === Object ? null : ty;
}
/**
 * get all parent type in chain.
 *
 * @export
 * @param {AbstractType} target
 * @returns {AbstractType[]}
 */
function getTypeChain(target) {
    const types = [];
    while (target) {
        types.push(target);
        target = getParentType(target);
    }
    return types;
}
/**
 * iterate base classes of target in chain. return false will break iterate.
 *
 * @export
 * @param {AbstractType} target
 * @param {(token: AbstractType) => any} express
 */
function deepTypeChain(target, express) {
    while (target) {
        if (express(target) === false) {
            break;
        }
        target = getParentType(target);
    }
}
/**
 * check array has item or not.
 * @param arr
 * @returns
 */
function hasItem(arr) {
    return (0, chk_1.isArray)(arr) && arr.length > 0;
}
/**
 * is base class type of.
 * @param target target type
 * @param baseType base class type.
 */
function isBaseOf(target, baseType) {
    return (0, chk_1.isFunction)(target) && (Object.getPrototypeOf(target.prototype) instanceof baseType || Object.getPrototypeOf(target) === baseType);
}
/**
 * target is extends class of base type or not.
 *
 * @export
 * @param {Token} target
 * @param {(AbstractType | ((type: AbstractType) => boolean))} baseType
 * @returns {boolean}
 */
function isExtends(target, baseType) {
    let isExtnds = false;
    if ((0, chk_1.isFunction)(target) && baseType) {
        const isCls = (0, type_1.isType)(baseType);
        deepTypeChain(target, t => {
            if (isCls) {
                isExtnds = t === baseType;
            }
            else {
                isExtnds = baseType(t);
            }
            return !isExtnds;
        });
    }
    return isExtnds;
}
/**
 * get all class types in modules.
 *
 * @param {Modules[]} mds
 * @param {...Express<Type, boolean>[]} filters
 * @returns {Type[]}
 */
function getTypes(mds) {
    const types = [];
    mds && deepForEach((0, chk_1.isArray)(mds) ? mds : (0, obj_1.isPlainObject)(mds) ? Object.values(mds) : [mds], ty => {
        (0, type_1.isType)(ty) && types.push(ty);
    }, v => (0, obj_1.isPlainObject)(v));
    return types;
}
const cleanKeys = ['injector', 'platform', 'context'];
/**
 * clean object.
 * @param obj.
 */
function cleanObj(obj, keys = cleanKeys) {
    if (!obj)
        return;
    for (let i = 0, len = keys.length; i < len; i++) {
        const k = keys[i];
        if (obj[k])
            obj[k] = null;
    }
}
/**
 * defer
 *
 * @export
 * @class Defer
 * @template T
 */
class Defer {
    /**
     * create defer.
     *
     * @static
     * @template T
     * @param {((val: T) => T | PromiseLike<T>)} [then]
     * @returns {Defer<T>}
     */
    static create(then) {
        const df = new Defer();
        if (then) {
            df.promise = df.promise.then(then);
            return df;
        }
        else {
            return df;
        }
    }
    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }
}
exports.Defer = Defer;
/**
 * create defer.
 *
 * @export
 * @template T
 * @param {((val: T) => T | PromiseLike<T>)} [then]
 * @returns {Defer<T>}
 */
function defer(then) {
    return Defer.create(then);
}
/**
 * create delay.
 * @param times delay timeout ms.
 */
function delay(times, work, ...args) {
    const defer = Defer.create();
    const timout = setTimeout(() => {
        timout && clearTimeout(timout);
        defer.resolve();
        work?.(...args);
    }, times);
    return defer.promise;
}
exports.immediate = typeof setImmediate !== 'undefined' ? setImmediate : (callback, ...args) => delay(0, callback, ...args);
exports.nextTick = typeof process !== 'undefined' ? process.nextTick : (callback, ...args) => delay(0, callback, ...args);
/**
 * run promise step by step.
 *
 * @export
 * @template T
 * @param {(T | PromiseLike<T> | ((value: T) => T | PromiseLike<T>))[]} promises
 * @param {T} initVal init value.
 * @param {(val: T) => boolean} guard can step next.
 * @returns
 */
async function step(promises, initVal, guard) {
    let val = initVal ?? null;
    for (let i = 0; i < promises.length; i++) {
        const handle = promises[i];
        val = await ((0, chk_1.isFunction)(handle) ? handle(val) : handle);
        if (guard && !guard(val)) {
            break;
        }
    }
    return val;
}
/**
 * promise some.
 * @param promises
 * @param filter
 * @returns
 */
function some(promises, filter) {
    return step(promises, undefined, (v) => !filter(v));
}
function promisify(nodeFunction, owner) {
    if (owner) {
        nodeFunction = nodeFunction.bind(owner);
    }
    return (...args) => {
        return new Promise((r, j) => {
            nodeFunction(...args, (err, result) => {
                if (err)
                    j(err);
                r(result);
            });
        });
    };
}
//# sourceMappingURL=lang.js.map