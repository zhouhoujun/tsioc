import { ModuleLoader, IModuleLoader } from '@tsdi/core';

export class BrowserModuleLoader extends ModuleLoader implements IModuleLoader {

    constructor() {
        super()
    }

    protected createLoader() {
        return (modulepath: string) => import(modulepath);
    }

}
