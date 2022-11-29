import {
    Token, InjectableMetadata, isArray, getClass,
    refl, createDecorator, createPropDecorator, createParamDecorator, ActionTypes
} from '@tsdi/ioc';
import {  RunnableFactory } from '@tsdi/core';
import {
    BindingMetadata, ComponentMetadata, DirectiveMetadata, HostBindingMetadata,
    HostListenerMetadata, QueryMetadata, VaildateMetadata
} from './meta';
import { AnnotationDef, ComponentDef, DirectiveDef } from '../type';
import { CompilerFacade } from '../compile/facade';
import { ComponentRunnableFactory } from '../runnable';


/**
 * Directive decorator
 *
 * @export
 * @interface Directive
 */
export interface Directive {
    /**
     * Component decorator, define for class. use to define the class. it can setting provider to some token, singleton or not. it will execute  [`ComponentLifecycle`]
     *
     * @Component
     *
     * @param {DirectiveMetadata} [metadata] metadata map.
     */
    (metadata?: DirectiveMetadata): ClassDecorator;

    /**
     * Component decorator, use to define class as Component element.
     *
     * @Task
     * @param {string} selector metadata selector.
     */
    (selector: string, option?: InjectableMetadata): ClassDecorator;
}

/**
 * Directive decorator, define for class. use to define the class as Directive.
 *
 * @Component
 */
export const Directive: Directive = createDecorator<DirectiveMetadata>('Directive', {
    actionType: [ActionTypes.annoation, ActionTypes.typeProviders],
    props: (selector: string, option?: InjectableMetadata) => ({ selector, ...option }),
    def: {
        class: (ctx, next) => {
            (ctx.typeRef as DirectiveDef).annoType = 'directive';
            (ctx.typeRef as DirectiveDef).annoDecor = ctx.decor;
            (ctx.typeRef as DirectiveDef).annotation = ctx.metadata;
            return next();
        }
    },
    design: {
        class: (ctx, next) => {
            if ((ctx.typeRef as DirectiveDef).annoType !== 'directive') {
                return next();
            }

            if (ctx.typeRef.class.annotation?.def) {
                (ctx.typeRef as DirectiveDef).def = ctx.typeRef.class.annotation?.def;
                return next();
            }

            const compiler = ctx.injector.getService({ token: CompilerFacade, target: ctx.currDecor });
            (ctx.typeRef as DirectiveDef).def = compiler.compileDirective((ctx.typeRef as DirectiveDef));

            next();
        }
    }
});



/**
 * Component decorator
 *
 * @export
 * @interface Component
 */
export interface Component {
    /**
     * Component decorator, define for class. use to define the class. it can setting provider to some token, singleton or not. it will execute  [`ComponentLifecycle`]
     *
     * @Component
     *
     * @param {ComponentMetadata} [metadata] metadata map.
     */
    (metadata: ComponentMetadata): ClassDecorator;

    /**
     * Component decorator, use to define class as Component element.
     *
     * @Task
     * @param {string} selector metadata selector.
     */
    (selector?: string, template?: any, option?: InjectableMetadata): ClassDecorator;
}

/**
 * Component decorator, define for class. use to define the class as Component. it can setting provider to some token, singleton or not. it will execute  [`ComponentLifecycle`]
 *
 * @Component
 */
export const Component: Component = createDecorator<ComponentMetadata>('Component', {
    actionType: [ActionTypes.annoation, ActionTypes.typeProviders],
    props: (selector: string, template?: any, option?: InjectableMetadata) => ({ selector, template, ...option }),
    def: {
        class: (ctx, next) => {
            (ctx.typeRef as ComponentDef).annoType = 'component';
            (ctx.typeRef as ComponentDef).annoDecor = ctx.decor;
            (ctx.typeRef as ComponentDef).annotation = ctx.metadata;
            return next();
        }
    },
    design: {
        class: (ctx, next) => {
            const compRefl = ctx.typeRef as ComponentDef;
            if (compRefl.annoType !== 'component') {
                return next();
            }

            if (ctx.typeRef.class.annotation?.def) {
                (ctx.typeRef as ComponentDef).def = ctx.typeRef.class.annotation?.def;
                return next();
            }

            const compiler = ctx.injector.getService({ token: CompilerFacade, target: ctx.currDecor });
            compRefl.def = compiler.compileComponent(compRefl);
            next();
        }
    },
    providers: [
        { provide: RunnableFactory, useExisting: ComponentRunnableFactory }
    ]
});


