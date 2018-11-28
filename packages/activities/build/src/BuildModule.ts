import { DIModule } from '@ts-ioc/bootstrap';
import * as buildcore from './core';
import { TransformModule } from './transform';
import { ShellModule } from './shells'

@DIModule({
    imports: [
        buildcore,
        TransformModule,
        ShellModule
    ],
    exports: [
        buildcore,
        TransformModule,
        ShellModule
    ]
})
export class BuildModule {
}
