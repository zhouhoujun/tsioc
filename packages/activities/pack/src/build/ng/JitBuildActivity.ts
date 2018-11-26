import { BuildActivity } from '@taskfr/build';
import { Pack } from '../../decorators';


@Pack({
    name: 'ng-jit',
    clean: 'dist',
    src: 'src',
    dist: 'dist',
    handles: [
        {
            test: '*.scss',
            compiler: 'scss'
        },
        {
            test: '*.ts',
            compiler: 'ngc'
        }
    ]
})
export class NgJitBuildActivity extends BuildActivity {

}
