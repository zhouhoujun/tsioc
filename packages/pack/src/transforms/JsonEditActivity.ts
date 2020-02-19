import { isFunction, ObjectMap, lang } from '@tsdi/ioc';
import { Input, Binding } from '@tsdi/components';
import { Task, TemplateOption } from '@tsdi/activities';
import * as through from 'through2';
import { TransformActivity } from './TransformActivity';
import { NodeActivityContext } from '../NodeActivityContext';
import { ITransform } from '../ITransform';
const jeditor = require('gulp-json-editor');
const inplace = require('json-in-place');


export type JsonEdit = (json: any, bind?: NodeActivityContext, ctx?: NodeActivityContext) => ObjectMap;


export interface JsonEditActivityOption extends TemplateOption {
    /**
     * edite fields.
     *
     * @type {Binding<JsonEdit>}
     * @memberof SourceActivityOption
     */
    json: Binding<JsonEdit | ObjectMap>;
}

/**
 * edit json, will format new json string.
 *
 * @export
 * @class JsonEditActivity
 * @extends {TransformActivity}
 */
@Task('jsonEdit')
export class JsonEditActivity extends TransformActivity {

    @Input() json: JsonEdit | ObjectMap;

    async execute(ctx: NodeActivityContext): Promise<ITransform> {
        if (!this.json) {
            return;
        }
        if (isFunction(this.json)) {
            let jsonFunc = this.json;
            return jeditor((json) => jsonFunc(json));
        } else {
            return jeditor(this.json);
        }
    }

}

export type JsonReplace = (json: any, bind?: NodeActivityContext) => ObjectMap | Map<string, any>;

export interface JsonReplaceActivityOption extends TemplateOption {
    /**
     * edite fields.
     *
     * @type {Binding<JsonReplace>}
     * @memberof SourceActivityOption
     */
    fields: Binding<JsonReplace>;
}

/**
 * replace json value of key. no format.
 *
 * @export
 * @class JsonReplaceActivity
 * @extends {TransformActivity}
 */
@Task('jsonReplace')
export class JsonReplaceActivity extends TransformActivity {

    @Input() fields: JsonReplace;

    async execute(ctx: NodeActivityContext): Promise<ITransform> {
        let fields = this.fields;
        if (!isFunction(fields)) {
            return;
        }
        return through.obj(function (file, encoding, callback) {
            if (file.isNull()) {
                return callback(null, file);
            }

            if (file.isStream()) {
                return callback('doesn\'t support Streams');
            }

            let contents: string = file.contents.toString('utf8');
            let json = JSON.parse(contents);
            let replaced = inplace(contents);
            let changs = fields(json);
            if (changs instanceof Map) {
                changs.forEach((val, key) => {
                    replaced.set(key, val);
                })
            } else {
                lang.forIn(fields(json), (val, key) => {
                    replaced.set(key, val);
                });
            }
            contents = replaced.toString();
            file.contents = new Buffer(contents);
            this.push(file);
            callback();
        });
    }
}

