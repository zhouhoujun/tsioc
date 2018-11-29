import { DIModule } from '@ts-ioc/bootstrap';
import { BuildModule, TransformModule, ShellModule } from '@taskfr/build';
import { PackSetup } from './PackSetup';
import * as cores from './core';
import * as builds from './build';
import * as serves from './serves';
import * as generate from './generate';

@DIModule({
    imports: [
        BuildModule,
        ShellModule,
        TransformModule,
        PackSetup,
        cores,
        builds,
        generate,
        serves
    ],
    exports: [
        BuildModule,
        ShellModule,
        TransformModule,
        cores,
        builds,
        generate,
        serves
    ]
})
export class PackModule {

}
