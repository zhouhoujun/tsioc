import { ClassType, Type } from '../types';
import { isString, isArray } from '../utils/chk';
import { Token, getToken } from '../tokens';
import {
    ClassMetadata, AutorunMetadata, AutoWiredMetadata, InjectMetadata, PatternMetadata,
    InjectableMetadata, ParameterMetadata, ProvidersMetadata, ProviderInMetadata
} from './meta';
import { ClassMethodDecorator, createDecorator, createParamDecorator, PropParamDecorator } from './fac';
import { Injector, ProviderType } from '../injector';



/**
 * AutoWired decoator.
 */
export interface AutoWired {
    /**
     * AutoWired decorator, for property or param, use to auto wried type instance or value to the instance of one class with the decorator.
     *
     * @param {Token<T>} [provider] define provider to resolve value to the parameter or property.
     * @param {string} [alias] define this class provider with alias for provide.
     */
    (provider?: Token, alias?: string): PropParamDecorator;
    /**
     * AutoWired decorator with providers for method.
     *
     * @param {ProviderType[]} [providers] the providers for the method.
     */
    (providers?: ProviderType[]): MethodDecorator;
    /**
     * AutoWired decorator, for property or param, use to auto wried type instance or value to the instance of one class with the decorator.
     * @param {T} [metadata] define matadata map to resolve value to the parameter or property.
     */
    (metadata: AutoWiredMetadata): PropParamDecorator;
}


/**
 * AutoWired decorator, for property or param. use to auto wried type instance or value to the instance of one class with the decorator.
 *
 * @AutoWired()
 */
export const AutoWired: AutoWired = createDecorator<AutoWiredMetadata>('AutoWired', {
    props: (pdr: ProviderType[] | Token, alias?: string) => {
        if (isArray(pdr)) {
            return { providers: pdr };
        } else {
            return { provider: getToken(pdr, alias) };
        }
    }
});

/**
 * inject decoator.
 */
export interface Inject {
    /**
     * Inject decorator, for property or param, use to auto wried type instance or value to the instance of one class with the decorator.
     *
     * @param {Token<T>} [provider] define provider to resolve value to the parameter or property.
     * @param {string} [alias] define this class provider with alias for provide.
     */
    (provider?: Token, alias?: string): PropParamDecorator;
    /**
     * Inject decorator with providers for method.
     *
     * @param {ProviderType[]} [providers] the providers for the method.
     */
    (providers?: ProviderType[]): MethodDecorator;
    /**
     * Inject decorator, for property or param, use to auto wried type instance or value to the instance of one class with the decorator.
     * @param {T} [metadata] define matadata map to resolve value to the parameter or property.
     */
    (metadata: InjectMetadata): PropParamDecorator;
}

/**
 * Inject decorator, for property or param, use to auto wried type instance or value to the instance of one class with the decorator.
 *
 * @Inject()
 */
export const Inject: Inject = createDecorator<InjectMetadata>('Inject', {
    props: (pdr: ProviderType[] | Token, alias?: string) => {
        if (isArray(pdr)) {
            return { providers: pdr };
        } else {
            return { provider: getToken(pdr, alias) };
        }
    }
});


/**
 * Parameter decorator.
 *
 * @export
 * @interface Param
 */
export interface Param {
    /**
     * define parameter decorator with param.
     *
     * @param {Token} provider define provider to resolve value to the parameter.
     */
    (provider?: Token, alias?: string): ParameterDecorator;
    /**
     * define parameter decorator with metadata map.
     * @param {T} [metadata] define matadata map to resolve value to the parameter.
     */
    (metadata: ParameterMetadata): ParameterDecorator;
}

/**
 * param decorator, define for parameter. use to auto wried type instance or value to the instance of one class with the decorator.
 *
 * @Param()
 */
export const Param: Param = createParamDecorator<ParameterMetadata>('Param');


