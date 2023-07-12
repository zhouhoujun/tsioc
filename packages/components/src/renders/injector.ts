import { DestroyCallback, InjectFlags, Injector, InjectorScope, InvocationContext,  MethodType, Modules, Platform, ProviderType, RegisterOption, Token, Type, TypeDef, TypeOption } from '@tsdi/ioc';
import { TContainerNode, TDirectiveHostNode, TElementContainerNode, TElementNode } from '../interfaces/node';
import { FLAGS, INJECTOR, LView, LViewFlags, TView } from '../interfaces/view';
import { DirectiveDef } from '../type';
import { assertEqual } from '../util/assert';
import { stringifyForError } from '../util/stringify';


export class NodeInjector extends Injector {

    constructor(
        private _tNode: TDirectiveHostNode | null,
        private _lView: LView) {
        super();

    }

    get<T>(token: Token<T>, notFoundValue?: T | undefined, flags?: InjectFlags | undefined): T;
    get<T>(token: Token<T>, context?: InvocationContext<any> | undefined, flags?: InjectFlags | undefined, notFoundValue?: T | undefined): T;
    get(token: unknown, context?: unknown, flags?: unknown, notFoundValue?: unknown): any {
        throw new Error('Method not implemented.');
    }

    scope?: InjectorScope | undefined;
    parent?: Injector | undefined;
    platform(): Platform {
        throw new Error('Method not implemented.');
    }
    get lifecycle(): LifecycleHooks {
        throw new Error('Method not implemented.');
    }
    tokens(): Token<any>[] {
        throw new Error('Method not implemented.');
    }
    get size(): number {
        throw new Error('Method not implemented.');
    }
    has<T>(token: Token<T>, flags?: InjectFlags | undefined): boolean {
        throw new Error('Method not implemented.');
    }
    resolve<T>(option: ResolveOption<T>): T;
    resolve<T>(token: Token<T>, option?: ResolverOption | undefined): T;
    resolve<T>(token: Token<T>, context?: InvocationContext<any> | undefined): T;
    resolve<T>(token: Token<T>, providers?: ProviderType[] | undefined): T;
    resolve<T>(token: Token<T>, ...providers: ProviderType[]): T;
    resolve(token: unknown, providers?: unknown, ...rest: unknown[]): any {
        throw new Error('Method not implemented.');
    }
    getService<T>(option: ResolveOption<T>): T;
    getService<T>(token: Token<T>, option?: ResolverOption | undefined): T;
    getService<T>(token: Token<T>, context?: InvocationContext<any> | undefined): T;
    getService<T>(token: Token<T>, providers?: ProviderType[] | undefined): T;
    getService<T>(token: Token<T>, ...providers: ProviderType[]): T;
    getService(token: unknown, providers?: unknown, ...rest: unknown[]): any {
        throw new Error('Method not implemented.');
    }
    setValue<T>(token: Token<T>, value: T, provider?: Type<T> | undefined): this {
        throw new Error('Method not implemented.');
    }
    setSingleton<T>(token: Token<T>, value: T): this {
        throw new Error('Method not implemented.');
    }
    getTokenProvider<T>(token: Token<T>, flags?: InjectFlags | undefined): Type<T> {
        throw new Error('Method not implemented.');
    }
    cache<T>(token: Token<T>, instance: T, expires: number): this {
        throw new Error('Method not implemented.');
    }
    inject(providers: ProviderType[]): this;
    inject(...providers: ProviderType[]): this;
    inject(providers?: unknown, ...rest: unknown[]): this {
        throw new Error('Method not implemented.');
    }
    use(modules: Modules[]): Type<any>[];
    use(...modules: Modules[]): Type<any>[];
    use(modules?: unknown, ...rest: unknown[]): Type<any>[] {
        throw new Error('Method not implemented.');
    }
    register(types: (Type<any> | RegisterOption<any>)[]): this;
    register(...types: (Type<any> | RegisterOption<any>)[]): this;
    register(types?: unknown, ...rest: unknown[]): this {
        throw new Error('Method not implemented.');
    }
    unregister<T>(token: Token<T>): this {
        throw new Error('Method not implemented.');
    }
    invoke<T, TR = any>(target: T | Type<T>, propertyKey: MethodType<T>, ...providers: ProviderType[]): TR;
    invoke<T, TR = any>(target: T | Type<T> | TypeDef<T>, propertyKey: MethodType<T>, providers: ProviderType[]): TR;
    invoke<T, TR = any>(target: T | Type<T> | TypeDef<T>, propertyKey: MethodType<T>, option?: InvokeOption | undefined): TR;
    invoke<T, TR = any>(target: T | Type<T> | TypeDef<T>, propertyKey: MethodType<T>, context?: InvocationContext<any> | undefined): TR;
    invoke(target: unknown, propertyKey: unknown, context?: unknown, ...rest: unknown[]): any {
        throw new Error('Method not implemented.');
    }
    getLoader(): ModuleLoader {
        throw new Error('Method not implemented.');
    }
    load(modules: LoadType[]): Promise<Type<any>[]>;
    load(...modules: LoadType[]): Promise<Type<any>[]>;
    load(modules?: unknown, ...rest: unknown[]): Promise<Type[]> {
        throw new Error('Method not implemented.');
    }
    get destroyed(): boolean {
        throw new Error('Method not implemented.');
    }
    destroy(): void | Promise<void> {
        throw new Error('Method not implemented.');
    }
    onDestroy(): void;
    onDestroy(callback: DestroyCallback): void;
    onDestroy(callback?: unknown): void {
        throw new Error('Method not implemented.');
    }
    offDestroy(callback: DestroyCallback): void {
        throw new Error('Method not implemented.');
    }
    protected processRegister(platform: Platform, type: Type<any>, def: TypeDef<any>, option?: TypeOption<any> | undefined): void {
        throw new Error('Method not implemented.');
    }


}


