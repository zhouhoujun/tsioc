
/**
 * module types.
 */
export type Modules = Type | Object;



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
 * express.
 *
 * @export
 * @interface Express
 * @template T
 * @template TResult
 */
export interface Express<T, TResult> {
    (item: T): TResult;
}

/**
 * express
 *
 * @export
 * @interface Express2
 * @template T1
 * @template T2
 * @template TResult
 */
export interface Express2<T1, T2, TResult> {
    (arg1: T1, arg2: T2): TResult
}



/**
 * decorator scopes.
 *
 * Annoation: annoation actions for design time.
 * AfterAnnoation: after annoation actions for design time.
 */
export type DecoratorScope = 'BeforeAnnoation' | 'Class' | 'Parameter' | 'Property' | 'Method'
    | 'BeforeConstructor' | 'AfterConstructor' | 'Annoation' | 'AfterAnnoation';
