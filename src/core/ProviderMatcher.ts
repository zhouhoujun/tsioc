import { Providers, Token } from '../types';
import { ProviderMap } from '../ProviderMap';
import { Provider } from '../Provider';
import { isString, isNumber, isUndefined, isToken } from '../utils/index';
import { ParamProvider } from '../ParamProvider';
import { Type } from '../Type';
import { IParameter } from '../IParameter';
import { IProviderMatcher } from '../IProviderMatcher';
import { NonePointcut } from './decorators/index';

@NonePointcut
export class ProviderMatcher implements IProviderMatcher {

    constructor() {

    }

    match(params: IParameter[], ...providers: Providers[]): ProviderMap {
        let map = {};
        if (!params.length) {
            return map;
        }
        providers.forEach(p => {
            if (p) {
                if (this.isMap(p)) {
                    Object.keys(p).forEach(name => {
                        if (name && !map[name] && !isUndefined(p[name])) {
                            map[name] = p[name];
                        }
                    })
                } else {
                    let name;
                    let paramProvider = p as ParamProvider;
                    if (isUndefined(paramProvider.index)) {
                        if (isToken(paramProvider.type)) {
                            name = this.matchType(params, paramProvider.type);
                        }
                    } else {
                        if (isString(paramProvider.index)) {
                            name = paramProvider.index;
                        } else if (isNumber(paramProvider.index)) {
                            name = this.matchIndex(params, paramProvider.index);
                        }
                    }

                    if (name && !map[name]) {
                        map[name] = p;
                    }
                }
            }
        });

        return map;
    }

    protected matchIndex(params: IParameter[], idx: number): string {
        if (idx && idx < params.length) {
            let param = params[idx];
            return param ? param.name : '';
        }
        return '';
    }

    protected matchType(params: IParameter[], type: Token<any>): string {
        let param = params.find(p => p && p.type === type);
        return param ? param.name : '';
    }

    protected isMap(p: Providers) {

        if ((isString(p['index']) || isNumber(p['index']) || isToken(p['type']))
            && (!isUndefined(p['value']) || !isUndefined(p['method']))) {
            return false;
        }

        return true;
    }
}
