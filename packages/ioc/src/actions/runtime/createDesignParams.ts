import { Token, Type } from '../../types';
import { isClass } from '../../utils/lang';
import { RuntimeContext } from './RuntimeActionContext';
import { IParameter } from '../../IParameter';


export function createDesignParams(ctx: RuntimeContext, type: Type, target: any, propertyKey: string): IParameter[] {
    let paramTokens: Token[];
    if (target && propertyKey) {
        paramTokens = Reflect.getMetadata('design:paramtypes', target, propertyKey) || [];
    } else {
        paramTokens = Reflect.getMetadata('design:paramtypes', type) || [];
    }

    let injector = ctx.injector;
    paramTokens = paramTokens.slice(0);
    paramTokens.forEach(dtype => {
        if (isClass(dtype) && !injector.hasRegister(dtype)) {
            injector.registerType(dtype);
        }
    });
    let names = ctx.reflects.getParamerterNames(type, propertyKey);
    let params: IParameter[];
    if (names.length) {
        params = names.map((name, idx) => {
            return <IParameter>{
                name: name,
                type: paramTokens.length ? checkParamType(paramTokens[idx]) : undefined
            }
        });
    } else if (paramTokens.length) {
        params = paramTokens.map((tk, idx) => {
            return <IParameter>{
                name: names.length ? names[idx] : '',
                type: checkParamType(tk)
            }
        });
    } else {
        params = [];
    }
    return params;
}

function checkParamType(type: any): Type {
    if (type === Object) {
        return undefined;
    }
    return type;
}