/**
 * HostBinding decorator.
 *
 * @export
 * @interface HostBindingPropertyDecorator
 */
export interface HostBindingPropertyDecorator {
    /**
     * define HostBinding property decorator with binding property name.
     *
     * @param {string} bindingName binding property name
     */
    (eventName: string, args: []): PropertyDecorator;

    /**
     * define HostBinding property decorator with binding metadata.
     *
     * @param {string} bindingName binding property name
     */
    (metadata: HostBindingMetadata): PropertyDecorator;
}



/**
 * Type of the `Host` decorator / constructor function.
 *
 * @publicApi
 */
export interface HostDecorator {
    /**
     * Parameter decorator on a view-provider parameter of a class constructor
     * that tells the DI framework to resolve the view by checking injectors of child
     * elements, and stop when reaching the host element of the current component.
     *
     */
    (): any;
    new(): Host;
}

/**
 * Type of the Host metadata.
 *
 * @publicApi
 */
export interface Host { }

/**
 * Host decorator and metadata.
 *
 * @Annotation
 * @publicApi
 */
export const Host: HostDecorator = createParamDecorator('Host');



/**
 * Type of the Attribute decorator / constructor function.
 *
 * @publicApi
 */
export interface AttributeDecorator {
    /**
     * Parameter decorator for a directive constructor that designates
     * a host-element attribute whose value is injected as a constant string literal.
     *
     * @usageNotes
     *
     * Suppose we have an `<input>` element and want to know its `type`.
     *
     * ```html
     * <input type="text">
     * ```
     *
     * The following example uses the decorator to inject the string literal `text` in a directive.
     *
     * {@example core/ts/metadata/metadata.ts region='attributeMetadata'}
     *
     * The following example uses the decorator in a component constructor.
     *
     * {@example core/ts/metadata/metadata.ts region='attributeFactory'}
     *
     */
    (name: string): any;
    new(name: string): Attribute;
}

/**
 * Type of the Attribute metadata.
 *
 * @publicApi
 */
export interface Attribute {
    /**
     * The name of the attribute whose value can be injected.
     */
    attributeName: string;
}

/**
 * Host decorator and metadata.
 *
 * @Annotation
 * @publicApi
 */
export const Attribute: AttributeDecorator = createParamDecorator('Attribute');


/**
 * HostBinding decorator.
 *
 * @export
 * @interface HostBindingPropertyDecorator
 */
export interface HostBindingPropertyDecorator {
    /**
     * Decorator that marks a DOM property as a host-binding property and supplies configuration
     * metadata.
     * Components automatically checks host property bindings during change detection, and
     * if a binding changes it updates the host element of the directive.
     *
     * @param {string} [hostPropertyName] binding property name
     */
    (hostPropertyName?: string): PropertyDecorator;

    /**
     * define HostBinding property decorator with binding metadata.
     *
     * @param {string} bindingName binding property name
     */
    (metadata: HostBindingMetadata): PropertyDecorator;
}

/**
 * HostBinding property decorator.
 */
export const HostBinding: HostBindingPropertyDecorator = createPropDecorator<HostBindingMetadata>('HostBinding', {
    props: (hostPropertyName?: string) => ({ hostPropertyName })
});



/**
 * HostListener decorator.
 *
 * @export
 * @interface HostListenerPropertyDecorator
 */
export interface HostListenerPropertyDecorator {
    /**
     * Decorator that binds a DOM event to a host listener and supplies configuration metadata.
     * Components invokes the supplied handler method when the host element emits the specified event,
     * and updates the bound element with the result.
     *
     * @param {string} eventName binding property name
     */
    (eventName: string, args?: string[]): PropertyDecorator;

    // /**
    //  * Decorator that binds a Message Queue event to a host listener and supplies configuration metadata.
    //  * Components invokes the supplied handler method when the host element emits the specified event,
    //  * and updates the bound element with the result.
    //  *
    //  * @param {string} eventName binding property name
    //  */
    // (eventName: string, queue?: Type<MessageQueue>): PropertyDecorator;

