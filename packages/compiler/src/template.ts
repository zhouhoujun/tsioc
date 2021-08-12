
import * as t from './ast';
import { LexerRange } from './util';



export function parseTemplate(template: string, templateUrl: string, options: ParseTemplateOptions = {}): ParsedTemplate {
   return;
}


/**
 * Options that can be used to modify how a template is parsed by `parseTemplate()`.
 */
export interface ParseTemplateOptions {
    /**
     * Include whitespace nodes in the parsed output.
     */
    preserveWhitespaces?: boolean;
    /**
     * Preserve original line endings instead of normalizing '\r\n' endings to '\n'.
     */
    preserveLineEndings?: boolean;
    /**
     * How to parse interpolation markers.
     */
    markers?: string[2];
    /**
     * The start and end point of the text to parse within the `source` string.
     * The entire `source` string is parsed if this is not provided.
     * */
    range?: LexerRange;
    /**
     * If this text is stored in a JavaScript string, then we have to deal with escape sequences.
     *
     * **Example 1:**
     *
     * ```
     * "abc\"def\nghi"
     * ```
     *
     * - The `\"` must be converted to `"`.
     * - The `\n` must be converted to a new line character in a token,
     *   but it should not increment the current line for source mapping.
     *
     * **Example 2:**
     *
     * ```
     * "abc\
     *  def"
     * ```
     *
     * The line continuation (`\` followed by a newline) should be removed from a token
     * but the new line should increment the current line for source mapping.
     */
    escapedString?: boolean;
    /**
     * An array of characters that should be considered as leading trivia.
     * Leading trivia are characters that are not important to the developer, and so should not be
     * included in source-map segments.  A common example is whitespace.
     */
    leadingTriviaChars?: string[];

    /**
     * Include HTML Comment nodes in a top-level comments array on the returned R3 AST.
     *
     * This option is required by tooling that needs to know the location of comment nodes within the
     * AST. A concrete example is @angular-eslint which requires this in order to enable
     * "eslint-disable" comments within HTML templates, which then allows users to turn off specific
     * rules on a case by case basis, instead of for their whole project within a configuration file.
     */
    collectCommentNodes?: boolean;
}


/**
 * Information about the template which was extracted during parsing.
 *
 * This contains the actual parsed template as well as any metadata collected during its parsing,
 * some of which might be useful for re-parsing the template with different options.
 */
 export interface ParsedTemplate {
  
    /**
     * The template AST, parsed from the template.
     */
    nodes: t.Node[];
  
    /**
     * Any styleUrls extracted from the metadata.
     */
    styleUrls: string[];
  
    /**
     * Any inline styles extracted from the metadata.
     */
    styles: string[];
  
    /**
     * Any ng-content selectors extracted from the template.
     */
    ngContentSelectors: string[];
  
    /**
     * Any R3 Comment Nodes extracted from the template when the `collectCommentNodes` parse template
     * option is enabled.
     */
    commentNodes?: t.Comment[];
  }
  