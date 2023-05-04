/**
 * module object.
 */
export type Modules = Type | Type[] | Record<string, Type | Object>;

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
    type?: ClassType;
}

/**
 * method annotation.
 */
export interface MethodAnnotation {
    params: DesignParam[];
    returnType?: ClassType;
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
    readonly type: ClassType<T>;
    /**
     * class params declaration.
     *
     * @type {Record<string, string[]>}
     * @memberof Annotation
     */
    methods?: Record<string, MethodAnnotation>;

}


/**
 * abstract type
 *
 * @export
 * @interface AbstractType
 * @extends {Function}
 * @template T
 */
export interface AbstractType<T = any> extends Function {
    new?(...args: any[]): T;
    prototype: T;
}


/**
 * class type
 * 
 * 类
 * @export
 * @interface Type
 * @extends {Function}
 * @template T
 */
export interface Type<T = any> extends Function {
    new(...args: any[]): T;
}

/**
 * annotation class type
 * 
 * 带注解的类
 */
export interface AnnotationType<T = any> extends Function {
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
 * class type.
 */
export type ClassType<T = any> = Type<T> | AbstractType<T>;

/**
 * type or type instance.
 */
export type TypeOf<T> = ClassType<T> | T;

