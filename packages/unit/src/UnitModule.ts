import { DIModule } from '@ts-ioc/bootstrap';
import { AopModule } from '@ts-ioc/aop';
import { LogModule } from '@ts-ioc/logs';
import { UnitSetup } from './UnitSetup';
import { UnitTestConfigureRegister} from './UnitTestConfigureRegister';
import * as aops from './aop';
import * as asserts  from './assert';
import * as runners from './runner';
import * as reports from './reports';


@DIModule({
    imports: [
        AopModule,
        LogModule,
        UnitTestConfigureRegister,
        aops,
        UnitSetup,
        runners,
        reports,
        asserts
    ],
    exports: [
        UnitTestConfigureRegister,
        runners,
        reports,
        asserts
    ]
})
export class UnitModule {

}
