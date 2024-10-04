import { type Entity, type Relationship } from "./types.js"

const generateEntity = (entity: Entity): string => {
  const mermaid = [`    ${entity.name} {`]

  for (const attribute of entity.attributes) {
    const { comment, key, name, type } = attribute
    // eslint-disable-next-line sonarjs/no-nested-template-literals
    mermaid.push(`        ${name} ${type}${key ? ` ${key} ` : " "}"${comment}"`)
  }

  mermaid.push("    }")

  return mermaid.join("\n")
}

const generateEntities = (entities: readonly Entity[]): string => {
  const mermaid: string[] = []

  for (const entity of entities) {
    mermaid.push(generateEntity(entity))
  }

  return mermaid.join("\n\n")
}

const generateRelationships = (
  relationships: readonly Relationship[],
): string => {
  const mermaid: string[] = []

  for (const { child, parent } of relationships) {
    mermaid.push(
      `    ${parent.entity} ||--o{ ${child.entity} : "${
        child.entity
      }(${child.attributes.join(", ")}) -> ${
        parent.entity
      }(${parent.attributes.join(", ")})"`,
    )
  }

  return mermaid.join("\n")
}

type GenerateDiagramParameters = {
  entities?: readonly Entity[] | undefined
  relationships?: readonly Relationship[] | undefined
}
export const generateDiagram = ({
  entities = [],
  relationships = [],
}: GenerateDiagramParameters): string => {
  const diagram = ["erDiagram"]

  if (entities.length > 0) {
    diagram.push(generateEntities(entities))
  }

  if (relationships.length > 0) {
    diagram.push(generateRelationships(relationships))
  }

  return diagram.join("\n\n")
}
