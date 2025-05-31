"use client";

import Form from "@rjsf/shadcn";
import validator from "@rjsf/validator-ajv8";
import { RJSFSchema, UiSchema, IChangeEvent, FieldProps, GenericObjectType } from "@rjsf/utils"; // Added FieldProps, GenericObjectType
import { useState, useEffect, forwardRef, Ref } from "react";
import RefField from './custom/RefField'; // Import RefField

// Define a simplified schema for editing parts of an AsyncAPI document
const asyncApiEditablePartsSchema: RJSFSchema = {
  type: "object",
  title: "Edit AsyncAPI Specification",
  properties: {
    info: {
      type: "object",
      title: "API Information",
      description: "Edit the main information about the API.",
      properties: {
        title: { type: "string", title: "Title" },
        version: { type: "string", title: "Version" },
        description: { type: "string", title: "Description" },
        "$ref_example": { type: "string", title: "Example Reference (Info)", description: "Test $ref field within Info" } // Illustrative
      },
      required: ["title", "version"],
    },
    // TODO: Add more editable sections like 'channels', 'components' later
  },
};

// Define a UiSchema for better presentation (e.g., textarea for description)
const defaultAsyncApiUiSchema: UiSchema = { // Renamed to default for clarity before merging
  info: {
    description: {
      "ui:widget": "textarea",
      "ui:options": {
        rows: 3,
      },
    },
  },
};

type FormRef = any;

interface AsyncApiEditorProps {
  specData: Record<string, any>;
  onChange: (updatedSpecData: Record<string, any>) => void;
  disabled?: boolean;
  className?: string;
  formRef?: Ref<FormRef>;
  formContext: GenericObjectType; // Added formContext
}

const AsyncApiEditor = forwardRef<FormRef, AsyncApiEditorProps>(
  (
    {
      specData,
      onChange,
      disabled = false,
      className,
      formContext // Destructure formContext
    }: AsyncApiEditorProps,
    ref
  ) => {
    const [formData, setFormData] = useState<Record<string, any>>({});

    useEffect(() => {
      const initialFormData: Record<string, any> = {};
      if (specData?.info) {
        initialFormData.info = { ...specData.info };
      }
      setFormData(initialFormData);
    }, [specData]);

    const handleFormChange = (e: IChangeEvent<any>) => {
      const changedData = e.formData;
      setFormData(changedData);

      const updatedFullSpecData = JSON.parse(JSON.stringify(specData || {}));

      if (changedData.info !== undefined) {
         updatedFullSpecData.info = { ...updatedFullSpecData.info, ...changedData.info };
      }
      onChange(updatedFullSpecData);
    };

    if (!specData) {
        return <div className="p-4 text-gray-500">Loading AsyncAPI data...</div>;
    }

    const effectiveUiSchema: UiSchema = {
        ...defaultAsyncApiUiSchema, // Start with default
        info: {
            ...(defaultAsyncApiUiSchema.info as object), // Spread existing info uiSchema
            "$ref_example": { "ui:field": RefField } // Assign RefField to the example field
        },
    };

    return (
      <div className={className || "rjsf-asyncapi-editor"}>
        <Form
          ref={ref}
          schema={asyncApiEditablePartsSchema}
          formData={formData}
          uiSchema={effectiveUiSchema} // Use the schema that maps RefField
          validator={validator}
          onChange={handleFormChange}
          liveValidate={false}
          showErrorList={true}
          disabled={disabled}
          formContext={formContext} // Pass formContext down
        >
         <div></div> {/* RJSF requires a child to prevent default button rendering */}
        </Form>
      </div>
    );
  }
);

AsyncApiEditor.displayName = "AsyncApiEditor";
export default AsyncApiEditor;
