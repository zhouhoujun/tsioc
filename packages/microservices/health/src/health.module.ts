import { Module, ModuleWithProviders, Type } from '@tsdi/ioc';
import { HealthIndicator } from './indicator';
import { HEALTH_INDICATORS } from './tokens';
import { MemoryHealthIndicator } from './indicators/memory.indicator';

/**
 * Health module providers.
 */
export const HEALTH_PROVIDERS = [
    MemoryHealthIndicator,
    { provide: HEALTH_INDICATORS, useClass: MemoryHealthIndicator, multi: true }
];

/**
 * Health module.
 *
 * 健康检查模块，提供健康指示器系统。控制器需要在应用根模块声明：
 *
 * ```ts
 * @Module({
 *   imports: [HealthModule],
 *   declarations: [HealthController],
 *   providers: [provideService(useRouter(), useHttpTransport(...))]
 * })
 * ```
 */
@Module({
    providers: HEALTH_PROVIDERS
})
export class HealthModule {
    /**
     * create health module with custom indicators.
     * @param indicators custom health indicators.
     * @returns module with providers.
     */
    static withIndicators(...indicators: Type<HealthIndicator>[]): ModuleWithProviders<HealthModule> {
        const providers = indicators.map(ind => ({
            provide: HEALTH_INDICATORS,
            useClass: ind,
            multi: true
        }));
        return {
            module: HealthModule,
            providers
        };
    }

    /**
     * create health module with indicator instances.
     * @param indicators health indicator instances or types.
     * @returns module with providers.
     */
    static withOptions(options: {
        indicators?: (Type<HealthIndicator> | HealthIndicator)[];
        includeMemory?: boolean;
    }): ModuleWithProviders<HealthModule> {
        const providers: any[] = [];

        if (options.indicators) {
            for (const indicator of options.indicators) {
                if ('check' in indicator && 'name' in indicator) {
                    // instance
                    providers.push({
                        provide: HEALTH_INDICATORS,
                        useValue: indicator,
                        multi: true
                    });
                } else {
                    // type
                    providers.push({
                        provide: HEALTH_INDICATORS,
                        useClass: indicator as Type<HealthIndicator>,
                        multi: true
                    });
                }
            }
        }

        if (options.includeMemory !== false) {
            providers.push(MemoryHealthIndicator);
            providers.push({
                provide: HEALTH_INDICATORS,
                useClass: MemoryHealthIndicator,
                multi: true
            });
        }

        return {
            module: HealthModule,
            providers
        };
    }
}