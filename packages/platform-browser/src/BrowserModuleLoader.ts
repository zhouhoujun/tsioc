import { ModuleLoader, DefaultModuleLoader } from '@tsdi/ioc';

declare let System: any;
declare let window: any;
export class BrowserModuleLoader extends DefaultModuleLoader implements ModuleLoader {

    protected override createLoader() {
        if (typeof System !== 'undefined') {
            return (modulepath: string) => {
                return System.import(modulepath);
            }
        } else {
            if (!window.require) {
                throw Error('has not module loader');
            }
            return (modulepath: string) => {
                return new Promise((resolve, reject) => {
                    window.require([modulepath], (mud) => {
                        resolve(mud);
                    }, err => {
                        reject(err);
                    })
                });
            }
        }
    }

}
