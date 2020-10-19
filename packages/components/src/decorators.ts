import { Token, isString, isToken, ClassType, Registration, createPropDecorator, isClassType, createClassDecorator, isArray, PropertyMetadata, Type, isBoolean, isUndefined, isFunction, createParamDecorator } from '@tsdi/ioc';
import { AnnotationReflect } from '@tsdi/boot';
import { BindingMetadata, ComponentMetadata, DirectiveMetadata, HostBindingMetadata, HostListenerMetadata, PipeMetadata, VaildateMetadata } from './metadata';
import { BindingDirection, isBindingDriection } from './bindings/IBinding';
import { PipeTransform } from './pipes/pipe';
import { ComponentReflect } from './reflect';



/**
 * Directive decorator
 *
 * @export
 * @interface IDirectiveDecorator
 */
export interface IDirectiveDecorator {
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
    (selector: string): ClassDecorator;
}

/**
 * Directive decorator, define for class. use to define the class as Directive.
 *
 * @Component
 */
export const Directive: IDirectiveDecorator = createClassDecorator<DirectiveMetadata>('Directive', {
    actionType: ['annoation', 'typeProviders'],
    classHandle: (ctx, next) => {
        const reflect = ctx.reflect as AnnotationReflect;
        reflect.annoType = 'directive';
        reflect.annoDecor = ctx.decor;
        reflect.annotation = ctx.matedata;
        return next();
    },
    actions: [
        (ctx, next) => {
            if (isString(ctx.currArg)) {
                ctx.metadata.selector = ctx.currArg;
                ctx.next(next);
            }
        }
    ]
});



/**
 * Component decorator
 *
 * @export
 * @interface IComponentDecorator
 */
export interface IComponentDecorator {
    /**
     * Component decorator, define for class. use to define the class. it can setting provider to some token, singleton or not. it will execute  [`ComponentLifecycle`]
     *
     * @Component
     *
     * @param {ComponentMetadata} [metadata] metadata map.
     */
    (metadata?: ComponentMetadata): ClassDecorator;

    /**
     * Component decorator, use to define class as Component element.
     *
     * @Task
     * @param {string} selector metadata selector.
     */
    (selector: string): ClassDecorator;
}

/**
 * Component decorator, define for class. use to define the class as Component. it can setting provider to some token, singleton or not. it will execute  [`ComponentLifecycle`]
 *
 * @Component
 */
export const Component: IComponentDecorator = createClassDecorator<ComponentMetadata>('Component', {
    actionType: ['annoation', 'typeProviders'],
    classHandle: (ctx, next) => {
        const reflect = ctx.reflect as AnnotationReflect;
        reflect.annoType = 'component';
        reflect.annoDecor = ctx.decor;
        reflect.annotation = ctx.matedata;
        return next();
    },
    actions: [
        (ctx, next) => {
            if (isString(ctx.currArg)) {
                ctx.metadata.selector = ctx.currArg;
                ctx.next(next);
            }
        }
    ]
});

/**
 * Bindings decorator.
 *
 * @export
 * @interface BindingsPropertyDecorator
 */
export interface BindingsPropertyDecorator {
    /**
     * define Bindings property decorator with binding property name.
     *
     * @param {BindingDirection} direction binding direction. default twoway
     */
    (direction?: BindingDirection): PropertyDecorator;
    /**
     * define Bindings property decorator with binding property name.
     *
     * @param {BindingDirection} direction binding direction.
     * @param {string} bindingName binding property name
     */
    (direction: BindingDirection, bindingName?: string): PropertyDecorator;

    /**
     * define Bindings property decorator with binding metadata.
     *
     * @param {string} bindingName binding property name
     */
    (metadata: BindingMetadata): PropertyDecorator;
    /**
     * define Bindings property decorator with binding property name and provider.
     *
     * @param {BindingDirection} direction binding direction.
     * @param {(Registration | ClassType)} provider define provider to resolve value to the property.
     * @param {*} [defaultVal] default value.
     */
    (direction: BindingDirection, provider: Registration | ClassType, defaultVal?: any): PropertyDecorator;

    /**
     * define Bindings property decorator with binding property name and provider.
     *
     * @param {BindingDirection} direction binding direction.
     * @param {string} bindingName binding property name
     * @param {*} defaultVal default value.
     */
    (direction: BindingDirection, bindingName: string, defaultVal: any): PropertyDecorator;

