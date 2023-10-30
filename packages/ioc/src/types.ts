/**
 * module object.
 */
export type Modules<T extends Type = Type> = T | T[] | Record<string, T | Object>;

/**
 * empty array.
 */
export const EMPTY: any[] = [];

/**
 * empty object.
 */
export const EMPTY_OBJ: Record<string, any> = {};

/**
 * object map. 
 * 
 * @deprecated use {@link Record} instead.
 *  
 */
export type ObjectMap<T = any> = Record<string, T>;

/**
 * design param
 */
export interface DesignParam {
    /**
     * param name
     */
    name?: string;
    /**
     * param design type.
     */
    type?: Type;
}

/**
 * method annotation.
 */
export interface MethodAnnotation {
    params: DesignParam[];
    returnType?: Type;
}

/**
 * class annotation
 * 
 * 类注解
 *
 * @export
 */
export interface Annotation<T = any> {
    /**
     * class name
     *
     * @type {string}
     * @memberof Annotation
     */
    name: string;
    /**
     * abstract or not.
     */
    abstract?: boolean;
    /**
     * class type.
     */
    readonly type: Type<T>;
    /**
     * class params declaration.
     *
     * @type {Record<string, string[]>}
     * @memberof Annotation
     */
    methods?: Record<string, MethodAnnotation>;

}


/**
 * type
 * 
 * 类
 * @export
 * @interface Type
 * @extends {Function}
 * @template T
 */
export interface Type<T = any> extends Function {
    new?(...args: any[]): T;
    prototype: T;
}

/**
 * class type
 * 
 * 可实例化类
 * @export
 * @interface CtorType
 * @extends {Type}
 * @template T
 */
export interface CtorType<T = any> extends Type<T> {
    new(...args: any[]): T;
}

/**
 * annotation class type
 * 
 * 带注解的类
 */
export interface AnnotationType<T = any> extends Type<T> {
    new?(...args: any[]): T;
    /**
     * class design annotation
     */
    ƿAnn?(): Annotation;
    /**
     * class Reflective 
     */
    ƿRef?(): any;
    /**
     * class flag. none poincut for aop.
     */
    ƿNPT?: boolean;
}


/**
 * type or type instance.
 */
export type TypeOf<T> = Type<T> | T;
/**
 * arrayify.
 */
export type Arrayify<T> =  Array<T> | T;

