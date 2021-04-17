
/**
 * module types.
 */
export type Modules = Type | ObjectMap<Type | Modules | Object>;

/**
 * object map.
 *
 * @export
 * @interface ObjectMap
 * @template T
 */
export interface ObjectMap<T = any> {
    [index: string]: T;
}

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
     * @type {ObjectMap<string[]>}
     * @memberof DesignAnnotation
     */
    params: ObjectMap<string[]>;
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
    d0Ann?(): DesignAnnotation;
    /**
     * class design annotation
     * @deprecated use `ρAnn` instead.
     */
    getClassAnnations?(): DesignAnnotation;
    /**
     * class flag. none poincut for aop.
     */
    ρNPT?: boolean;
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
export type LoadType = Modules | string | string[] | PathModules | ChildModule;
