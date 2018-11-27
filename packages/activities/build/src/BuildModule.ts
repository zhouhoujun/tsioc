import { DIModule } from '@ts-ioc/bootstrap';
import * as core from './core';
import { TransformModule } from './transform';
import { ShellModule } from './shells'

@DIModule({
    imports: [
        core,
        TransformModule,
        ShellModule
    ],
    exports: [
        core,
        TransformModule,
        ShellModule
    ]
})
export class BuildModule {
}