    /**
     * define HostListener property decorator with binding metadata.
     *
     * @param {string} bindingName binding property name
     */
    (metadata: HostListenerMetadata): PropertyDecorator;
}

/**
 * HostListener property decorator.
 */
export const HostListener: HostListenerPropertyDecorator = createPropDecorator<HostListenerMetadata>('HostListener', {
    props: (eventName?: string, args?: any) => {
        if (isArray(args)) {
            return { eventName, args }
        } else {
            return { eventName, queue: args }
        }
    }
});


// /**
//  * decorator used to define Request route mapping.
//  *
//  * @export
//  * @interface IHostMappingDecorator
//  */
// export interface IHostMappingDecorator {
//     /**
//      * use component selector as route or use the component method name as an route.
//      */
//     (): ClassMethodDecorator;
//     /**
//      * route decorator. define the component method as an route.
//      *
//      * @param {string} route route sub path. default use component selector.
//      * @param {Type<Router>} [parent] the middlewares for the route.
//      */
//     (route: string, parent: Type<Router>): ClassDecorator;
//     /**
//      * route decorator. define the component method as an route.
//      *
//      * @param {string} route route sub path.
//      * @param {MiddlewareInst[]} [middlewares] the middlewares for the route.
//      */
//     (route: string, middlewares?: MiddlewareInst[]): ClassMethodDecorator;

//     /**
//      * route decorator. define the component method as an route.
//      *
//      * @param {string} route route sub path.
//      * @param {{ middlewares?: MiddlewareInst[], contentType?: string, method?: string}} options
//      *  [parent] set parent route.
//      *  [middlewares] the middlewares for the route.
//      */
//     (route: string, options: { parent?: Type<Router>, middlewares: MiddlewareInst[] }): ClassDecorator;
//     /**
//      * route decorator. define the controller method as an route.
//      *
//      * @param {string} route route sub path.
//      * @param {RequestMethod} [method] set request method.
//      */
//     (route: string, method: string): MethodDecorator;

//     /**
//      * route decorator. define the controller method as an route.
//      *
//      * @param {string} route route sub path.
//      * @param {{ middlewares?: MiddlewareInst[], contentType?: string, method?: string}} options
//      *  [middlewares] the middlewares for the route.
//      *  [contentType] set request contentType.
//      *  [method] set request method.
//      */
//     (route: string, options: { middlewares: MiddlewareInst[], contentType?: string, method?: string }): MethodDecorator;

//     /**
//      * route decorator. define the controller method as an route.
//      *
//      * @param {RouteMetadata} [metadata] route metadata.
//      */
//     (metadata: RouteMappingMetadata): ClassMethodDecorator;
// }

// /**
//  * HostMapping decorator
//  */
// export const HostMapping: IHostMappingDecorator = createDecorator<RouteMappingMetadata>('HostMapping', {
//     props: (route: string, arg2?: Type<Router> | MiddlewareInst[] | string | { middlewares: MiddlewareInst[], contentType?: string, method?: string }) => {
//         if (isArray(arg2)) {
//             return { route, middlewares: arg2 };
//         } else if (isString(arg2)) {
//             return { route, method: arg2 };
//         } else if (lang.isBaseOf(arg2, Router)) {
//             return { route, parent: arg2 };
//         } else {
//             return { ...arg2, route };
//         }
//     },
//     def: {
//         class: (ctx, next) => {
//             ctx.def.annotation = ctx.metadata;
//             return next();
//         }
//     },
//     design: {
//         afterAnnoation: (ctx, next) => {
//             const def = ctx.def as MappingReflect;
//             const { parent } = def.annotation;
//             const injector = ctx.injector;
//             let queue: Middlewares;
//             if (parent) {
//                 queue = injector.get(parent);
//             } else {
//                 queue = injector.get(HostMappingRoot);
//             }

//             if (!queue) throw new Error(lang.getClassName(parent) + 'has not registered!');
//             if (!(queue instanceof Router)) throw new Error(lang.getClassName(queue) + 'is not message router!');

