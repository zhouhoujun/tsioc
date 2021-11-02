import { FnRecord, Injector } from '../injector';
import { isToken } from '../tokens';
import { Type } from '../types';
import { EMPTY, isFunction, isNil } from '../utils/chk';


/**
 * resolve token.
 * @param rd 
 * @param provider 
 * @returns 
 */
export function resolveToken<T>(rd: FnRecord<T>, provider: Injector): T {
    if (!rd) return null!;

    if (!isNil(rd.value)) return rd.value;

    switch (rd.fnType) {
        case 'cotr':
            return new (rd.fn as Type)(...createArgs(rd.deps!, provider));
        case 'fac':
            return rd.fn?.(...createArgs(rd.deps!, provider));
        case 'inj':
        default:
            if (rd.expires) {
                if ((rd.expires + rd.ltop!) < Date.now()) {
                    rd.ltop = Date.now();
                    return rd.cache!;
                }
                rd.expires = null!;
                rd.cache = null!;
                rd.ltop = null!;
            }
            return rd.fn?.(provider);

    }
}

function createArgs(deps: any[], provider: Injector): any[] {
    return deps?.map(d => {
        if (isToken(d)) {
            return provider.get(d);
        } else if (isFunction(d.fn) && (d.fnType === 'cotr' || d.fnType === 'fac' || d.fnType === 'inj')) {
            return resolveToken(d, provider);
        } else {
            return d;
        }
    }) ?? EMPTY;
}
