import {
    Type, Inject, ObjectMap, isClass, isUndefined, isPrimitiveType, isArray,
    Abstract, Singleton, isNil, isFunction, Token, tokenId, Injector, PropertyMetadata
} from '@tsdi/ioc';
import { IModelParser } from './IModelParser';
import { TYPE_PARSER } from '../metadata/tk';


/**
 * default module parser token.
 */
export const DefaultModelParserToken: Token<IModelParser> = tokenId<IModelParser>('DefaultModelParser')

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


/**
 * extend base type map.
 */
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
        return this;
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

    /**
     * parse model.
     * @param type type.
     * @param objMap object.
     */
    parseModel(type: Type, objMap: any): any {
        if (isArray(objMap)) {
            return objMap.map(o => this.parseModel(type, o));
        }

        let parser = this.injector.get(TYPE_PARSER);
        if (isPrimitiveType(type)) {
            return parser.parse(type, objMap);
        }
        let meta = this.getPropertyMeta(type);
        let result = this.injector.resolve({ token: type, regify: true }) ?? this.injector.state().getInstance(type);
        for (let n in meta) {
            const propmeta = meta[n];
            if (propmeta) {
                if (!isUndefined(objMap[n])) {
                    let ptype = propmeta.isProviderType ? propmeta.provider : propmeta.type;
                    let reqval = objMap[n];
                    if (!isFunction(ptype) || isNil(reqval)) {
                        continue;
                    }
                    let parmVal;
                    if (this.isExtendBaseType(ptype, propmeta)) {
                        parmVal = this.resolveExtendType(ptype, reqval, propmeta);
                    } else if (isPrimitiveType(ptype)) {
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

    protected abstract getPropertyMeta(type: Type): ObjectMap<DBPropertyMetadata>;

}