    /**
     * define Bindings property decorator with binding property name and provider.
     *
     * @param {BindingDirection} direction binding direction.
     * @param {string} bindingName binding property name
     * @param {Token} provider define provider to resolve value to the property.
     * @param {*} defaultVal default value.
     */
    (direction: BindingDirection, bindingName: string, provider: Token, defaultVal: any): PropertyDecorator;
}

/**
 * Bindings decorator.
 */
export const Bindings: BindingsPropertyDecorator = createPropDecorator<BindingMetadata>('Bindings', {
    actions: [
        (ctx, next) => {
            let arg = ctx.currArg;
            if (isBindingDriection(arg)) {
                ctx.metadata.direction = arg;
                ctx.next(next);
            }
        },
        (ctx, next) => {
            let arg = ctx.currArg;
            if (isString(arg)) {
                ctx.metadata.bindingName = arg;
                ctx.next(next);
            } else if (isClassType(arg) || arg instanceof Registration) {
                ctx.metadata.provider = arg;
                ctx.next(next);
            }
        },
        (ctx, next) => {
            let arg = ctx.currArg;
            if ((ctx.args.length > 2 && isToken(arg))) {
                ctx.metadata.provider = arg;
                ctx.next(next);
            } else {
                ctx.metadata.defaultValue = arg;
            }

        },
        (ctx, next) => {
            ctx.metadata.defaultValue = ctx.currArg;
        }
    ],
    append: meta => {
        if (!meta.direction) {
            meta.direction = 'twoway';
        }
    }
});


/**
 * @NonSerialize decorator define component property not need serialized.
 */
