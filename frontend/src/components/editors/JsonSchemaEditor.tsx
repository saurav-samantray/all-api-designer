"use client";

import Form from "@rjsf/shadcn"; // Using the Shadcn theme
import validator from "@rjsf/validator-ajv8";
import { RJSFSchema, UiSchema, IChangeEvent } from "@rjsf/utils";
import { MutableRefObject, Ref, forwardRef } from "react";

// Helper to ensure the Form ref can be properly typed if needed, though not strictly necessary for basic use.
type FormRef = any; // RJSF doesn't export a specific Form ref type for themes easily.

interface JsonSchemaEditorProps {
  schema: RJSFSchema;
  formData?: any;
  uiSchema?: UiSchema;
  onChange?: (data: any) => void; // data is IChangeEvent<any>, but simplify for parent
  onSubmit?: (data: any) => void;  // data is IChangeEvent<any>
  onError?: (errors: any) => void;
  liveValidate?: boolean;
  showErrorList?: boolean;
  disabled?: boolean;
  className?: string;
  // Pass a ref to the Form if needed by parent for imperative actions (e.g. submit)
  formRef?: Ref<FormRef>;
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
      showErrorList = true, // Default to true for better UX
      disabled = false,
      className,
    }: JsonSchemaEditorProps,
    ref
  ) => {
    const handleFormChange = (e: IChangeEvent<any>) => {
      if (onChange) {
        onChange(e.formData);
      }
    };

    const handleFormSubmit = (e: IChangeEvent<any>) => {
      if (onSubmit) {
        onSubmit(e.formData); // Typically you'd want the full event or e.formData
      }
    };

    const handleFormError = (errors: any) => {
        if (onError) {
            onError(errors);
        }
        console.error("RJSF Form Errors:", errors);
    }

    if (!schema) {
      return <div className="p-4 text-red-500">Error: Schema is not provided to JsonSchemaEditor.</div>;
    }

    // The Shadcn theme might require specific setup or peer dependencies for styling.
    // For now, we assume it works out-of-the-box once installed.
    // If specific Shadcn components (like Button, Input) are used by the theme,
    // they might need to be available in the project.

    return (
      <div className={className || "rjsf-json-schema-editor"}>
        <Form
          ref={ref} // Pass the ref to the underlying Form component
          schema={schema}
          formData={formData}
          uiSchema={uiSchema}
          validator={validator}
          onChange={handleFormChange}
          onSubmit={handleFormSubmit} // If we want an internal submit button from RJSF
          onError={handleFormError}
          liveValidate={liveValidate}
          showErrorList={showErrorList}
          disabled={disabled}
          // RJSF's <Form> component does not render its own submit button by default.
          // To get a submit button, you either provide children (a submit button)
          // or some themes might render one if onSubmit is passed.
          // If we want the parent to control submission, we omit `children` and `onSubmit` handling here,
          // and parent calls submit on the formRef.
          // For now, let's allow onSubmit to be passed, which implies RJSF might show a button or parent handles it.
        >
        {/*
          If you want the form to have its own submit button controlled by RJSF:
          <button type="submit" className="hidden">Submit</button>
          (and style it or let theme provide it)
          Alternatively, the parent page will have a "Save" button that can trigger submission
          programmatically if a ref to the form is obtained.
          The current setup passes onSubmit, so if the theme or default behavior includes a button, it would trigger this.
          Often, for more control, one might omit `onSubmit` here and have the parent trigger submission.
          For this component, we'll assume the parent handles the actual "Save" action, and this onSubmit is optional for RJSF internal features.
        */}
        </Form>
      </div>
    );
  }
);

JsonSchemaEditor.displayName = "JsonSchemaEditor";
export default JsonSchemaEditor;
