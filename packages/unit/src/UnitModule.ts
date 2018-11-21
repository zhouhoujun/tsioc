import { DIModule } from '@ts-ioc/bootstrap';
import { AopModule } from '@ts-ioc/aop';
import { LogModule } from '@ts-ioc/logs';
import { UnitSetup } from './UnitSetup';
import * as aops from './aop';
import * as runners from './runner';

@DIModule({
    imports: [
        AopModule,
        LogModule,
        aops,
        UnitSetup,
        runners
    ],
    exports: [
        // AopModule,
        // LogModule,
        runners
    ]
})
export class UnitModule {

}
