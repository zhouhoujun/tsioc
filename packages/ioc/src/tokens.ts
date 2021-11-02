import { AbstractType, Type, ClassType } from './types';
import { isFunction, isClassType, isSymbol, isString } from './utils/chk';
import { getClassName } from './utils/lang';


/**
 * inject token.
 *
 * @export
 * @class InjectToken
 * @template T
 */
export class InjectToken<T = any> {
    constructor(private desc: string, readonly providedIn: Type | 'root' | 'platfrom' | string = '') { }

    toString(): string {
        return `Token ${this.desc}`;
    }

    to(alias: string): InjectToken<T> {
        return alias ? new InjectToken(`${this.desc}_${alias}`, this.providedIn) : this;
    }
}

/**
 * factory tocken.
 */
export type Token<T = any> = string | symbol | InjectToken<T> | ClassType<T>;

/**
 * provide token
 */
export type ProvideToken<T> = string | symbol | InjectToken<T> | AbstractType;


/**
 * parse id string to token id.
 * @param key id
 */
export function tokenId<T = any>(key: string, ): Token<T> {
    return Symbol(key);
}


function format(token: Token) {
    return isFunction(token) ? `{${getClassName(token)}}` : token.toString();
}

/**
 * get token with alias.
 * @param token token
 * @param alias the alias of token.
 */
export function getToken<T>(token: Token<T>, alias?: string): Token<T> {
    if (!alias) return token;
    if (token instanceof InjectToken) {
        return token.to(alias);
    }
    return `${format(token)}_${alias}`;
}

/**
 * create token ref
 * @param token token
 * @param target token ref target.
 */
export function tokenRef<T>(token: Token<T>, target: Token): Token<T> {
    return `Ref ${format(token)} for ${format(target)}`;
}

/**
 * check target is token or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Token}
 */
export function isToken(target: any): target is Token {
    if (!target) {
        return false;
    }
    if (!isFunction(target)) {
        return isString(target) || isSymbol(target) || isInjectToken(target);
    }
    return isClassType(target);
}

export function isInjectToken<T>(target: any): target is InjectToken<T> {
    return target instanceof InjectToken;
}

/**
 * Basic value type.
 */
export type DataType = 'string'
    | 'char' | 'varchar' | 'nvarchar' | 'text'
    | 'bit' | 'byte' | 'bytes' | 'binary'
    | 'number'
    | 'int' | 'int2' | 'int4' | 'int8' | 'int32' | 'int64' | 'bigint'
    | 'float' | 'double' | 'decimal'
    | 'date' | 'datetime' | 'time' | 'timestamp'
    | 'boolean' | 'bool'
    | 'blob'
    | 'uuid' | 'ObjectID'
    | 'json';
