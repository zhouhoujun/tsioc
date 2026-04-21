"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InjectFlags = exports.InjectToken = void 0;
exports.token = token;
exports.getToken = getToken;
exports.getTokenOf = getTokenOf;
const type_1 = require("./metadata/type");
const chk_1 = require("./utils/chk");
/**
 * inject token.
 *
 * 注入标记令牌类
 *
 * @export
 * @class InjectToken
 * @template T
 */
class InjectToken {
    constructor(desc, providedIn = null) {
        this.desc = desc;
        this.providedIn = providedIn;
    }
    toString() {
        return `Token ${this.desc}`;
    }
    to(alias) {
        return alias ? new InjectToken(`${this.desc}_${alias}`, this.providedIn) : this;
    }
}
exports.InjectToken = InjectToken;
/**
 * create token, type of {@link InjectToken}.
 * @param desc
 */
function token(desc, providedIn) {
    return new InjectToken(desc, providedIn);
}
const tokens = new Map();
const tokenByAlias = new WeakMap();
function getTokenKey(token, alias) {
    if (typeof token === 'string') {
        return `str:${token}:${alias}`;
    }
    if (token instanceof InjectToken) {
        return `inj:${token.toString()}:${alias}`;
    }
    return `typ:${(0, type_1.getTypeName)(token)}:${alias}`;
}
function getToken(token, alias) {
    if (!alias)
        return token;
    const key = getTokenKey(token, alias);
    const cached = tokens.get(key);
    if (cached)
        return cached;
    let maps;
    if (typeof token !== 'string') {
        maps = tokenByAlias.get(token);
        if (!maps) {
            maps = new Map();
            tokenByAlias.set(token, maps);
        }
    }
    let atk;
    if (token instanceof InjectToken) {
        atk = token.to(alias);
    }
    else {
        const type = (0, chk_1.isString)(token) ? token : (0, type_1.getTypeName)(token);
        atk = new InjectToken(`${type}_${alias}`);
    }
    tokens.set(key, atk);
    maps?.set(alias, atk);
    return atk;
}
/**
 * get token of type
 * @param type target type
 * @param alias token alias
 * @param propertyKey target propertyKey
 * @returns
 */
function getTokenOf(type, alias, propertyKey) {
    return getToken((0, type_1.getType)(type), propertyKey ? `${propertyKey}_${alias}` : alias);
}
/**
 * Injection flags for DI.
 *
 * @publicApi
 */
var InjectFlags;
(function (InjectFlags) {
    /** Check self and check parent injector if needed */
    InjectFlags[InjectFlags["Default"] = 0] = "Default";
    /**
     * Specifies that an injector should retrieve a dependency from any injector until reaching the
     * host element of the current component. (Only used with Element Injector)
     */
    InjectFlags[InjectFlags["Host"] = 1] = "Host";
    /** Don't ascend to ancestors of the node requesting injection. */
    InjectFlags[InjectFlags["Self"] = 2] = "Self";
    /** Skip the node that is requesting injection. */
    InjectFlags[InjectFlags["SkipSelf"] = 4] = "SkipSelf";
    /** Inject `defaultValue` instead if token not found. */
    InjectFlags[InjectFlags["Optional"] = 8] = "Optional";
    // /**
    //  * HostOnly for InvocationContext.
    //  */
    // HostOnly = 0b10000,
    // /**
    //  * None Singleton
    //  */
    // NonSingleton = 0b100000,
    /**
     * Resolve value with new Context.
     */
    InjectFlags[InjectFlags["Resolve"] = 64] = "Resolve";
    /**
     * Param provide with Request Context.
     */
    InjectFlags[InjectFlags["Request"] = 128] = "Request";
    InjectFlags[InjectFlags["NonSingleton"] = 129] = "NonSingleton";
})(InjectFlags || (exports.InjectFlags = InjectFlags = {}));
//# sourceMappingURL=tokens.js.map