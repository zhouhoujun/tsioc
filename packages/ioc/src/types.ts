
/**
 * module object.
 */
export type Modules = Type | Type[] | Record<string, Type | Object>;


/**
 * object map. 
 * 
 * @deprecated use {@link Record} instead.
 *  
 */
export type ObjectMap<T = any> = Record<string, T>;

/**
 * class design annotation
 *
 * @export
 */
export interface DesignAnnotation {
    /**
     * class name
     *
     * @type {string}
     * @memberof DesignAnnotation
     */
    name: string;
    /**
     * class params declaration.
     *
     * @type {Record<string, string[]>}
     * @memberof DesignAnnotation
     */
    params: Record<string, string[]>;

    /**
     * abstract or not.
     */
    abstract?: boolean;
    /**
     * type Def.
     */
    def?: any;
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
    ρAnn?(): DesignAnnotation;
    /**
     * class design annotation
     * @deprecated use `ρAnn` instead.
     */
    getClassAnnations?(): DesignAnnotation;
    /**
     * class flag. none poincut for aop.
     */
    ρNPT?: boolean;

    /**
     * type reflect of this class.
     */
    ρRfl?: () => any;
}

/**
 * class type.
 */
export type ClassType<T = any> = Type<T> | AbstractType<T>;

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
