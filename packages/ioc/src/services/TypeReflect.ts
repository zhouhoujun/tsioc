import { ObjectMap, Token, ClassType } from '../types';
import { IocCoreService } from './IocCoreService';
import { IParameter } from '../IParameter';
import { ParamProviders } from '../providers';
import { PropertyMetadata, ClassMetadata } from '../metadatas';


/**
 * type reflect.
 *
 * @export
 * @interface ITypeReflect
 */
export interface ITypeReflect extends ClassMetadata {
    /**
     * constructor parameter.
     *
     * @type {IParameter[]}
     * @memberof ITypeReflect
     */
    constr?: IParameter[];
    /**
     * inject props.
     *
     * @type {PropertyMetadata[]}
     * @memberof ITypeReflect
     */
    props?: PropertyMetadata[];
    /**
     * method params.
     *
     * @type {ObjectMap<IParameter[]>}
     * @memberof ITypeReflect
     */
    methodParams?: ObjectMap<IParameter[]>;
    /**
     * method param providers.
     *
     * @type {ObjectMap<ParamProviders[]>}
     * @memberof ITypeReflect
     */
    methodProviders?: ObjectMap<ParamProviders[]>;
    /**
     * this class provides.
     *
     * @type {Token<any>}
     * @memberof ITypeReflect
     */
    provides?: Token<any>[];

    /**
     * bund decorators of class
     *
     * @type {string[]}
     * @memberof IClassProvides
     */
    decors: string[];

    compBeforeInit?: boolean;
    compInit?: boolean;
    compAfterInit?: boolean;
}

export class TypeReflects extends IocCoreService {
    map: Map<ClassType<any>, ITypeReflect>;
    constructor() {
        super();
        this.map = new Map();
    }

    has(type: ClassType<any>): boolean {
        return this.map.has(type);
    }

    set(type: ClassType<any>, typeInfo: ITypeReflect): this {
        if (!this.map.has(type)) {
            this.map.set(type, typeInfo);
        }
        return this;
    }

    get<T extends ITypeReflect>(type: ClassType<any>, force?: boolean): T {
        if (this.map.has(type)) {
            return this.map.get(type) as T;
        } else if (force) {
            this.map.set(type, {} as ITypeReflect);
            return this.map.get(type) as T;
        }
        return null;
    }

}
