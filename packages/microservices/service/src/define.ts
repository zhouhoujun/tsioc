import { AbstractType, ArgumentException, Module, Provider } from '@tsdi/ioc';
import { provideService, useFeatures } from './provider';
import { ServiceFeatureOptions, ServiceTransportFeature } from './options';

/**
 * Declarative microservice definition.
 *
 * ```ts
 * const UsersModule = defineService({
 *     transport: useHttpTransport({ listenOpts: { port: 3000 } }),
 *     controllers: [UsersController],
 *     providers: [UsersRepository]
 * });
 * await Application.run(UsersModule);
 * ```
 */
export interface DefineServiceOptions extends ServiceFeatureOptions {
    /** Transport feature(s), e.g. `useHttpTransport(...)` or `useTcpTransport(...)`. */
    transport: ServiceTransportFeature | ServiceTransportFeature[];
    /** Route controllers. */
    controllers?: AbstractType[];
    /** Extra module imports. */
    imports?: AbstractType[];
    /** Extra providers. */
    providers?: Provider[];
}

export interface ServiceCapabilities {
    transports: number;
    controllers: number;
    router: boolean;
    health: boolean;
    registration: boolean;
    gracefulShutdown: boolean;
}

/**
 * Summarize which capabilities a declared service enables. Useful for
 * `doctor`-style startup diagnostics without booting a port.
 */
export function describeService(options: DefineServiceOptions): ServiceCapabilities {
    const transports = Array.isArray(options.transport) ? options.transport : [options.transport];
    return {
        transports: transports.filter(Boolean).length,
        controllers: options.controllers?.length ?? 0,
        router: options.router !== false,
        health: options.health !== false,
        registration: options.registration !== false,
        gracefulShutdown: options.gracefulShutdown !== false
    };
}

/**
 * Build a module class from transport + controllers + providers.
 *
 * Throws an actionable error when no transport is supplied, mirroring
 * `provideService` but earlier (at definition time).
 */
export function defineService(options: DefineServiceOptions): AbstractType {
    const transports = (Array.isArray(options.transport) ? options.transport : [options.transport])
        .filter(Boolean);
    if (!transports.length) {
        throw new ArgumentException(
            'defineService requires at least one transport, e.g. useHttpTransport({ listenOpts: { port: 3000 } }).'
        );
    }
    const featureOptions: ServiceFeatureOptions = { ...options };
    delete (featureOptions as any).transport;
    delete (featureOptions as any).controllers;
    delete (featureOptions as any).imports;
    delete (featureOptions as any).providers;

    class DefinedServiceModule { }

    Module({
        imports: options.imports as any,
        declarations: options.controllers as any,
        providers: [
            ...(options.providers ?? []),
            provideService(...transports, useFeatures(featureOptions))
        ]
    })(DefinedServiceModule);

    return DefinedServiceModule;
}
