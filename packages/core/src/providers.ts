import { ProviderType, Injector } from '@tsdi/ioc';
import { ApplicationFactory } from './context';
import { ApplicationRunners } from './runners';
import { RandomUuidGenerator, UuidGenerator } from './uuid';
import { ApplicationEventMulticaster } from './events';
import { DefaultApplicationRunners } from './impl/runners';
import { DefaultApplicationFactory, DefaultEventMulticaster } from './impl/context';



export const DEFAULTA_PROVIDERS: ProviderType[] = [
    { provide: ApplicationRunners, useClass: DefaultApplicationRunners, static: true },
    {
        provide: ApplicationEventMulticaster,
        useFactory: (injector: Injector) => {
            return new DefaultEventMulticaster(injector)
        },
        static: true,
        deps: [Injector]
    },
    { provide: ApplicationFactory, useClass: DefaultApplicationFactory, static: true },
    { provide: UuidGenerator, useClass: RandomUuidGenerator, asDefault: true, static: true }
]
