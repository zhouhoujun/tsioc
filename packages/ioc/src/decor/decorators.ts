import { Type } from '../types';
import { isString, isArray } from '../utils/lang';
import { Token, ProvideToken, Provider, isProvideToken } from '../tokens';
import { IIocContainer } from '../IIocContainer';
import {
    ClassMetadata, AutorunMetadata, AutoWiredMetadata, InjectMetadata,
    InjectableMetadata, ParameterMetadata, ProvidersMetadata, RefMetadata, TypeMetadata, PatternMetadata, RefProvider
} from './metadatas';
import {
    createDecorator, createClassDecorator, ClassMethodDecorator,
    createParamDecorator, PropParamDecorator
} from './factory';

/**
 * Abstract decorator. define the class as abstract class.
 */
export interface IAbstractDecorator {
    /**
     * define class is abstract class.
     *
     * @param {T} [metadata] metadata map.
     */
    (metadata?: TypeMetadata): ClassDecorator;
}

/**
 * Abstract decorator. define for class.
 *
 * @Abstract
 */
export const Abstract: IAbstractDecorator = createClassDecorator<TypeMetadata>('Abstract', {
    appendProps: (meta) => {
        meta.abstract = true;
    }
});

/**
 * AutoWired decoator.
 */
export interface IAutoWiredDecorator {
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
     * @param {Provider[]} [providers] the providers for the method.
     */
    (providers?: Provider[]): MethodDecorator;
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
export const AutoWired: IAutoWiredDecorator = createDecorator<AutoWiredMetadata>('AutoWired', {
    props: (pdr: Provider[] | Token, alias?: string) => {
        if (isArray(pdr)) {
            return { providers: pdr };
        } else {
            return { provider: pdr, alias };
        }
    }
});

/**
 * inject decoator.
 */
export interface IInjectDecorator {
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
     * @param {Provider[]} [providers] the providers for the method.
     */
    (providers?: Provider[]): MethodDecorator;
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
export const Inject: IInjectDecorator = createDecorator<InjectMetadata>('Inject', {
    props: (pdr: Provider[] | Token, alias?: string) => {
        if (isArray(pdr)) {
            return { providers: pdr };
        } else {
            return { provider: pdr, alias };
        }
    }
});


/**
 * Parameter decorator.
 *
 * @export
 * @interface IParamDecorator
 */
export interface IParamDecorator {
    /**
     * define parameter decorator with param.
     *
     * @param {Token} provider define provider to resolve value to the parameter.
     */
    (provider?: Token): ParameterDecorator;
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
export const Param: IParamDecorator = createParamDecorator<ParameterMetadata>('Param');


/**
 * Injectable decorator
 *
 * @export
 * @interface IInjectableDecorator
 * @extends {IClassDecorator<InjectableMetadata>}
 */
export interface IInjectableDecorator {

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
export const Injectable: IInjectableDecorator = createClassDecorator<InjectableMetadata>('Injectable', {
    props: (provide: Token, arg2: any, arg3?: any) => {
        if (!arg2 && !isProvideToken(provide)) {
            return null;
        }
        if (isString(arg2)) {
            return { provide, alias: arg2, ...arg3 }
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
 * @interface IProvidersDecorator
 * @extends {IClassDecorator<ProvidersMetadata>}
 */
export interface IProvidersDecorator {
    /**
     * Providers decorator, for class. use to add ref service to the class.
     *
     * @Providers
     *
     * @param {(Registration | symbol | string)} providers provider reference service to target.
     */
    (providers: Provider[]): ClassMethodDecorator;

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
export const Providers: IProvidersDecorator = createDecorator<ProvidersMetadata>('Providers', {
    props: (providers: Provider[]) => {
        return { providers };
    }
}) as IProvidersDecorator;



/**
 * Refs decorator, for class. use to define the class as service of target.
 *
 * @Refs
 *
 * @export
 * @interface IRefToDecorator
 * @extends {IClassDecorator<RefMetadata>}
 */
export interface IRefsDecorator {
    /**
     * Refs decorator, for class. use to define the class as service of target.
     *
     * @Refs
     *
     * @param {Token} target reference to target token.
     */
    (target: Token): ClassDecorator;

    /**
     * Refs decorator, for class. use to define the class as service of target.
     *
     * @Refs
     *
     * @param {Token} target reference to target token.
     * @param {Token} provide define this class ref provider for provide.
     * @param {string} [alias] define this class ref provider with alias for provide.
    */
    (target: Token, provide: Token, alias?: string): ClassDecorator;

    /**
     * Refs decorator, for class. use to define the class as service of target.
     *
     * @Refs
     *
     * @param {RefMetadata} [metadata] metadata map.
     */
    (metadata: RefMetadata): ClassDecorator;
}

/**
 * Refs decorator, for class. use to define the class as service of target.
 *
 * @Refs
 */
export const Refs: IRefsDecorator = createClassDecorator<RefMetadata>('Refs', {
    props: (target: Token, provide?: Token, alias?: string) => {
        const refs = { target, provide, alias } as RefProvider;
        return { refs };
    }
}) as IRefsDecorator;


/**
 * Singleton decorator, for class. use to define the class is singleton.
 *
 * @Singleton()
 *
 * @export
 * @interface ISingletonDecorator
 * @extends {IClassDecorator<ClassMetadata>}
 */
export interface ISingletonDecorator {
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
export const Singleton: ISingletonDecorator = createClassDecorator<ClassMetadata>('Singleton', {
    appendProps: (meta) => {
        meta.singleton = true;
    }
}) as ISingletonDecorator;



/**
 *  ioc extend inteface.
 */
export interface IocExtentd {
    setup(container: IIocContainer);
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
export interface IocExtDecorator {
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
export const IocExt: IocExtDecorator = createClassDecorator<AutorunMetadata>('IocExt', {
    appendProps: (metadata) => {
        metadata.autorun = 'setup';
        metadata.singleton = true;
        metadata.regIn = 'root';
    }
}) as IocExtDecorator;



/**
 * autorun decorator inteface
 *
 * @export
 * @interface IAutorunDecorator
 * @extends {IClassMethodDecorator<AutorunMetadata>}
 */
export interface IAutorunDecorator {
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
export const Autorun: IAutorunDecorator = createDecorator<AutorunMetadata>('Autorun', {
    props: (arg: string | number) => {
        if (isString(arg)) {
            return { autorun: arg };
        }
        return { order: arg }
    },
    appendProps: (meta) => {
        meta.singleton = true;
    }
}) as IAutorunDecorator;
