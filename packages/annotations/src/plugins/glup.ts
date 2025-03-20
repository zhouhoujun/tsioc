import * as through from 'through2';
import { iocAnnotations } from '../classAnnotations';



/**
 * attach class Annotations before typescript ts compile.
 *
 * @export
 * @param {string} [annotationField='classAnnations']
 * @returns
 */
export function classAnnotations() {
    return through.obj(function (file, encoding, callback) {
        if (file.isNull()) {
            return callback(null, file)
        }

        if (file.isStream()) {
            return callback('doesn\'t support Streams')
        }

        let contents: string = file.contents.toString('utf8');
        contents = iocAnnotations(contents);
        file.contents = Buffer.from(contents);
        callback(null, file)
    })
}