//             const mapping = new HostMappingRoute(def, injector, queue.getPath());
//             injector.onDestroy(() => queue.unuse(mapping));
//             queue.use(mapping);
//             next();
//         }
//     }
// });


/**
 * Property Binding decorator. define property binding in template.
 *
 * @export
 * @interface BindingPropertyDecorator
 */
export interface BindingPropertyDecorator {
    /**
     * Property Binding decorator. define property of component or directive binding in template.
     *
     * @param {string} [bindingPropertyName] binding property name
     */
    (bindingPropertyName?: string): PropertyDecorator;

    /**
     * Property Binding decorator. define property of component or directive binding in template.
     *
     * @param {string} bindingPropertyName binding property name
     * @param {*} defaultVal default value.
     */
    (bindingPropertyName: string, defaultVal: any): PropertyDecorator;

    /**
     * Property Binding decorator. define property of component or directive binding in template.
     *
     * @param {string} bindingName binding property name
     */
    (metadata: BindingMetadata): PropertyDecorator;
}

/**
 * Property attribute decorator.  define property binding in template.
 */
export const Binding: BindingPropertyDecorator = createPropDecorator<BindingMetadata>('Binding', {
    props: (bindingPropertyName: string, defaultValue?: any) => ({ bindingPropertyName, defaultValue })
});



/**
 * Input decorator.
 *
 * @export
 * @interface InputPropertyDecorator
 */
export interface InputPropertyDecorator {
    /**
     * define Input property decorator with binding property name.
     *
     * @param {string} [bindingPropertyName] binding property name
     */
    (bindingPropertyName?: string): PropertyDecorator;

    /**
     * define Input property decorator with binding property name and provider.
     *
     * @param {string} bindingPropertyName binding property name
     * @param {*} defaultVal default value.
     */
    (bindingPropertyName: string, defaultVal: any): PropertyDecorator;

    /**
     * define Input property decorator with binding metadata.
     *
     * @param {string} bindingName binding property name
     */
    (metadata: BindingMetadata): PropertyDecorator;

}

/**
 * Input decorator.
 */
export const Input: InputPropertyDecorator = createPropDecorator<BindingMetadata>('Input', {
    props: (bindingPropertyName: string, defaultValue?: any) => ({ bindingPropertyName, defaultValue })
});




/**
 * Output decorator.
 *
 * @export
 * @interface OutputPropertyDecorator
 */
export interface OutputPropertyDecorator {
    /**
     * define Output property decorator with binding property name.
     *
     * @param {string} [bindingPropertyName] binding property name
     */
    (bindingPropertyName?: string): PropertyDecorator;

    /**
     * define Output property decorator with binding metadata.
     *
     * @param {string} bindingName binding property name
     */
    (metadata: BindingMetadata): PropertyDecorator;
}

/**
 * output property decorator.
 */
export const Output: OutputPropertyDecorator = createPropDecorator<BindingMetadata>('Output', {
    props: (bindingPropertyName?: string) => ({ bindingPropertyName })
});



export abstract class Query { }

function isDirOrComponent(target: any) {
    const anTy = refl.get<AnnotationDef>(getClass(target))?.annoType;
    return anTy === 'component' || anTy === 'directive';
}

/**
 * Type of the ContentChildren decorator / constructor function.
 *
 * @see `ContentChildren`.
 * @publicApi
 */
export interface ContentChildrenDecorator {
    /**
     * Parameter decorator that configures a content query.
     *
     * Use to get the `QueryList` of elements or directives from the content DOM.
     * Any time a child element is added, removed, or moved, the query list will be
     * updated, and the changes observable of the query list will emit a new value.
     *
     * Content queries are set before the `ngAfterContentInit` callback is called.
     *
     * Does not retrieve elements or directives that are in other components' templates,
     * since a component's template is always a black box to its ancestors.
     *
     * **Metadata Properties**:
     *
     * * **selector** - The directive type or the name used for querying.
     * * **descendants** - True to include all descendants, otherwise include only direct children.
     * * **read** - Used to read a different token from the queried elements.
     *
     * @usageNotes
     *
     * Here is a simple demonstration of how the `ContentChildren` decorator can be used.
     *
     * {@example core/di/ts/contentChildren/content_children_howto.ts region='HowTo'}
     *
     * ### Tab-pane example
     *
     * Here is a slightly more realistic example that shows how `ContentChildren` decorators
     * can be used to implement a tab pane component.
     *
     * {@example core/di/ts/contentChildren/content_children_example.ts region='Component'}
     *
     * @Annotation
     */
    (selector?: Token | Function,
        opts?: { descendants?: boolean, read?: any }): any;
    new(selector: Token | Function,
        opts?: { descendants?: boolean, read?: any }): Query;
}