/**
 * Injectable decorator
 *
 * @export
 * @interface Injectable
 */
export interface Injectable {

    /**
     * Injectable decorator setting with params.
     *
     * @param {Token} [provide] define this class provider for provide.
     * @param {PatternMetadata} [pattern] define this class pattern.
     */
    (provide?: Token, pattern?: PatternMetadata): ClassDecorator;

    /**
     * Injectable decorator setting with params.
     *
     * @param {Token} provide define this class provider for provide.
     * @param {string} alias define this class provider with alias for provide.
     * @param {PatternMetadata} [pattern] define this class pattern.
     */
    (provide: Token, alias: string, pattern?: PatternMetadata): ClassDecorator;

    /**
     * Injectable decorator, define for class.  use to define the class. it can setting provider to some token, singleton or not.
     *
     * @Injectable()
     *
     * @param {InjectableMetadata} [metadata] metadata map.
     */
    (metadata: InjectableMetadata): ClassDecorator;
}


/**
 * Injectable decorator, define for class.  use to define the class. it can setting provider to some token, singleton or not.
 *
 * @Injectable()
 */
export const Injectable: Injectable = createDecorator<InjectableMetadata>('Injectable', {
    props: (provide: Token, arg2: any, arg3?: any) => {
        if (isString(arg2)) {
            return { provide: getToken(provide, arg2), ...arg3 }
        } else {
            return { provide, ...arg2 }
        }
    }
});


/**
 * @Providers decorator, for class. use to define the class as service of target.
 *
 * @Providers
 *
 * @export
 * @interface Providers
 */
export interface Providers {
    /**
     * Providers decorator, for class. use to add ref service to the class.
     *
     * @Providers
     *
     * @param {(Registration | symbol | string)} providers provider reference service to target.
     */
    (providers: ProviderType[]): ClassMethodDecorator;

    /**
     * Providers decorator, for class. use to add ref service to the class.
     *
     * @Providers
     *
     * @param {ProvidersMetadata} [metadata] metadata map.
     */
    (metadata: ProvidersMetadata): ClassMethodDecorator;
}

/**
 * Providers decorator, for class. use to add ref service to the class.
 *
 * @Providers
 */
export const Providers: Providers = createDecorator<ProvidersMetadata>('Providers', {
    props: (providers: ProviderType[]) => ({ providers }),
});



/**
 * ProviderIn decorator, for class. use to define the class as service of target.
 *
 * @Refs
 *
 * @export
 * @interface ProviderIn
 */
export interface ProviderIn {
    /**
     * Refs decorator, for class. use to define the class as service of target.
     *
     * @Refs
     *
     * @param {ClassType} target reference to target token.
     */
    (target: ClassType): ClassDecorator;

    /**
     * Refs decorator, for class. use to define the class as service of target.
     *
     * @Refs
     *
     * @param {ClassType} target reference to target token.
     * @param {Token} provide define this class ref provider for provide.
     * @param {string} [alias] define this class ref provider with alias for provide.
    */
    (target: ClassType, provide: Token, alias?: string): ClassDecorator;

    /**
     * Refs decorator, for class. use to define the class as service of target.
     *
     * @Refs
     *
     * @param {ProviderInMetadata} [metadata] metadata map.
     */
    (metadata: ProviderInMetadata): ClassDecorator;
}

/**
 * Refs decorator, for class. use to define the class as service of target.
 *
 * @Refs
 */
export const ProviderIn: ProviderIn = createDecorator<ProviderInMetadata>('ProviderIn', {
    props: (target: ClassType, provide?: Token, alias?: string) => ({ target, provide: getToken(provide!, alias) }),
    design: {
        afterAnnoation: (ctx, next) => {
            let meta = ctx.reflect.class.getMetadata<ProviderInMetadata>(ctx.currDecor!);
            const type = ctx.type;
            ctx.injector.state().setTypeProvider(meta.target, [{ provide: meta.provide || type, useClass: type }])
            return next();
        }
    }
});


