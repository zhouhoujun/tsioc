import { Singleton } from '@ts-ioc/ioc';
import { DIModuleInjector } from './DIModuleInjector';


@Singleton
export class BootstrapInjector extends DIModuleInjector {
    getDecorator(): string {
        return '@Bootstrap';
    }
}