/**
 * ContentChildren decorator and metadata.
 *
 *
 * @Annotation
 * @publicApi
 */
export const ContentChildren: ContentChildrenDecorator = createPropDecorator('ContentChildren', {
    def: {
        property: (ctx, next) => {
            if (!(ctx.metadata as QueryMetadata).selector) {
                (ctx.metadata as QueryMetadata).selector = isDirOrComponent(ctx.metadata.type) ? ctx.metadata.type : ctx.propertyKey;
            }
            return next();
        }
    },
    props: (selector?: any, data?: { descendants?: boolean, read?: any }) =>
        ({ selector, first: false, isViewQuery: false, descendants: false, ...data })
});


/**
 * Type of the ContentChild decorator / constructor function.
 *
 * @publicApi
 */
export interface ContentChildDecorator {
    /**
     * Parameter decorator that configures a content query.
     *
     * Use to get the first element or the directive matching the selector from the content DOM.
     * If the content DOM changes, and a new child matches the selector,
     * the property will be updated.
     *
     * Content queries are set before the `ngAfterContentInit` callback is called.
     *
     * Does not retrieve elements or directives that are in other components' templates,
     * since a component's template is always a black box to its ancestors.
     *
     * **Metadata Properties**:
     *
     * * **selector** - The directive type or the name used for querying.
     * * **read** - Used to read a different token from the queried element.
     * * **static** - True to resolve query results before change detection runs,
     * false to resolve after change detection. Defaults to false.
     *
     *
     * @Annotation
     */
    (selector?: Token | Function,
        opts?: { read?: any, static?: boolean }): any;
    new(selector: Token | Function,
        opts?: { read?: any, static?: boolean }): Query;
}

/**
 * ContentChild decorator and metadata.
 *
 *
 * @Annotation
 *
 * @publicApi
 */
export const ContentChild: ContentChildDecorator = createPropDecorator('ContentChild', {
    def: {
        property: (ctx, next) => {
            const meta = ctx.metadata as QueryMetadata;
            if (!meta.selector) {
                meta.selector = isDirOrComponent(meta.type) ? meta.type : ctx.propertyKey;
            }
            return next();
        }
    },
    props: (selector?: any, opts?: { read?: any, static?: boolean }) =>
        ({ selector, first: true, isViewQuery: false, descendants: true, ...opts })
});

/**
 * Type of the ViewChildren decorator / constructor function.
 *
 * @see `ViewChildren`.
 *
 * @publicApi
 */
export interface ViewChildrenDecorator {
    /**
     * Parameter decorator that configures a view query.
     *
     * Use to get the `QueryList` of elements or directives from the view DOM.
     * Any time a child element is added, removed, or moved, the query list will be updated,
     * and the changes observable of the query list will emit a new value.
     *
     * View queries are set before the `afterViewInit` callback is called.
     *
     * **Metadata Properties**:
     *
     * * **selector** - The directive type or the name used for querying.
     * * **read** - Used to read a different token from the queried elements.
     *
     *
     * @Annotation
     */
    (selector?: Token | Function, opts?: { read?: any }): PropertyDecorator;

    (metadata: QueryMetadata): PropertyDecorator;
}

export const ViewChildren: ViewChildrenDecorator = createPropDecorator('ViewChildren', {
    def: {
        property: (ctx, next) => {
            const meta = ctx.metadata as QueryMetadata;
            if (!meta.selector) {
                meta.selector = isDirOrComponent(meta.type) ? meta.type : ctx.propertyKey;
            }
            return next();
        }
    },
    props: (selector: Token | Function, opts?: { read?: any }) =>
        ({ selector, first: false, isViewQuery: true, descendants: true, ...opts })
});


