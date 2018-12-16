import { Pack } from '../../decorators';
import { PackActivity } from '../../core';


@Pack({
    name: 'ng-lib',
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
export class NgLibBuildActivity extends PackActivity {

}
