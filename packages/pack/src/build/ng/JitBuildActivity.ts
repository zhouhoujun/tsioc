import { Pack } from '../../decorators';
import { PackActivity } from '../../core';


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
export class NgJitBuildActivity  extends PackActivity {

}
