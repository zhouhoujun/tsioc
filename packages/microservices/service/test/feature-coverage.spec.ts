import { Observable } from 'rxjs';
import expect = require('expect');
import { TransferSide, Transport, RequestContext, RequestHandler } from '@tsdi/common';
import {
    ServiceFeatureKind,
    useRegistration,
    useHealth,
    useGracefulShutdown,
    useInterceptors,
    useGuards,
    useFilters,
    useMiddlewares,
    useTransfers,
    useBodySerializer,
    SERVICE_REGISTRATION_OPTIONS,
    SERVICE_HEALTH_OPTIONS,
    SERVICE_GRACEFUL_SHUTDOWN_OPTIONS,
    SERVICE_BODY_SERIALIZER_OPTIONS,
    getServiceInterceptorsToken,
    getServiceGuardsToken,
    getServiceFiltersToken,
    getServiceMiddlewaresToken,
    getServiceTransfersToken,
    SenderFilter,
} from '../src';

function createBaseConfig() {
    return {
        transport: Transport.HTTP,
        side: TransferSide.server,
        microservice: true,
        features: {}
    } as any;
}

describe('service feature coverage', () => {

    it('useRegistration should register REGISTRATION_OPTIONS provider', () => {
        const config = createBaseConfig();
        const feature = useRegistration()(config) as any;
        expect(feature.kind).toBe(ServiceFeatureKind.Registration);
        expect(feature.providers.some((p: any) => p.provide === SERVICE_REGISTRATION_OPTIONS)).toBe(true);
    });

    it('useRegistration(false) normalizes to empty options', () => {
        const config = createBaseConfig();
        const feature = useRegistration(false)(config) as any;
        expect(feature.kind).toBe(ServiceFeatureKind.Registration);
        const optProvider = feature.providers.find((p: any) => p.provide === SERVICE_REGISTRATION_OPTIONS);
        expect(optProvider).toBeDefined();
        expect(optProvider.useValue).toEqual({});
    });

    it('useHealth() should register HEALTH_OPTIONS provider', () => {
        const config = createBaseConfig();
        const feature = useHealth({ enabled: true })(config) as any;
        expect(feature.kind).toBe(ServiceFeatureKind.Health);
        const optProvider = feature.providers.find((p: any) => p.provide === SERVICE_HEALTH_OPTIONS);
        expect(optProvider).toBeDefined();
        expect(optProvider.useValue).toEqual({ enabled: true });
    });

    it('useHealth() with boolean false normalizes to empty options', () => {
        const config = createBaseConfig();
        const feature = useHealth(false)(config) as any;
        expect(feature.kind).toBe(ServiceFeatureKind.Health);
        const optProvider = feature.providers.find((p: any) => p.provide === SERVICE_HEALTH_OPTIONS);
        expect(optProvider).toBeDefined();
        expect(optProvider.useValue).toEqual({});
    });

    it('useGracefulShutdown should register GRACEFUL_SHUTDOWN_OPTIONS provider', () => {
        const config = createBaseConfig();
        const feature = useGracefulShutdown({ enabled: true })(config) as any;
        expect(feature.kind).toBe(ServiceFeatureKind.GracefulShutdown);
        const optProvider = feature.providers.find((p: any) => p.provide === SERVICE_GRACEFUL_SHUTDOWN_OPTIONS);
        expect(optProvider).toBeDefined();
        expect(optProvider.useValue).toEqual({ enabled: true });
    });

    it('useInterceptors should register custom interceptors', () => {
        const config = createBaseConfig();
        const tk = getServiceInterceptorsToken(config);
        class MockInterceptor {
            intercept(input: any, next: RequestHandler, context: RequestContext): Observable<any> {
                return next.handle(input, context);
            }
        }
        const feature = useInterceptors(MockInterceptor)(config) as any;
        expect(feature.kind).toBe(ServiceFeatureKind.Interceptors);
        expect(feature.providers.some((p: any) => p.provide === tk && p.useClass === MockInterceptor)).toBe(true);
    });

    it('useGuards should register guard providers', () => {
        const config = createBaseConfig();
        const tk = getServiceGuardsToken(config);
        class MockGuard {
            can(input: any, context: any) { return true; }
        }
        const feature = useGuards(MockGuard as any)(config) as any;
        expect(feature.kind).toBe(ServiceFeatureKind.Guards);
        expect(feature.providers.some((p: any) => p.provide === tk && p.useClass === MockGuard)).toBe(true);
    });

    it('useFilters should register filter providers', () => {
        const config = createBaseConfig();
        const tk = getServiceFiltersToken(config);
        class MockFilter {
            doFilter(input: any, ctx: any) { return input; }
        }
        const feature = useFilters(MockFilter as any)(config) as any;
        expect(feature.kind).toBe(ServiceFeatureKind.Filters);
        expect(feature.providers.some((p: any) => p.provide === tk && p.useClass === MockFilter)).toBe(true);
    });

    it('useMiddlewares should register middleware providers', () => {
        const config = createBaseConfig();
        const tk = getServiceMiddlewaresToken(config);
        const mockMw = {
            use(input: any, next: any, context: any) { return next(input, context); }
        };
        const feature = useMiddlewares(mockMw as any)(config) as any;
        expect(feature.kind).toBe(ServiceFeatureKind.Middlewares);
        expect(feature.providers.some((p: any) => p.provide === tk && p.useValue === mockMw)).toBe(true);
    });

    it('useTransfers should register transfer providers', () => {
        const config = createBaseConfig();
        const tk = getServiceTransfersToken(config);
        const mockTransfer = (() => [(_req: any, _next: any, _ctx: any) => null]) as any;
        const feature = useTransfers(mockTransfer)(config) as any;
        expect(feature.kind).toBe(ServiceFeatureKind.Transfer);
        expect(feature.providers.some((p: any) => p.provide === tk)).toBe(true);
    });

    it('useTransfers should use default transfer without mutating selector state', () => {
        const config = createBaseConfig();
        const tk = getServiceTransfersToken(config);
        const mockTransfer = (() => [(_req: any, _next: any, _ctx: any) => null]) as any;
        config.features.defaultTransfer = mockTransfer;

        const featureA = useTransfers()(config) as any;
        const featureB = useTransfers()(config) as any;

        expect(featureA.providers.filter((p: any) => p.provide === tk)).toHaveLength(1);
        expect(featureB.providers.filter((p: any) => p.provide === tk)).toHaveLength(1);
    });

    it('supports abstract sender typing export', () => {
        expect(SenderFilter).toBeDefined();
    });

    it('useBodySerializer should register body serializer options', () => {
        const config = createBaseConfig();
        const feature = useBodySerializer({ type: 'form' })(config) as any;
        expect(feature.kind).toBe(ServiceFeatureKind.BodySerializer);
        const optProvider = feature.providers.find((p: any) => p.provide === SERVICE_BODY_SERIALIZER_OPTIONS);
        expect(optProvider).toBeDefined();
        expect(optProvider.useValue).toEqual({ type: 'form' });
    });
});
