import { DIModule } from '@ts-ioc/bootstrap';
import { AopModule } from '@ts-ioc/aop';
import { LogModule } from '@ts-ioc/logs';
import { UnitSetup } from './UnitSetup';
import * as aops from './aop';
import * as runners from './runner';
import * as reports from './reports';

@DIModule({
    imports: [
        AopModule,
        LogModule,
        aops,
        UnitSetup,
        runners,
        reports
    ],
    exports: [
        runners,
        reports
    ]
})
export class UnitModule {

}
