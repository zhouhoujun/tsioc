
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
     * class reflective.
     */
    class: unknown;
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
 */
export interface AnnotationType<T = any> extends Function {
    new?(...args: any[]): T;
    /**
     * class design annotation
     */
    ƿAnn?(): Annotation;
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

/**
 * load modules in base on an path.
 *
 * @export
 * @interface PathModules
 */
export interface PathModules {
    /**
     * fire express base on the root path.
     *
     * @type {string}
     */
    basePath?: string;
    /**
     * in nodejs:
     * script files match express.
     * see: https://github.com/isaacs/node-glob
     *
     * in browser:
     * script file url.
     * @type {(string | string[])}
     */
    files?: string | string[];
    /**
     * modules
     *
     * @type {((Modules | string)[])}
     */
    modules?: (Modules | string)[];
}

/**
 * child module.
 */
export interface ChildModule {
    loadChild(): Promise<Type>;
}

/**
 * load module type.
 */
export type LoadType = Modules | string | PathModules | ChildModule;
