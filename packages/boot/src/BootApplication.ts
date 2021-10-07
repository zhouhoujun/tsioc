import { Application } from '@tsdi/core';
import { BootModule } from './BootModule';


/**
 * boot application.
 *
 * @export
 * @class BootApplication
 */
export class BootApplication extends Application {

    protected override getDeps() {
        return [...super.getDeps(), BootModule];
    }

    protected initRoot() {
        super.initRoot();
        this.root.setValue(BootApplication, this);
    }
    
}


