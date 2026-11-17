import { Module } from '@tsdi/ioc';
import { ThemeService } from './theme';

/**
 * Shared renderer-neutral services (currently the theme store).
 *
 * Widgets live in their own subpath entries (`@tsdi/components/common/panel`
 * and friends); this module only provides services used across surfaces.
 */
@Module({
    providers: [ThemeService]
})
export class BaseComponentsModule {}
