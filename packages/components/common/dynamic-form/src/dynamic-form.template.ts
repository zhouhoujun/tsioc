/** Renderer-neutral dynamic-form markup. Kept separate from the state/editing logic. */
export const DYNAMIC_FORM_TEMPLATE = `
    <div [class]="classes.form">
        <div [class]="classes.schemaError" v-if="schemaError">{{schemaError}}</div>
        <div v-else>
            <div [class]="classes.noFields" v-if="!visibleGroups.length">{{emptyLabel}}</div>
            <div [class]="classes.group" v-for="group in visibleGroups">
                <div [class]="classes.groupTitle" v-if="group.label">{{group.label}}</div>
                <div [class]="classes.groupFields">
                <div [class]="fieldClass(field)" v-for="field in group.fields" data-field-key="{{field.key}}">
                    <div [class]="classes.labelRow" v-if="field.type !== 'hidden'">
                        <label [class]="classes.label">{{fieldLabel(field)}}<span [class]="classes.required" v-if="isRequired(field)">*</span></label>
                        <span class="df-field-actions">
                        <button [class]="classes.jsonMode" v-if="field.type === 'json'" type="button"
                            @click="toggleJsonMode(field)">{{isJsonRaw(field) ? (schema.jsonFieldsLabel || 'Fields') : (schema.jsonTextLabel || 'JSON')}}</button>
                        <button [class]="classes.reset" v-if="canReset(field)" type="button"
                            title="{{resetFieldLabel}}" aria-label="{{resetFieldLabel}}"
                            @click="resetField(field)">↺</button>
                        </span>
                    </div>
                    <div [class]="classes.typedRow" v-if="isTypedInput(field)">
                        <select [class]="classes.typedType" data-value-type="true"
                            [disabled]="field.disabled || field.readonly"
                            @change="changeTypedType(field, $event)">
                            <option value="literal" [selected]="typedType(field) === 'literal'">Literal</option>
                            <option value="msg" [selected]="typedType(field) === 'msg'">msg</option>
                            <option value="flow" [selected]="typedType(field) === 'flow'">flow</option>
                            <option value="global" [selected]="typedType(field) === 'global'">global</option>
                            <option value="env" [selected]="typedType(field) === 'env'">env</option>
                        </select>
                    </div>
                    <div [class]="inputWrapClass(field)" v-if="isTextInput(field) || isNumberInput(field)">
                        <input v-if="isTextInput(field)" [class]="inputClass(field)" type="{{htmlType(field)}}"
                            [value]="fieldValue(field)" [placeholder]="field.placeholder || ''"
                            [readOnly]="field.readonly" [disabled]="field.disabled"
                            [min]="field.min" [max]="field.max" [step]="field.step"
                            aria-required="{{isRequired(field) ? 'true' : 'false'}}"
                            aria-invalid="{{errorFor(field) ? 'true' : 'false'}}"
                            @input="changeText(field, $event)" @blur="blurField(field)" />
                        <input v-if="isNumberInput(field)" [class]="inputClass(field)" type="{{htmlType(field)}}"
                            [value]="fieldValue(field)" [placeholder]="field.placeholder || ''"
                            [readOnly]="field.readonly" [disabled]="field.disabled"
                            [min]="field.min" [max]="field.max" [step]="field.step || 1"
                            aria-required="{{isRequired(field) ? 'true' : 'false'}}"
                            aria-invalid="{{errorFor(field) ? 'true' : 'false'}}"
                            @input="changeText(field, $event)" @blur="blurField(field)" />
                        <span [class]="classes.inputUnit" v-if="field.unit">{{field.unit}}</span>
                    </div>
                    <label v-if="isBooleanInput(field)" [class]="classes.checkboxRow">
                        <input type="checkbox" [checked]="fieldChecked(field)"
                            [disabled]="field.disabled || field.readonly"
                            @change="changeBoolean(field, $event)" />
                        <span v-if="field.description">{{field.description}}</span>
                    </label>
                    <select v-if="isSelectInput(field)" [class]="selectClass(field)"
                        [value]="fieldValue(field)"
                        [disabled]="field.disabled || field.readonly"
                        aria-required="{{isRequired(field) ? 'true' : 'false'}}"
                        aria-invalid="{{errorFor(field) ? 'true' : 'false'}}"
                        @change="changeSelect(field, $event)">
                        <option v-for="option in field.options" [value]="option.value"
                            [selected]="sameOptionValue(option.value, fieldValue(field))"
                            [disabled]="option.disabled">{{option.label}}</option>
                    </select>
                    <div v-if="isRadioInput(field)" [class]="classes.options" role="radiogroup"
                        aria-required="{{isRequired(field) ? 'true' : 'false'}}">
                        <label v-for="option in field.options" data-option-value="{{option.value}}"
                            [class]="optionClass(field, option)">
                            <input type="radio" name="{{formId}}-{{field.key}}"
                                [value]="option.value"
                                [checked]="sameOptionValue(option.value, fieldValue(field))"
                                [disabled]="field.disabled || field.readonly || option.disabled"
                                @change="chooseOption(field, option.value)" />
                            <span>{{option.label}}</span>
                        </label>
                    </div>
                    <textarea v-if="isJsonTextArea(field)" [class]="textareaClass(field)"
                        data-dynamic-code="json"
                        [value]="jsonTextValue(field)" [rows]="field.rows || 4"
                        [placeholder]="field.placeholder || ''" [readOnly]="field.readonly" [disabled]="field.disabled"
                        aria-required="{{isRequired(field) ? 'true' : 'false'}}"
                        aria-invalid="{{errorFor(field) ? 'true' : 'false'}}"
                        @input="changeText(field, $event)" @blur="blurField(field)"></textarea>
                    <div v-if="isJsonObjectEditor(field)" [class]="classes.keyValue">
                        <div [class]="classes.keyValueRow" v-for="(entry, index) in jsonEntries(field)">
                            <input [class]="classes.keyValueKey" type="text" [value]="entry.key"
                                [placeholder]="field.keyPlaceholder || 'Key'"
                                @input="changeJsonEntryKey(field, index, $event)" />
                            <input [class]="classes.keyValueValue" type="text" [value]="entry.display"
                                [placeholder]="field.valuePlaceholder || 'Value'"
                                @input="changeJsonEntryValue(field, index, $event)" />
                            <button [class]="classes.listRemove" type="button" @click="removeJsonEntry(field, index)">{{field.removeLabel || '✕'}}</button>
                        </div>
                        <button [class]="classes.listAdd" type="button" @click="addJsonEntry(field)">{{field.addLabel || '+ Add'}}</button>
                    </div>
                    <textarea v-if="isTextareaInput(field)" [class]="textareaClass(field)"
                        [value]="fieldValue(field)" [rows]="field.rows || (field.type === 'json' ? 4 : 3)"
                        [placeholder]="field.placeholder || ''" [readOnly]="field.readonly" [disabled]="field.disabled"
                        aria-required="{{isRequired(field) ? 'true' : 'false'}}"
                        aria-invalid="{{errorFor(field) ? 'true' : 'false'}}"
                        @input="changeText(field, $event)" @blur="blurField(field)"></textarea>
                    <textarea v-if="isCodeInput(field)" [class]="codeClass(field)"
                        data-dynamic-code="{{field.language || 'javascript'}}"
                        data-code-value="{{encodeValue(field)}}"
                        data-code-suggestions="{{suggestionData(field)}}"
                        [value]="fieldValue(field)" [rows]="field.rows || 8"
                        [readOnly]="field.readonly" [disabled]="field.disabled"
                        aria-required="{{isRequired(field) ? 'true' : 'false'}}"
                        aria-invalid="{{errorFor(field) ? 'true' : 'false'}}"
                        @input="changeText(field, $event)" @blur="blurField(field)"></textarea>
                    <div v-if="isListInput(field)" [class]="classes.list">
                        <div [class]="classes.listRow" v-for="(item, index) in listItems(field)">
                            <div [class]="classes.listFields">
                                <div v-for="child in field.itemFields" v-if="isListItemVisible(child, item)">
                                    <div [class]="classes.listField" data-field-key="{{child.key}}">
                                        <label [class]="classes.label">{{fieldLabel(child)}}<span [class]="classes.required" v-if="isRequired(child)">*</span></label>
                                        <div [class]="classes.typedRow" v-if="isTypedInput(child)">
                                            <select [class]="classes.typedType" data-value-type="true"
                                                [disabled]="child.disabled || child.readonly"
                                                @change="changeListItemTypedType(field, listIndex(field, item), child, $event)">
                                                <option value="literal" [selected]="listItemTypedType(item, child) === 'literal'">Literal</option>
                                                <option value="msg" [selected]="listItemTypedType(item, child) === 'msg'">msg</option>
                                                <option value="flow" [selected]="listItemTypedType(item, child) === 'flow'">flow</option>
                                                <option value="global" [selected]="listItemTypedType(item, child) === 'global'">global</option>
                                                <option value="env" [selected]="listItemTypedType(item, child) === 'env'">env</option>
                                            </select>
                                        </div>
                                        <input v-if="isTextInput(child) || isNumberInput(child)" [class]="inputClass(child)"
                                            type="{{htmlType(child)}}"
                                            [value]="listItemValue(item, child)"
                                            [placeholder]="child.placeholder || ''"
                                            [min]="child.min" [max]="child.max" [step]="child.step"
                                            @input="changeListItem(field, listIndex(field, item), child, $event)" />
                                        <textarea v-if="isTextareaInput(child) || isJsonInput(child)" [class]="textareaClass(child)"
                                            [value]="listItemValue(item, child)"
                                            [rows]="child.rows || (isJsonInput(child) ? 3 : 2)"
                                            [placeholder]="child.placeholder || ''"
                                            @input="changeListItem(field, listIndex(field, item), child, $event)"></textarea>
                                        <label v-if="isBooleanInput(child)" [class]="classes.checkboxRow">
                                            <input type="checkbox" [checked]="listItemChecked(item, child)"
                                                @change="changeListItem(field, listIndex(field, item), child, $event)" />
                                        </label>
                                        <select v-if="isSelectInput(child)" [class]="selectClass(child)"
                                            [value]="listItemValue(item, child)"
                                            [disabled]="child.disabled || child.readonly"
                                            @change="changeListItemSelect(field, listIndex(field, item), child, $event)">
                                            <option v-for="option in child.options" [value]="option.value"
                                                [selected]="sameOptionValue(option.value, listItemValue(item, child))"
                                                [disabled]="option.disabled">{{option.label}}</option>
                                        </select>
                                        <div v-if="isRadioInput(child)" [class]="classes.options">
                                            <label v-for="option in child.options" data-option-value="{{option.value}}"
                                                [class]="optionClass(child, listItemValue(item, child))">
                                                <input type="radio" name="{{formId}}-{{field.key}}-{{index}}-{{child.key}}"
                                                    [value]="option.value"
                                                    [checked]="sameOptionValue(option.value, listItemValue(item, child))"
                                                    @change="changeListItemOption(field, listIndex(field, item), child, option.value)" />
                                                <span>{{option.label}}</span>
                                            </label>
                                        </div>
                                        <div [class]="classes.error" v-if="listItemError(child, item)">{{listItemError(child, item)}}</div>
                                    </div>
                                </div>
                            </div>
                            <button [class]="classes.listRemove" type="button" @click="removeListItem(field, listIndex(field, item))">{{field.removeLabel || '✕'}}</button>
                        </div>
                        <button [class]="classes.listAdd" type="button" @click="addListItem(field)">{{field.addLabel || '+ Add'}}</button>
                    </div>
                    <div v-if="isKeyValueInput(field)" [class]="classes.keyValue">
                        <div [class]="classes.keyValueRow" v-for="(entry, index) in keyValueEntries(field)">
                            <input [class]="classes.keyValueKey" type="text"
                                [value]="entry.key"
                                [placeholder]="field.keyPlaceholder || 'Key'"
                                @input="changeKeyValueKey(field, index, $event)" />
                            <label v-if="keyValueValueType(field) === 'boolean'" [class]="classes.checkboxRow">
                                <input type="checkbox" [checked]="entry.value === true"
                                    @change="changeKeyValueValue(field, index, $event)" />
                            </label>
                            <input v-else [class]="classes.keyValueValue"
                                type="{{keyValueValueType(field) === 'number' ? 'number' : 'text'}}"
                                [value]="entry.value"
                                [placeholder]="field.valuePlaceholder || 'Value'"
                                @input="changeKeyValueValue(field, index, $event)" />
                            <button [class]="classes.listRemove" type="button" @click="removeKeyValue(field, index)">{{field.removeLabel || '✕'}}</button>
                        </div>
                        <button [class]="classes.listAdd" type="button" @click="addKeyValue(field)">{{field.addLabel || '+ Add'}}</button>
                    </div>
                    <input v-if="field.type === 'hidden'" type="hidden" [value]="fieldValue(field)" />
                    <div [class]="classes.error" v-if="errorFor(field)">{{errorFor(field)}}</div>
                    <div [class]="classes.hint" v-if="field.description && !isBooleanInput(field)">{{field.description}}</div>
                </div>
                </div>
            </div>
            <div [class]="classes.actions" v-if="showActions">
                <button type="button" [class]="classes.btn" @click="resetForm()">{{resetText}}</button>
                <button type="button" [class]="classes.btnPrimary" @click="submit()">{{submitText}}</button>
            </div>
        </div>
    </div>`;