/**
 * Type of the ViewChild decorator / constructor function.
 *
 * @see `ViewChild`.
 * @publicApi
 */
export interface ViewChildDecorator {
    /**
     * @description
     * Property decorator that configures a view query.
     * The change detector looks for the first element or the directive matching the selector
     * in the view DOM. If the view DOM changes, and a new child matches the selector,
     * the property is updated.
     *
     * View queries are set before the `ngAfterViewInit` callback is called.
     *
     * **Metadata Properties**:
     *
     * * **selector** - The directive type or the name used for querying.
     * * **read** - Used to read a different token from the queried elements.
     * * **static** - True to resolve query results before change detection runs,
     * false to resolve after change detection. Defaults to false.
     *
     *
     * The following selectors are supported.
     *   * Any class with the `@Component` or `@Directive` decorator
     *   * A template reference variable as a string (e.g. query `<my-component #cmp></my-component>`
     * with `@ViewChild('cmp')`)
     *   * Any provider defined in the child component tree of the current component (e.g.
     * `@ViewChild(SomeService) someService: SomeService`)
     *   * Any provider defined through a string token (e.g. `@ViewChild('someToken') someTokenVal:
     * any`)
     *   * A `TemplateRef` (e.g. query `<template></template>` with `@ViewChild(TemplateRef)
     * template;`)
     *
     *
     * @Annotation
     */
    (selector?: Token | Function,
        opts?: { read?: any, static?: boolean }): any;
    new(selector: Token | Function,
        opts?: { read?: any, static?: boolean }): Query;
}

/**
 * ViewChild decorator and metadata.
 *
 * @Annotation
 * @publicApi
 */
export const ViewChild: ViewChildDecorator = createPropDecorator('ViewChild', {
    def: {
        property: (ctx, next) => {
            if (!(ctx.metadata as QueryMetadata).selector) {
                (ctx.metadata as QueryMetadata).selector = isDirOrComponent(ctx.metadata.type) ? ctx.metadata.type : ctx.propertyKey;
            }
            return next();
        }
    },
    props: (selector: any, data: any) =>
        ({ selector, first: true, isViewQuery: true, descendants: true, ...data }),
});

/**
 * RefChild decorator, define for class. use to define the class. it can setting provider to some token, singleton or not. it will execute  [`RefChildLifecycle`]
 *
 * @RefChild
 */
export const RefChild = ViewChild;


/**
 * Vaildate decorator.
 *
 * @export
 * @interface VaildatePropertyDecorator
 */
export interface VaildatePropertyDecorator {
    /**
     * define Vaildate property is required or not.
     *
     * @param {boolean} required property is required or not.
     * @param {string} message error message of required.
     */
    (required: boolean, message?: string): PropertyDecorator;
    /**
     * define Vaildate property decorator.
     *
     * @param {((value: any, target?: any) => boolean | Promise<boolean>)} vaild vaild func for property.
     * @param {string} message error message of required.
     */
    (vaild: (value: any, target?: any) => boolean | Promise<boolean>, message?: string): PropertyDecorator;
    /**
     * define Vaildate property decorator with metadata.
     *
     * @param {string} bindingName binding property name
     */
    (metadata: VaildateMetadata): PropertyDecorator;
}

// /**
//  * Vaildate decorator.
//  */
// export const Vaildate: VaildatePropertyDecorator = createPropDecorator<VaildateMetadata>('Vaildate', {
//     props: (vaild: any, errorMsg?: string) => {
//         if (isBoolean(vaild)) {
//             return { required: vaild, errorMsg };
//         } else {
//             return { vaild, errorMsg };
//         }
//     }
// }) as VaildatePropertyDecorator;


// /**
//  * @NonSerialize decorator define component property not need serialized.
//  */
// export const NonSerialize = createPropDecorator<PropertyMetadata>('NonSerialize', {
//     def: {
//         property: (ctx, next) => {
//             if (!(ctx.def as ComponentDef).nonSerialize) {
//                 (ctx.def as ComponentDef).nonSerialize = [];
//             }
//             (ctx.def as ComponentDef).nonSerialize?.push(ctx.propertyKey);
//             return next();
//         }
//     }
// });
