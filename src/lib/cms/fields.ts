import type { SiteModel } from './types'

export interface EditableField {
  pageSlug: string
  sectionId: string
  fieldName: string
}

export function getEditableFields(model: SiteModel): EditableField[] {
  const result: EditableField[] = []
  for (const page of model.pages) {
    for (const section of page.sections) {
      for (const [fieldName, field] of Object.entries(section.fields)) {
        if (field.editable) {
          result.push({ pageSlug: page.slug, sectionId: section.id, fieldName })
        }
      }
    }
  }
  return result
}

export function setFieldValue(
  model: SiteModel,
  pageSlug: string,
  sectionId: string,
  fieldName: string,
  value: unknown,
): SiteModel {
  return {
    ...model,
    pages: model.pages.map(page =>
      page.slug !== pageSlug
        ? page
        : {
            ...page,
            sections: page.sections.map(section =>
              section.id !== sectionId
                ? section
                : {
                    ...section,
                    fields: {
                      ...section.fields,
                      [fieldName]: { ...section.fields[fieldName], value },
                    },
                  }
            ),
          }
    ),
  }
}
