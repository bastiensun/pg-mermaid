import { expect, it } from "vitest"

import { createProgram, getOptions } from "../command.js"

it("should not throw error when options are valid", () => {
  // Given
  const dbname = "dbname"
  const username = "username"
  // eslint-disable-next-line sonarjs/no-hardcoded-credentials
  const password = "password"
  const host = "host"
  const port = "2345"
  const schema = "schema"
  const outputPath = "outputPath"
  const excludedTables = ["excludedTable1", "excludedTable2"]

  const program = createProgram()
  program.parse([
    "node",
    "index.js",
    "--dbname",
    dbname,
    "--username",
    username,
    "--password",
    password,
    "--host",
    host,
    "--port",
    port,
    "--schema",
    schema,
    "--output-path",
    outputPath,
    "--excluded-tables",
    ...excludedTables,
  ])

  // When
  const options = getOptions({ program })

  // Then
  expect(options).toStrictEqual({
    dbname,
    excludedTables,
    host,
    outputPath,
    password,
    port: 2345,
    schema,
    username,
  })
})

it("should return default options when optional options are not set", () => {
  // Given
  const username = "username"
  // eslint-disable-next-line sonarjs/no-hardcoded-credentials
  const password = "password"
  const dbname = "dbname"

  const program = createProgram()
  program.parse([
    "node",
    "index.js",
    "--username",
    username,
    "--password",
    password,
    "--dbname",
    dbname,
  ])

  // When
  const { host, outputPath, port, schema } = getOptions({
    program,
  })

  // Then
  expect(host).toStrictEqual("127.0.0.1")
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  expect(port).toStrictEqual(5432)
  expect(schema).toStrictEqual("public")
  expect(outputPath).toStrictEqual("./database.md")
})

it("should handle comma-separated list for `--excluded-tables` flag", () => {
  // Given
  const program = createProgram()
  program.parse([
    "node",
    "index.js",
    "--username",
    "username",
    "--password",
    "password",
    "--dbname",
    "dbname",
    "--excluded-tables",
    "table1,table2",
  ])

  // When
  const { excludedTables } = getOptions({
    program,
  })

  // Then
  expect(excludedTables).toStrictEqual(["table1", "table2"])
})
