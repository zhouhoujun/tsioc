import { Singleton } from '@tsdi/ioc';
import { DIModuleInjector } from '../core';


@Singleton
export class BootstrapInjector extends DIModuleInjector {
    getDecorator(): string {
        return '@Bootstrap';
    }
}
