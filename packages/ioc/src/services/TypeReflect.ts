import { Token, ClassType } from '../types';
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
     * props.
     *
     * propertyname__decorname
     *
     * @type {PropertyMetadata[]}
     * @memberof ITypeReflect
     */
    props: Map<string, PropertyMetadata>;
    /**
     * class decorator annotations.
     *
     * @type {Map<string, ClassMetadata>}
     * @memberof ITypeReflect
     */
    annotations: Map<string, ClassMetadata>;
    /**
     * method params.
     *
     * @type {ObjectMap<IParameter[]>}
     * @memberof ITypeReflect
     */
    methodParams: Map<string, IParameter[]>;
    /**
     * method param providers.
     *
     * @type {ObjectMap<ParamProviders[]>}
     * @memberof ITypeReflect
     */
    methodProviders: Map<string, ParamProviders[]>;
    /**
     * this class provides.
     *
     * @type {Token<any>}
     * @memberof ITypeReflect
     */
    provides?: Token<any>[];


    compBeforeInit?: boolean;
    compInit?: boolean;
    compAfterInit?: boolean;
}

/**
 * type reflects.
 *
 * @export
 * @class TypeReflects
 * @extends {IocCoreService}
 */
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

    get<T extends ITypeReflect>(type: ClassType<any>): T {
        if (this.map.has(type)) {
            return this.map.get(type) as T;
        }
        return null;
    }

}
