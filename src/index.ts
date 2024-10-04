#!/usr/bin/env node

import * as fs from "node:fs/promises"
import path from "node:path"

import { getOptions } from "./command.js"
import {
  createConnection,
  getEntities,
  getIndexes,
  getRelationships,
} from "./database.js"
import { generateMarkdown } from "./markdown.js"
import { generateDiagram } from "./mermaid.js"

export const main = async (): Promise<void> => {
  const {
    dbname,
    excludedTables = [],
    host,
    outputPath,
    password,
    port,
    schema,
    username,
  } = getOptions()

  const connection = await createConnection({
    dbname,
    host,
    password,
    port,
    username,
  })

  const entities = await connection.any(getEntities({ excludedTables, schema }))
  const relationships = await connection.any(
    getRelationships({ excludedTables, schema }),
  )
  const indexes = await connection.any(getIndexes({ excludedTables, schema }))

  const diagram = generateDiagram({ entities, relationships })

  const markdown = generateMarkdown({ diagram, indexes })

  await fs.writeFile(outputPath, markdown)
  console.log(
    `Diagram was generated successfully at '${path.join(
      process.cwd(),
      outputPath,
    )}'`,
  )

  await connection.end()
}

void main()
