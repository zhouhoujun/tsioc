import { ClassType } from './types';
import { Token, tokenId } from './tokens';
import { ParameterMetadata } from './metadata/meta';
import { InvocationContext } from './context';
import { isArray, isClassType, isDefined, isFunction, isPlainObject, isString, isTypeObject, isTypeReflect } from './utils/chk';
import { getClassName } from './utils/lang';

/**
 * parameter argument of an {@link OperationArgumentResolver}.
 */
export interface Parameter<T = any> extends ParameterMetadata {
    /**
     * type.
     */
    type?: ClassType<T>;
    /**
     * provider type
     */
    provider?: Token<T>;
    /**
     * mutil provider or not.
     */
    mutil?: boolean;
}

/**
 * Resolver for an argument of an {@link OperationInvoker}.
 */
export interface OperationArgumentResolver<C = any> {
    /**
     * Return whether an argument of the given {@code parameter} can be resolved.
     * @param parameter argument type
     * @param args gave arguments
     */
    canResolve(parameter: Parameter, ctx: InvocationContext<C>): boolean;
    /**
     * Resolves an argument of the given {@code parameter}.
     * @param parameter argument type
     * @param args gave arguments
     */
    resolve<T>(parameter: Parameter<T>, ctx: InvocationContext<C>, target?: ClassType): T;
}

/**
 * argument resolver type.
 */
export type ArgumentResolver = OperationArgumentResolver | ClassType<OperationArgumentResolver>;

/**
 * compose resolver for an argument of an {@link OperationInvoker}.
 * @param filter compose canResolver filter.
 * @param resolvers resolves of the group.
 * @returns 
 */
 export function composeResolver<T extends OperationArgumentResolver<any>, TP extends Parameter = Parameter>(filter: (parameter: TP, ctx: InvocationContext) => boolean, ...resolvers: T[]): OperationArgumentResolver {
    return {
        canResolve: (parameter: TP, ctx: InvocationContext) => filter(parameter, ctx) && resolvers.some(r => r.canResolve(parameter, ctx)),
        resolve: (parameter: TP, ctx: InvocationContext) => {
            let result: any;
            resolvers.some(r => {
                if (r.canResolve(parameter, ctx)) {
                    result = r.resolve(parameter, ctx);
                    return isDefined(result);
                }
                return false;
            });
            return result ?? null;
        }
    }
}

/**
 * default resolvers {@link OperationArgumentResolver}. 
 */
export const DEFAULT_RESOLVERS = tokenId<OperationArgumentResolver[]>('DEFAULT_RESOLVERS');


/**
 * argument errror.
 */
 export class ArgumentError extends Error {
    constructor(message?: string | string[]) {
        super(isArray(message) ? message.join('\n') : message || '');
        Object.setPrototypeOf(this, ArgumentError.prototype);
        Error.captureStackTrace(this);
    }
}

/**
 * Missing argument errror.
 */
 export class MissingParameterError extends ArgumentError {
    constructor(parameters: Parameter[], type: ClassType, method: string) {
        super(`ailed to invoke operation because the following required parameters were missing: [ ${parameters.map(p => object2string(p)).join(',\n')} ], method ${method} of class ${object2string(type)}`);
        Object.setPrototypeOf(this, MissingParameterError.prototype);
    }
}


const deft = {
    typeInst: true,
    fun: true
}

/**
 * format object to string for log.
 * @param obj 
 * @returns 
 */
export function object2string(obj: any, options?: { typeInst?: boolean; fun?: boolean; }): string {
    options = { ...deft, ...options };
    if (isArray(obj)) {
        return `[${obj.map(v => object2string(v, options)).join(', ')}]`;
    } else if (isString(obj)) {
        return `"${obj}"`;
    } else if (isClassType(obj)) {
        return 'Type<' + getClassName(obj) + '>';
    } else if (isTypeReflect(obj)) {
        return `[${obj.class.className} TypeReflect]`;
    } else if (isPlainObject(obj)) {
        let str: string[] = [];
        for (let n in obj) {
            let value = obj[n];
            str.push(`${n}: ${object2string(value, options)}`)
        }
        return `{ ${str.join(', ')} }`;
    } else if (options.typeInst && isTypeObject(obj)) {
        let fileds = Object.keys(obj).filter(k => k).map(k => `${k}: ${object2string(obj[k], { typeInst: false, fun: false })}`);
        return `[${getClassName(obj)} {${fileds.join(', ')}} ]`;
    }
    if (!options.fun && isFunction(obj)) {
        return 'Function';
    }
    return `${obj?.toString()}`;
}