export const NonSerialize = createPropDecorator<PropertyMetadata>('NonSerialize', {
    propHandle: (ctx, next) => {
        const reflect = ctx.reflect as ComponentReflect;
        if (!reflect.nonSerialize) {
            reflect.nonSerialize = [];
        }
        reflect.nonSerialize.push(ctx.propertyKey);
        return next();
    }
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
     * @usageNotes
     *
     * The following shows use with the `@Optional` decorator, and allows for a null result.
     *
     * <code-example path="core/di/ts/metadata_spec.ts" region="Host">
     * </code-example>
     *
     * For an extended example, see ["Dependency Injection
     * Guide"](guide/dependency-injection-in-action#optional).
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
 * output property decorator.
 */
export const HostBinding: HostBindingPropertyDecorator = createPropDecorator<HostBindingMetadata>('HostBinding', {
    actions: [
        (ctx, next) => {
            let arg = ctx.currArg;
            if (isString(arg)) {
                ctx.metadata.hostPropertyName = arg;
                ctx.next(next);
            }
        }
    ]
});



/**
 * HostListener decorator.
 *
 * @export
 * @interface HostListenerPropertyDecorator
 */
export interface HostListenerPropertyDecorator {
    /**
     * define HostListener property decorator with binding property name.
     *
     * @param {string} bindingName binding property name
     */
    (eventName: string, args: []): PropertyDecorator;

    /**
     * define HostListener property decorator with binding metadata.
     *
     * @param {string} bindingName binding property name
     */
    (metadata: HostListenerMetadata): PropertyDecorator;
}

/**
 * output property decorator.
 */
export const HostListener: HostListenerPropertyDecorator = createPropDecorator<HostListenerMetadata>('HostListener', {
    actions: [
        (ctx, next) => {
            let arg = ctx.currArg;
            if (isString(arg)) {
                ctx.metadata.eventName = arg;
                ctx.next(next);
            }
        },
        (ctx, next) => {
            let arg = ctx.currArg;
            if (isArray(arg)) {
                ctx.metadata.args = arg;
            }
        }
    ]
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
     * @param {string} bindingName binding property name
     */
    (bindingName?: string): PropertyDecorator;

    /**
     * define Input property decorator with binding metadata.
     *
     * @param {string} bindingName binding property name
     */
    (metadata: BindingMetadata): PropertyDecorator;
    /**
     * define Input property decorator with binding property name and provider.
     *
     * @param {(Registration | ClassType)} provider define provider to resolve value to the property.
     * @param {*} [defaultVal] default value.
     */
    (provider: Registration | ClassType, defaultVal?: any): PropertyDecorator;

    /**
     * define Input property decorator with binding property name and provider.
     *
     * @param {string} bindingName binding property name
     * @param {*} defaultVal default value.
     */
    (bindingName: string, defaultVal: any): PropertyDecorator;

    /**
     * define Input property decorator with binding property name and provider.
     *
     * @param {string} bindingName binding property name
     * @param {Token} provider define provider to resolve value to the property.
     * @param {*} defaultVal default value.
     */
    (bindingName: string, provider: Token, defaultVal: any): PropertyDecorator;
    /**
     * define property decorator.
     */
    (target: object, propertyKey: string | symbol, descriptor?: TypedPropertyDescriptor<any>): void;
}

/**
 * Input decorator.
 */
export const Input: InputPropertyDecorator = createPropDecorator<BindingMetadata>('Input', {
    actions: [
        (ctx, next) => {
            let arg = ctx.currArg;
            if (isString(arg)) {
                ctx.metadata.bindingName = arg;
                ctx.next(next);
            } else if (isClassType(arg) || arg instanceof Registration) {
                ctx.metadata.provider = arg;
                ctx.next(next);
            }
        },
        (ctx, next) => {
            let arg = ctx.currArg;
            if ((ctx.args.length > 2 && isToken(arg))) {
                ctx.metadata.provider = arg;
                ctx.next(next);
            } else {
                ctx.metadata.defaultValue = arg;
            }

        },
        (ctx, next) => {
            ctx.metadata.defaultValue = ctx.currArg;
        }
    ],
    append: meta => {
        meta.direction = 'input';
    }
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
     * @param {string} bindingName binding property name
     */
    (bindingName?: string): PropertyDecorator;

    /**
     * define Output property decorator with binding metadata.
     *
     * @param {string} bindingName binding property name
     */
    (metadata: BindingMetadata): PropertyDecorator;
    /**
     * define Output property decorator with binding property name and provider.
     *
     * @param {(Registration | ClassType)} provider define provider to resolve value to the property.
     */
    (provider: Registration | ClassType, defaultVal?: any): PropertyDecorator;

    /**
     * define Output property decorator with binding property name and provider.
     *
     * @param {string} bindingName binding property name
     * @param {*} binding default value.
     */
    (bindingName: string, defaultVal: any): PropertyDecorator;

    /**
     * define Output property decorator with binding property name and provider.
     *
     * @param {string} bindingName binding property name
     * @param {Token} provider define provider to resolve value to the property.
     * @param {*} binding default value.
     */
    (bindingName: string, provider: Token, defaultVal: any): PropertyDecorator;

    /**
     * define property decorator.
     */
    (target: object, propertyKey: string | symbol, descriptor?: TypedPropertyDescriptor<any>): void;
}

/**
 * output property decorator.
 */
export const Output: OutputPropertyDecorator = createPropDecorator<BindingMetadata>('Output', {
    actions: [
        (ctx, next) => {
            let arg = ctx.currArg;
            if (isString(arg)) {
                ctx.metadata.bindingName = arg;
                ctx.next(next);
            } else if (isClassType(arg) || arg instanceof Registration) {
                ctx.metadata.provider = arg;
                ctx.next(next);
            }
        },
        (ctx, next) => {
            let arg = ctx.currArg;
            if (ctx.args.length > 2 && isToken(arg)) {
                ctx.metadata.provider = arg;
                ctx.next(next);
            } else {
                ctx.metadata.defaultValue = arg;
            }

        },
        (ctx, next) => {
            ctx.metadata.defaultValue = ctx.currArg;
        }
    ],
    append: meta => {
        meta.direction = 'output';
    }
});



/**
 * pipe decorator.
 */
export type PipeDecorator = <TFunction extends Type<PipeTransform>>(target: TFunction) => TFunction | void;


/**
 * Pipe decorator.
 *
 * @export
 * @interface IInjectableDecorator
 */
export interface IPipeDecorator {
    /**
     * Pipe decorator, define the class as pipe.
     *
     * @Pipe
     *
     * @param {PipeMetadata} [metadata] metadata map.
     */
    (metadata?: PipeMetadata): PipeDecorator;

    /**
     * Pipe decorator, define the class as pipe.
     *
     * @Pipe
     * @param {string} name  pipe name.
     * @param {boolean} pure If Pipe is pure (its output depends only on its input.) defaut true.
     */
    (name: string, pure?: boolean): PipeDecorator;
}

/**
 * Pipe decorator, define for class. use to define the class. it can setting provider to some token, singleton or not. it will execute  [`PipeLifecycle`]
 *
 * @Pipe
 */
export const Pipe: IPipeDecorator = createClassDecorator<PipeMetadata>('Pipe', {
    actionType: ['annoation', 'typeProviders'],
    classHandle: (ctx, next) => {
        const reflect = ctx.reflect as AnnotationReflect;
        reflect.annoType = 'pipe';
        reflect.annoDecor = ctx.decor;
        reflect.annotation = ctx.matedata;
        return next();
    },
    actions: [
        (ctx, next) => {
            if (isString(ctx.currArg)) {
                ctx.metadata.name = ctx.currArg;
                ctx.next(next);
            }
        },
        (ctx, next) => {
            if (isBoolean(ctx.currArg)) {
                ctx.metadata.pure = ctx.currArg;
            }
        }
    ],
    append: meta => {
        if (isUndefined(meta.pure)) {
            meta.pure = true;
        }
    }
});


export type RefChildDectorator = (target: Object, propertyKey: string | symbol) => void;


/**
 * RefChild decorator
 *
 * @export
 * @interface IInjectableDecorator
 * @extends {IClassDecorator<IRefChildMetadata>}
 */
export interface IRefChildDecorator {
    /**
     * define RefChild property decorator with binding property name.
     *
     * @param {string} bindingName binding property name
     */
    (bindingName?: string): PropertyDecorator;

    /**
     * define RefChild property decorator with binding metadata.
     *
     * @param {string} bindingName binding property name
     */
    (metadata: BindingMetadata): PropertyDecorator;
    /**
     * define RefChild property decorator with binding property name and provider.
     *
     * @param {(Registration | ClassType)} provider define provider to resolve value to the property.
     * @param {*} defaultVal default value.
     */
    (provider: Registration | ClassType, defaultVal?: any): PropertyDecorator;
    /**
     * define RefChild property decorator with binding property name and provider.
     *
     * @param {string} bindingName binding property name
     * @param {*} defaultVal default value.
     */
    (bindingName: string, defaultVal: any): PropertyDecorator;
    /**
     * define RefChild property decorator with binding property name and provider.
     *
     * @param {string} bindingName binding property name
     * @param {Token} provider define provider to resolve value to the property.
     * @param {*} defaultVal default value.
     */
    (bindingName: string, provider: Token, defaultVal: any): PropertyDecorator;
    /**
     * define property decorator.
     */
    (target: object, propertyKey: string | symbol, descriptor?: TypedPropertyDescriptor<any>): void;
}

/**
 * RefChild decorator, define for class. use to define the class. it can setting provider to some token, singleton or not. it will execute  [`RefChildLifecycle`]
 *
 * @RefChild
 */
export const RefChild: IRefChildDecorator = createPropDecorator<BindingMetadata>('RefChild', {
    actions: [
        (ctx, next) => {
            let arg = ctx.currArg;
            if (isString(arg)) {
                ctx.metadata.bindingName = arg;
                ctx.next(next);
            } else if (isClassType(arg) || arg instanceof Registration) {
                ctx.metadata.provider = arg;
                ctx.next(next);
            }
        },
        (ctx, next) => {
            let arg = ctx.currArg;
            if (ctx.args.length > 2 && isToken(arg)) {
                ctx.metadata.provider = arg;
                ctx.next(next);
            } else {
                ctx.metadata.defaultValue = arg;
            }
        },
        (ctx, next) => {
            ctx.metadata.defaultValue = ctx.currArg;
        }
    ]
});


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

/**
 * Vaildate decorator.
 */
export const Vaildate: VaildatePropertyDecorator = createPropDecorator<VaildateMetadata>('Vaildate', {
    actions: [
        (ctx, next) => {
            let arg = ctx.currArg;
            if (isBoolean(arg)) {
                ctx.metadata.required = arg;
                ctx.next(next);
            } else if (isFunction(arg)) {
                ctx.metadata.vaild = arg;
                ctx.next(next);
            }
        },
        (ctx, next) => {
            let arg = ctx.currArg;
            if ((ctx.args.length > 2 && isString(arg))) {
                ctx.metadata.errorMsg = arg;
                ctx.next(next);
            }

        }
    ]
}) as VaildatePropertyDecorator;
