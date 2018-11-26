import { DIModule } from '@ts-ioc/bootstrap';
import * as core from './core';
import * as shells from './shells';

@DIModule({
    imports: [
        core,
        shells
    ],
    exports: [
        core,
        shells
    ]
})
export class NodejsModule {
}
