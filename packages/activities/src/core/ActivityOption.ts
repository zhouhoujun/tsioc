import { ModuleWithProviders } from '@tsdi/ioc';
import { ActivityTemplate } from './ActivityMetadata';


/**
 * activity option.
 *
 * @export
 * @interface ActivityOption
 * @extends {BootOption}
 */
export interface ActivityOption<T = any> extends ModuleWithProviders<T> {
    /**
     * name.
     */
    name?: string;
    /**
     * activities component template scope.
     *
     * @type {ActivityTemplate}
     * @memberof ActivityConfigure
     */
    template?: ActivityTemplate;
}
