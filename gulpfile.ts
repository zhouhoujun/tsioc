import * as gulp from 'gulp';
import { ITaskOption, Development } from 'development-tool';
// import 'development-tool-node';

Development.create(gulp, __dirname, {
    tasks: <ITaskOption>{
        src: 'src',
        dist: 'lib',
        buildDist: 'build',
        testSrc: 'test/**/*.spec.ts',
        loader: 'development-tool-node',
        asserts: {
            ts: {
                uglify: true,
                loader: 'development-assert-ts'
            }
        }
    }
});
