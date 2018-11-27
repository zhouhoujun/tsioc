import { DIModule } from '@ts-ioc/bootstrap';
import * as bundle from './bundle';
import * as compiles from './compile';
import * as styles from './styles';
import { ShellActivity } from './ShellActivity';
import { ExecFileActivity } from './ExecFileActivity';

@DIModule({
    imports: [
        ShellActivity,
        ExecFileActivity,
        compiles,
        bundle,
        styles
    ],
    exports: [
        ShellActivity,
        ExecFileActivity,
        compiles,
        bundle,
        styles
    ]
})
export class ShellModule {

}
