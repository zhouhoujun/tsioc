import { Task, TemplateOption } from '@tsdi/activities';
import { NodeActivityContext } from '../core';
const inplace = require('json-in-place');
import * as through from 'through2';
import { Input, Binding } from '@tsdi/boot';
import { isFunction } from '@tsdi/ioc';
import { TransformActivity } from './TransformActivity';


export type JsonEdit = (json: any, ctx?: NodeActivityContext) => Map<string, any>;

export interface JsonEditActivityOption extends TemplateOption {
    /**
     * edite fields.
     *
     * @type {Binding<JsonEdit>}
     * @memberof SourceActivityOption
     */
    fields: Binding<JsonEdit>;
}

@Task('jsonEdit')
export class JsonEditActivity extends TransformActivity {

    @Input()
    fields: JsonEdit;

    protected async execute(ctx: NodeActivityContext): Promise<void> {
        let fields = this.fields;
        if (!isFunction(fields)) {
            return;
        }
        this.result.value = through.obj(function (file, encoding, callback) {
            if (file.isNull()) {
                return callback(null, file);
            }

            if (file.isStream()) {
                return callback('doesn\'t support Streams');
            }

            let contents: string = file.contents.toString('utf8');
            let json = JSON.parse(contents);
            let replaced = inplace(contents);
            fields(json, ctx).forEach((val, key) => {
                replaced.set(key, val);
            });
            contents = replaced.toString();
            file.contents = new Buffer(contents);
            this.push(file);
            callback();
        });
    }
}
