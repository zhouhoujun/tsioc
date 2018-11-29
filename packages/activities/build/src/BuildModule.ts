import { DIModule } from '@ts-ioc/bootstrap';
import * as buildcore from './core';

@DIModule({
    imports: [
        buildcore
    ],
    exports: [
        buildcore
    ]
})
export class BuildModule {
}