export const Refs = ProviderIn;

/**
 * Singleton decorator, for class. use to define the class is singleton.
 *
 * @Singleton()
 *
 * @export
 * @interface Singleton
 */
export interface Singleton {
    /**
     * Singleton decorator, for class. use to define the class is singleton.
     *
     * @Singleton()
     *
     * @param {Token} provide define this class provider for provide.
     */
    (provide?: Token): ClassDecorator;

    /**
     * Singleton decorator, for class. use to define the class is singleton.
     *
     * @Singleton()
     *
     * @param {Token} provide define this class provider for provide.
     * @param {string} alias define this class provider with alias for provide.
     */
    (provide: Token, alias: string): ClassDecorator;

    /**
     * Singleton decorator, for class. use to define the class is singleton.
     *
     * @Singleton()
     *
     * @param {ClassMetadata} metadata metadata map.
     */
    (metadata: ClassMetadata): ClassDecorator;
}

/**
 * Singleton decorator, for class. use to define the class is singleton.
 *
 * @Singleton()
 */
export const Singleton: Singleton = createDecorator<ClassMetadata>('Singleton', {
    props: (provide: Token, alias?: string) => ({ provide: getToken(provide, alias) }),
    appendProps: (meta) => {
        meta.singleton = true;
    }
});



/**
 *  ioc extend inteface.
 */
export interface IocExtentd {
    setup(Injector: Injector): void;
}

/**
 * Ioc Extentd decorator.
 */
export type IocExtentdDecorator = <TFunction extends Type<IocExtentd>>(target: TFunction) => TFunction | void;

/**
 * IocExt decorator. define for class, use to define the class is Ioc extends module. it will auto run after registered to helper your to setup module.
 *
 * @IocExt()
 */
export interface IocExt {
    /**
     * IocExt decorator. define for class, use to define the class is Ioc extends module. it will auto run after registered to helper your to setup module.
     *
     * @IocExt()
     *
     * @param {string} [autorun] auto run special method.
     */
    (): IocExtentdDecorator;
}

/**
 * IocExt decorator. define for class, use to define the class is Ioc extends module. it will auto run after registered to helper your to setup module.
 *
 * @IocExt()
 */
export const IocExt: IocExt = createDecorator<AutorunMetadata>('IocExt', {
    reflect: {
        class: (ctx, next) => {
            ctx.reflect.iocExt = true;
        }
    },
    appendProps: (metadata) => {
        metadata.autorun = 'setup';
        metadata.singleton = true;
        metadata.regIn = 'root';
    }
});



/**
 * autorun decorator inteface
 *
 * @export
 * @interface Autorun
 */
export interface Autorun {
    /**
     * Autorun decorator, for class.  use to define the class auto run (via a method or not) after registered.
     * @Autorun
     *
     * @param {string} [autorun] the special method name when define to class.
     */
    (autorun: string): ClassDecorator;
    /**
     * Autorun decorator, for class or method. use to define the class auto run (via a method or not) after registered.
     * @Autorun
     *
     * @param {AutorunMetadata} [metadata] metadata map.
     */
    (metadata: AutorunMetadata): ClassMethodDecorator;

    /**
     * Autorun decorator, for method.  use to define the method auto run (via a method or not) after registered.
     * @Autorun
     *
     * @param {string} [autorun] the special method name when define to class.
     */
    (order?: number): MethodDecorator;
}

/**
 * Autorun decorator, for class or method.  use to define the class auto run (via a method or not) after registered.
 *
 * @Autorun
 */
export const Autorun: Autorun = createDecorator<AutorunMetadata>('Autorun', {
    props: (arg: string | number) => {
        if (isString(arg)) {
            return { autorun: arg };
        }
        return { order: arg }
    },
    appendProps: (meta) => {
        meta.singleton = true;
    }
});
