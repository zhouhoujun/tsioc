export * from './options';
export * from './features';
export * from './strategies';
export * from './tokens';
export * from './router';
export * from './middleware';
export * from './metadata';
export * from './ServiceHandler';
export * from './Service';
export * from './SetupMicroServices';
export {
    ServiceFeatureKind,
    ServiceFeature,
    ServiceTransportFeature,
    ServiceFeatureFn,
    ServiceFeatureLike,
    provideService,
    makeServiceFeature,
    withServiceFeatures,
    withRegistration,
    withHealth,
    withGracefulShutdown,
    withServiceInterceptors,
    withServiceGuards,
    withServiceFilters,
    withServiceMiddlewares,
    withServiceTransfers,
    withServiceLogger,
    withServiceRouter,
    withServiceControllers,
    SERVICE_REGISTRATION_OPTIONS,
    SERVICE_HEALTH_OPTIONS,
    SERVICE_GRACEFUL_SHUTDOWN_OPTIONS,
    SERVICE_CONFIGS,
    SERV_OPTIONS,
    provideServiceFromDi
} from './provider';

// Re-export core request context types from @tsdi/endpoints.
// Consumers (security, oidc-auth, services/* protocols) import
// these from @tsdi/service so they have a single dependency.
export {
    AbstractRequestContext,
    RestfulRequestContext,
    RouteMappingMetadata,
    Router,
    getRouter,
    SetupServices
} from '@tsdi/endpoints';
