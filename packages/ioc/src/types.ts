
/**
 * module types.
 */
export type Modules = Type | ObjectMap<Modules | Object>;


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
 * class Annations
 *
 * @export
 * @interface ClassAnnations
 */
export interface ClassAnnations {
    /**
     * class name
     *
     * @type {string}
     * @memberof ClassAnnations
     */
    name: string;
    /**
     * class params declaration.
     *
     * @type {ObjectMap<string[]>}
     * @memberof ClassAnnations
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
    /**
     * class annations
     */
    ρAnn?(): ClassAnnations;
    /**
     * get component def.
     */
    ρCmp?(): any;
    /**
     * get directive def.
     */
    ρDir?(): any;
    /**
     * class flag. none poincut for aop.
     */
    ρNPT?: boolean;
    /**
     * class type flag.
     */
    ρCT?: ClassTypes;
}


/**
 * class type
 * @export
 * @interface Type
 * @extends {Function}
 * @template T
 */
export interface Type<T = any> extends AbstractType<T> {
    new(...args: any[]): T;
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


export type ClassTypes = 'injector' | 'component' | 'directive' | 'activity';
export type DefineClassTypes = 'class' | 'method' | 'property';
export type DecoratorTypes = DefineClassTypes | 'parameter';
export type MetadataTypes = DecoratorTypes | 'constructor';

/**
 * decorator scopes.
 *
 * Annoation: annoation actions for design time.
 * AfterAnnoation: after annoation actions for design time.
 */
export type DecoratorScope = 'BeforeAnnoation' | 'Class' | 'Parameter' | 'Property' | 'Method'
    | 'BeforeConstructor' | 'AfterConstructor' | 'Annoation' | 'AfterAnnoation' | 'Inj'
    | 'Build' | 'BindExpression' | 'TranslateTemplate' | 'Binding' | 'ValifyComponent';
