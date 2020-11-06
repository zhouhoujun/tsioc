import { Injectable } from '@tsdi/ioc';
import { BootContext, ConfigureManager } from '@tsdi/boot';
import { UnitTestConfigure, UnitTestOptions } from './UnitTestConfigure';


@Injectable()
export class UnitTestContext extends BootContext<UnitTestOptions> {

    getConfiguration(): UnitTestConfigure {
        return super.getConfiguration();
    }

    getConfigureManager(): ConfigureManager<UnitTestConfigure> {
        return super.getConfigureManager();
    }
}
