"use client";

import Form from "@rjsf/shadcn";
import validator from "@rjsf/validator-ajv8";
import { RJSFSchema, UiSchema, IChangeEvent, FieldProps, GenericObjectType } from "@rjsf/utils"; // Added FieldProps, GenericObjectType
import { useState, useEffect, forwardRef, Ref } from "react";
import RefField from './custom/RefField'; // Import RefField

// Define a simplified schema for editing parts of an OpenAPI document
const openApiEditablePartsSchema: RJSFSchema = {
  type: "object",
  title: "Edit OpenAPI Specification",
  properties: {
    info: {
      type: "object",
      title: "API Information",
      description: "Edit the main information about the API.",
      properties: {
        title: { type: "string", title: "Title" },
        version: { type: "string", title: "Version" },
        description: { type: "string", title: "Description" },
        "$ref_example": { type: "string", title: "Example Reference (Info)", description: "Test $ref field within Info" }
      },
      required: ["title", "version"],
    },
    // "$top_level_ref_example": { type: "string", title: "Top Level Example Reference", description: "Test $ref at root" }
  },
};

// Default UiSchema
const defaultOpenApiUiSchema: UiSchema = {
  info: {
    description: {
      "ui:widget": "textarea",
      "ui:options": { rows: 3 },
    },
  },
};

type FormRef = any;

interface OpenApiEditorProps {
  specData: Record<string, any>;
  onChange: (updatedSpecData: Record<string, any>) => void;
  disabled?: boolean;
  className?: string;
  formRef?: Ref<FormRef>;
  formContext: GenericObjectType; // Added formContext
}

const OpenApiEditor = forwardRef<FormRef, OpenApiEditorProps>(
  (
    {
      specData,
      onChange,
      disabled = false,
      className,
      formContext // Destructure formContext
    }: OpenApiEditorProps,
    ref
  ) => {
    const [formData, setFormData] = useState<Record<string, any>>({});

    useEffect(() => {
      const initialFormData: Record<string, any> = {};
      if (specData?.info) {
        initialFormData.info = { ...specData.info };
      }
      // if (specData?.["$top_level_ref_example"]) {
      //  initialFormData["$top_level_ref_example"] = specData["$top_level_ref_example"];
      // }
      setFormData(initialFormData);
    }, [specData]);

    const handleFormChange = (e: IChangeEvent<any>) => {
      const changedData = e.formData;
      setFormData(changedData);

      const updatedFullSpecData = JSON.parse(JSON.stringify(specData || {}));

      if (changedData.info !== undefined) {
         updatedFullSpecData.info = { ...updatedFullSpecData.info, ...changedData.info };
      }
      // if (changedData["$top_level_ref_example"] !== undefined) {
      //   updatedFullSpecData["$top_level_ref_example"] = changedData["$top_level_ref_example"];
      // }
      onChange(updatedFullSpecData);
    };

    if (!specData) {
        return <div className="p-4 text-gray-500">Loading OpenAPI data...</div>;
    }

    // Dynamically construct uiSchema to include RefField for $ref_example
    const effectiveUiSchema: UiSchema = {
        ...defaultOpenApiUiSchema,
        info: {
            ...(defaultOpenApiUiSchema.info as object),
            "$ref_example": { "ui:field": RefField }
        },
        // "$top_level_ref_example": { "ui:field": RefField }
    };

    return (
      <div className={className || "rjsf-openapi-editor"}>
        <Form
          ref={ref}
          schema={openApiEditablePartsSchema}
          formData={formData}
          uiSchema={effectiveUiSchema}
          validator={validator}
          onChange={handleFormChange}
          liveValidate={false}
          showErrorList={true}
          disabled={disabled}
          formContext={formContext} // Pass formContext down
        >
         <div></div>
        </Form>
      </div>
    );
  }
);

OpenApiEditor.displayName = "OpenApiEditor";
export default OpenApiEditor;
