import { DIModule } from '@ts-ioc/bootstrap';
import { UnitSetup } from './UnitSetup';
import * as runners from './runner';

@DIModule({
    imports: [
        UnitSetup,
        runners
    ],
    exports: [
        runners
    ]
})
export class UnitModule {

}
