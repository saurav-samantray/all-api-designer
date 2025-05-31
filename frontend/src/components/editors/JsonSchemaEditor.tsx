"use client";

import Form from "@rjsf/shadcn";
import validator from "@rjsf/validator-ajv8";
import { RJSFSchema, UiSchema, IChangeEvent, GenericObjectType } from "@rjsf/utils"; // Added GenericObjectType
import { forwardRef, Ref } from "react";
// We don't import RefField here directly, as it's intended to be specified via uiSchema by the parent

type FormRef = any;

interface JsonSchemaEditorProps {
  schema: RJSFSchema;
  formData?: any;
  uiSchema?: UiSchema;
  onChange?: (data: any) => void; // RJSF IChangeEvent.formData is passed by handleFormChange
  onSubmit?: (data: any) => void;  // RJSF IChangeEvent.formData is passed by handleFormSubmit
  onError?: (errors: any) => void;
  liveValidate?: boolean;
  showErrorList?: boolean;
  disabled?: boolean;
  className?: string;
  formRef?: Ref<FormRef>;
  formContext?: GenericObjectType; // Added formContext prop
  fields?: any; // Allow passing custom fields like RefField
}

const JsonSchemaEditor = forwardRef<FormRef, JsonSchemaEditorProps>(
  (
    {
      schema,
      formData,
      uiSchema,
      onChange,
      onSubmit,
      onError,
      liveValidate = false,
      showErrorList = true,
      disabled = false,
      className,
      formContext, // Destructure formContext
      fields,      // Destructure fields
    }: JsonSchemaEditorProps,
    ref
  ) => {
    const handleFormChange = (e: IChangeEvent<any>) => {
      if (onChange) {
        onChange(e.formData); // Pass only formData for simplicity to parent
      }
    };

    const handleFormSubmit = (e: IChangeEvent<any>) => {
      if (onSubmit) {
        onSubmit(e.formData);
      }
    };

    const handleFormError = (errors: any) => {
        if (onError) {
            onError(errors);
        }
        console.error("RJSF JsonSchemaEditor Form Errors:", errors);
    }

    if (!schema) {
      return <div className="p-4 text-red-500">Error: Schema is not provided to JsonSchemaEditor.</div>;
    }

    return (
      <div className={className || "rjsf-json-schema-editor"}>
        <Form
          ref={ref}
          schema={schema}
          formData={formData}
          uiSchema={uiSchema}
          fields={fields} // Pass fields (which could include RefField mapped to a name)
          validator={validator}
          onChange={handleFormChange}
          onSubmit={handleFormSubmit}
          onError={handleFormError}
          liveValidate={liveValidate}
          showErrorList={showErrorList}
          disabled={disabled}
          formContext={formContext} // Pass formContext down
        >
         <div></div> {/* RJSF requires a child to prevent default button rendering */}
        </Form>
      </div>
    );
  }
);

JsonSchemaEditor.displayName = "JsonSchemaEditor";
export default JsonSchemaEditor;
