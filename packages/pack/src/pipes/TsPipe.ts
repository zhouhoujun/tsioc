import { IPipeTransform, Pipe } from '@tsdi/components';


@Pipe('tsjs')
export class TypeScriptJsPipe implements IPipeTransform  {
    transform(value: any): any {
        return value.js
    }
}

@Pipe('dts')
export class TypeScriptDtsPipe implements IPipeTransform {
    transform(value: any): any {
        return value.dts;
    }
}


// import { IPipeTransform, Pipe } from '@tsdi/components';
// import { ITransform } from '../ITransform';
// import { IActivityContext } from '@tsdi/activities';

// const filter = require('gulp-filter');

// const jsFilter = filter('**/*.js', { restore: true });
// const dtsFtr = filter('**/*.d.ts');

// const key = '__js_restore_filter';
// @Pipe('tsjs')
// export class TypeScriptJsPipe implements IPipeTransform {
//     transform(value: ITransform, env: { ctx: IActivityContext }): ITransform {
//         const fstm = value.pipe(jsFilter);
//         env.ctx.runScope?.setValue(key, jsFilter.restore);
//         return fstm;
//     }
// }

// @Pipe('dts')
// export class TypeScriptDtsPipe implements IPipeTransform {
//     transform(value: ITransform, env: { ctx: IActivityContext }): ITransform {
//         if (env.ctx.runScope?.hasValue(key)) {
//             value = value.pipe(env.ctx.runScope?.getValue<ITransform>(key));
//         }
//         return value.pipe(dtsFtr);
//     }
// }
