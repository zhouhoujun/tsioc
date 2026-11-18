import { Module } from '@tsdi/ioc';
import { TextFieldComponent } from './text-field';

@Module({
    declarations: [TextFieldComponent],
    exports: [TextFieldComponent]
})
export class TextFieldModule {}
