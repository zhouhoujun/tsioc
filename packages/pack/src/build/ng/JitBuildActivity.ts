import { Pack } from '../../decorators/Pack';
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
            test: '*.less',
            compiler: 'less'
        },
        {
            test: '*.ts',
            compiler: 'ngc'
        }
    ]
})
export class NgJitBuildActivity  extends PackActivity {

}
