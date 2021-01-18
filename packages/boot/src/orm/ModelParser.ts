import {
    Type, PropertyMetadata, Inject, ObjectMap, isClass, isUndefined, isBaseType, isArray,
    Abstract, SymbolType, Singleton, isNil, isFunction, IocCoreService, TokenId, tokenId, Injector, isProvide
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
export class ExtendBaseTypeMap extends IocCoreService {
    protected maps: Map<SymbolType<any>, (...params: any[]) => any>;
    constructor() {
        super();
        this.maps = new Map();
    }

    has(type: SymbolType): boolean {
        return this.maps.has(type);
    }

    register<T>(type: SymbolType<T>, factory: (...params: any[]) => T) {
        this.maps.set(type, factory);
    }

    resolve<T>(type: SymbolType<T>, ...params: any[]): T {
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
export abstract class ModelParser extends IocCoreService implements IModelParser {

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
                    let ptype = propmeta.provider ? (isProvide(propmeta.provider) ? this.injector.getTokenProvider(propmeta.provider): propmeta.provider) : propmeta.type;
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

    protected isExtendBaseType(type: SymbolType, propmeta?: DBPropertyMetadata): boolean {
        return this.getTypeMap().has(type);
    }

    protected resolveExtendType(type: SymbolType, value: any, propmeta?: DBPropertyMetadata): any {
        return this.getTypeMap().resolve(type, value);
    }

    protected abstract getPropertyMeta(type: Type): ObjectMap<DBPropertyMetadata[]>;

}
