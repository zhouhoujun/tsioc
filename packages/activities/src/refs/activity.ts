import { Abstract, Modules, ModuleWithProviders, ProviderType } from '@tsdi/ioc';


/**
 * activity option.
 *
 * @export
 * @interface ActivityOption
 * @extends {BootOption}
 */
@Abstract()
export abstract class ActivityOption {
    /**
     * name.
     */
    name?: string;
    /**
    * imports dependens modules
    *
    * @type {Modules[]}
    */
    imports?: (Modules | ModuleWithProviders)[];
    /**
     * activity declarations 
     */
    declarations?: Modules[];
    /**
     * providers for the module
     */
    providers?: ProviderType[];
    /**
     * activities component template scope.
     *
     * @type {ActivityTemplate}
     * @memberof ActivityConfigure
     */
    template?: string | any[];

    /**
     * bootstrap.
     *
     * @type {Type<T>}
     */
    bootstrap?: Modules;

}
