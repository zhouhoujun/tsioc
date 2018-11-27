import { DIModule } from '@ts-ioc/bootstrap';
import * as core from './core';
import { NodejsModule } from '@taskfr/node';
import { TransformModule } from './transform';

@DIModule({
    imports: [
        NodejsModule,
        core,
        TransformModule
    ],
    exports: [
        NodejsModule,
        core,
        TransformModule
    ]
})
export class BuildModule {
}
