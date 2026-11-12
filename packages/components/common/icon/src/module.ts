import { Module } from '@tsdi/ioc';
import { IconDirective } from './icon.directive';

/**
 * Declares the shared {@link IconDirective}. Import this module wherever a
 * template renders `<icon name="...">`; the icon definitions themselves are
 * plain data and need no provider.
 */
@Module({
    declarations: [IconDirective],
    exports: [IconDirective]
})
export class IconModule { }
