
/**
 * module object.
 */
export type Modules<T extends AbstractType = AbstractType> = T | T[] | Record<string, T | Object>;

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
export interface DesignParam<T = any> {
    /**
     * param name
     */
    name?: string;
    /**
     * param design type.
     */
    type?: AbstractType<T>;
}

/**
 * method annotation.
 */
export interface MethodAnnotation {
    params: DesignParam[];
    returnType?: AbstractType;
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
    readonly type: AbstractType<T>;
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
 * 类
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
 * type
 * 
 * 可实例化类
 * @export
 * @interface Type
 * @extends {AbstractType}
 * @template T
 */
export interface Type<T = any> extends AbstractType<T> {
    new(...args: any[]): T;
}


export const noPointcut = Symbol('ƿNPT');
export const typeAnn = 'ƿAnn';
export const typeFac = 'ƿFac';
/**
 * annotation class type
 * 
 * 带注解的类
 */
export interface AnnotationType<T = any> extends AbstractType<T> {
    /**
     * class design annotation
     */
    [typeAnn]?(): Annotation;
    /**
     * declaration factory.
     */
    [typeFac]?(injector: any): any;
    /**
     * class flag. none poincut for aop.
     */
    [noPointcut]?: boolean;
}


/**
 * type or type instance.
 */
export type TypeOf<T> = AbstractType<T> | Exclude<T, Function>;
/**
 * arrayify.
 */
export type Arrayify<T> = Array<T> | T;


