import { Application } from '@tsdi/core';
import { IBootApplication } from './IBootApplication';


/**
 * boot application.
 *
 * @export
 * @class BootApplication
 */
export class BootApplication extends Application implements IBootApplication {

    protected override getDeps() {
        return super.getDeps();
    }
    
}


