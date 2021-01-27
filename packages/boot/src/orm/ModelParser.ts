import {
    Type, PropertyMetadata, Inject, ObjectMap, isClass, isUndefined, isBaseType, isArray,
    Abstract, Singleton, isNil, isFunction, TokenId, tokenId, Injector, isProvide, Token
} from '@tsdi/ioc';
import { IModelParser } from './IModelParser';
import { TYPE_PARSER } from '../tk';


/**
 * default module parser token.
 */
export const DefaultModelParserToken: TokenId<IModelParser> = tokenId<IModelParser>('DefaultModelParser')

/**
 * db property metadata.
 *
 * @export
 * @interface DBPropertyMetadata
 * @extends {PropertyMetadata}
 */
export interface DBPropertyMetadata extends PropertyMetadata {
    dbtype?: string;
}


@Singleton()
export class ExtendBaseTypeMap {
    static ρNPT = true;
    protected maps: Map<Token, (...params: any[]) => any>;
    constructor() {
        this.maps = new Map();
    }

    has(type: Token): boolean {
        return this.maps.has(type);
    }

    register<T>(type: Token<T>, factory: (...params: any[]) => T) {
        this.maps.set(type, factory);
    }

    resolve<T>(type: Token<T>, ...params: any[]): T {
        if (this.maps.has(type)) {
            return this.maps.get(type)(...params);
        }
        return null;
    }
}


/**
 * modle parser.
 *
 * @export
 * @class ModelParser
 */
@Abstract()
export abstract class ModelParser implements IModelParser {

    static ρNPT = true;
    
    @Inject() protected injector: Injector;

    parseModel(type: Type, objMap: any): any {
        if (isArray(objMap)) {
            return objMap.map(o => this.parseModel(type, o));
        }

        let parser = this.injector.getInstance(TYPE_PARSER);
        if (isBaseType(type)) {
            return parser.parse(type, objMap);
        }
        let meta = this.getPropertyMeta(type);
        let result = this.injector.resolve({ token: type, regify: true });
        for (let n in meta) {
            let propmetas = meta[n];
            if (propmetas.length) {
                if (!isUndefined(objMap[n])) {
                    let propmeta = propmetas.find(p => p && !!(p.provider || p.type));
                    if (!propmeta) {
                        continue;
                    }
                    let ptype = propmeta.provider ? (isProvide(propmeta.provider) ? this.injector.getTokenProvider(propmeta.provider) : propmeta.provider) : propmeta.type;
                    let reqval = objMap[n];
                    if (!isFunction(ptype) || isNil(reqval)) {
                        continue;
                    }
                    let parmVal;
                    if (this.isExtendBaseType(ptype, propmeta)) {
                        parmVal = this.resolveExtendType(ptype, reqval, propmeta);
                    } else if (isBaseType(ptype)) {
                        parmVal = parser.parse(ptype, reqval);
                    } else if (isClass(ptype)) {
                        parmVal = this.parseModel(ptype, reqval);
                    }
                    result[n] = parmVal;
                }
            }
        }
        return result;
    }

    private typeMap: ExtendBaseTypeMap;
    getTypeMap(): ExtendBaseTypeMap {
        if (!this.typeMap) {
            this.typeMap = this.injector.get(ExtendBaseTypeMap);
        }
        return this.typeMap;
    }

    protected isExtendBaseType(type: Token, propmeta?: DBPropertyMetadata): boolean {
        return this.getTypeMap().has(type);
    }

    protected resolveExtendType(type: Token, value: any, propmeta?: DBPropertyMetadata): any {
        return this.getTypeMap().resolve(type, value);
    }

    protected abstract getPropertyMeta(type: Type): ObjectMap<DBPropertyMetadata[]>;

}
