import { Module } from '@tsdi/ioc';
import { BytesPipe } from './bytes';
import { LowerCasePipe, UpperCasePipe } from './cases';
import { DateFormatPipe } from './date';
import { ParseBoolPipe } from './parses/bool.pipe';
import { DatePipe } from './parses/date.pipe';
import { ParseEnumPipe } from './parses/enum.pipe';
import { ParseFloatPipe } from './parses/float.pipe';
import { ParseIntPipe } from './parses/int.pipe';
import { JsonPipe } from './parses/json.pipe';
import { ParseNumberPipe } from './parses/number.pipe';
import { ParseStringPipe } from './parses/string.pipe';
import { SlicePipe } from './slice';
import { SortPipe } from './sort';
import { TimesPipe } from './times';

/*
 * Transform module.
 */
@Module({
    exports: [
        LowerCasePipe, UpperCasePipe, SlicePipe, SortPipe, DateFormatPipe,
        JsonPipe, DatePipe, TimesPipe, BytesPipe,
        ParseStringPipe, ParseBoolPipe, ParseEnumPipe,
        ParseFloatPipe, ParseIntPipe, ParseNumberPipe
    ]
})
export class TransformModule {

}
