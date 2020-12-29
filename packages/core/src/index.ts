export * from './tk'

export * from './services/loader';
export * from './services/providers';

// injector actions
export * from './injects/context';
export * from './injects/lifescope';
export * from './injects/actions';

// resolves actions
// service
export * from './resolves/context';
export * from './resolves/actions';

export * from './IBuilder';
export * from './builder';

export { IInjector as ICoreInjector, IContainer, LoadType, CONTAINER, Container, InjectorImpl as CoreInjector } from '@tsdi/ioc';
