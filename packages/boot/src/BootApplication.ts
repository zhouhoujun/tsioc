import { Application } from '@tsdi/core';
import { BootModule } from './BootModule';
import { IBootApplication } from './IBootApplication';


/**
 * boot application.
 *
 * @export
 * @class BootApplication
 */
export class BootApplication extends Application implements IBootApplication {

    protected override getDeps() {
        return [...super.getDeps(), BootModule];
    }
    
}


