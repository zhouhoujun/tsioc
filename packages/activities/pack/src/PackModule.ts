import { DIModule } from '@ts-ioc/bootstrap';
import { NodejsModule } from '@taskfr/node';
import { BuildModule } from '@taskfr/build';
import { PackSetup } from './PackSetup';
import * as cores from './core';
import * as builds from './build';
import * as serves from './serves';
import * as generate from './generate';

@DIModule({
    imports: [
        NodejsModule,
        BuildModule,
        PackSetup,
        cores,
        builds,
        generate,
        serves
    ],
    exports: [
        NodejsModule,
        BuildModule,
        cores,
        builds,
        generate,
        serves
    ]
})
export class PackModule {

}