/**
 * Retrieve or instantiate the injectable from the `LView` at particular `index`.
 *
 * This function checks to see if the value has already been instantiated and if so returns the
 * cached `injectable`. Otherwise if it detects that the value is still a factory it
 * instantiates the `injectable` and caches the value.
 */
 export function getNodeInjectable(
    lView: LView, tView: TView, index: number, tNode: TDirectiveHostNode): any {
  let value = lView[index];
  const tData = tView.data;
  if (isFactory(value)) {
    const factory: NodeInjectorFactory = value;
    if (factory.resolving) {
      throwCyclicDependencyError(stringifyForError(tData[index]));
    }
    const previousIncludeViewProviders = setIncludeViewProviders(factory.canSeeViewProviders);
    factory.resolving = true;
    const previousInjectImplementation =
        factory.injectImpl ? setInjectImplementation(factory.injectImpl) : null;
    const success = enterDI(lView, tNode, InjectFlags.Default);
    devMode &&
        assertEqual(
            success, true,
            'Because flags do not contain \`SkipSelf\' we expect this to always succeed.');
    try {
      value = lView[index] = factory.factory(undefined, tData, lView, tNode);
      // This code path is hit for both directives and providers.
      // For perf reasons, we want to avoid searching for hooks on providers.
      // It does no harm to try (the hooks just won't exist), but the extra
      // checks are unnecessary and this is a hot path. So we check to see
      // if the index of the dependency is in the directive range for this
      // tNode. If it's not, we know it's a provider and skip hook registration.
      if (tView.firstCreatePass && index >= tNode.directiveStart) {
        devMode && assertDirectiveDef(tData[index]);
        registerPreOrderHooks(index, tData[index] as DirectiveDef<any>, tView);
      }
    } finally {
      previousInjectImplementation !== null &&
          setInjectImplementation(previousInjectImplementation);
      setIncludeViewProviders(previousIncludeViewProviders);
      factory.resolving = false;
      leaveDI();
    }
  }
  return value;
}
