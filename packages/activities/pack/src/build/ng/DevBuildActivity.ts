import { PackActivity } from '../../core';
import { Pack } from '../../decorators';

/**
 * dev build activity.
 *
 * @export
 * @class DevBuildActivity
 * @extends {BuildActivity}
 */
@Pack({
    name: 'ng-dev',
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
export class NgDevBuildActivity extends PackActivity {

}
