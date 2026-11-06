import { Module } from '@tsdi/ioc';
import { FormBuilder } from './builder';
import { FormControlDirective, FormGroupDirective } from './directives';

@Module({
    providers: [FormBuilder, FormControlDirective, FormGroupDirective],
    declarations: [FormControlDirective, FormGroupDirective],
    exports: [FormBuilder, FormControlDirective, FormGroupDirective]
})
export class FormsModule {}
