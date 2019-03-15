import { Singleton } from '@ts-ioc/ioc';
import { DIModuleInjector } from '../modules';


@Singleton
export class BootstrapInjector extends DIModuleInjector {
    getDecorator(): string {
        return '@Bootstrap';
    }
}
