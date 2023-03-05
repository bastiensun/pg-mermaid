#!/usr/bin/env zx

const { prompt } = require("enquirer");

$.verbose = false;

const runSql = async (command) =>
  await $`
  PGPASSWORD=${password} \
  psql \
    --host=${hostname} \
    --port=${port} \
    --dbname=${databaseName} \
    --username=${username} \
    --csv \
    --tuples-only \
    --quiet \
    --command=${command}
`;

const formatContraintType = (constraintType) => {
  switch (constraintType) {
    case "PRIMARY KEY":
      return "PK";
    case "FOREIGN KEY":
      return "FK";
    default:
      return undefined;
  }
};

if (argv.help) {
  echo("Usage:");
  echo(
    "  ./pg-mermaid.mjs [--host=HOSTNAME --port=PORT --username=USERNAME --dbname=DBNAME] [--schema=SCHEMA] [--output-path=OUTPUT_PATH]"
  );
  echo("");
  echo("Options:");
  echo(
    "  -h, --host=HOSTNAME      postgres database server host (default: localhost)"
  );
  echo(
    '  -p, --port=PORT          postgres database server port (default: "5432")'
  );
  echo("  -U, --username=USERNAME  postgres database user name");
  echo("  -d, --dbname=DBNAME      postgres database name to connect to");
  echo("  --schema=SCHEMA");
  echo("  --exclude-tables=TABLE1,TABLE2");
  echo("  --output-path=OUTPUT_PATH");
  process.exit(0);
}

let hostname;
let port;
let username;
let databaseName;
if ((argv.username || argv.U) && (argv.dbname || argv.d)) {
  hostname = argv.host ?? argv.h ?? "localhost";
  port = argv.port ?? argv.p ?? 5432;
  username = argv.username ?? argv.U;
  databaseName = argv.dbname ?? argv.d;
} else {
  ({ hostname, port, username, databaseName } = await prompt([
    {
      type: "input",
      name: "hostname",
      message: "Hostname?",
      initial: argv.host ?? argv.h ?? "localhost",
    },
    {
      type: "input",
      name: "port",
      message: "Port?",
      initial: argv.port ?? argv.p ?? 5432,
    },
    {
      type: "input",
      name: "username",
      message: "Username?",
    },
    {
      type: "input",
      name: "databaseName",
      message: "Database name?",
    },
  ]));
}

let password;
if (process.env.PGPASSWORD) {
  password = process.env.PGPASSWORD;
} else {
  ({ password } = await prompt({
    type: "password",
    name: "password",
    message: `Password?`,
  }));
}

let schema;
if (argv.schema) {
  ({ schema } = argv);
} else {
  const schemasInCsvFormat = await runSql(`
  select
    schema_name
  from
    information_schema.schemata;
  `);
  const schemas = schemasInCsvFormat.stdout.split("\n").filter(Boolean);

  ({ schema } = await prompt({
    type: "autocomplete",
    name: "schema",
    message: "Schema?",
    choices: schemas,
  }));
}

const erDiagram = ["erDiagram"];

// Entity
const tablesInCsvFormat = await runSql(`
  select 
    table_name 
  from 
    information_schema.tables
  where 
    table_schema = '${schema}';
`);

const tables = tablesInCsvFormat.stdout.split("\n").filter(Boolean);

let selectedTables;
if (argv["output-path"]) {
  selectedTables = argv["exclude-tables"]
    ? tables.filter((table) => !argv["exclude-tables"].includes(table))
    : tables;
} else {
  ({ selectedTables } = await prompt({
    type: "multiselect",
    name: "selectedTables",
    message: "Tables?",
    choices: [...tables].sort(),
    initial: argv["exclude-tables"]
      ? tables.filter((table) => !argv["exclude-tables"].includes(table))
      : tables,
  }));
}

for (const table of selectedTables) {
  erDiagram.push(`${table} {`);

  const columnsInCsvFormat = await runSql(`
    select 
      columns.column_name,
      columns.udt_name,
      table_constraints.constraint_type,
      columns.is_nullable
    from 
      information_schema.columns
      left join information_schema.key_column_usage 
        on key_column_usage.table_schema = columns.table_schema 
        and key_column_usage.table_name = columns.table_name 
        and key_column_usage.column_name = columns.column_name
      left join information_schema.table_constraints
        on table_constraints.table_schema = key_column_usage.table_schema 
        and table_constraints.table_name = key_column_usage.table_name 
        and table_constraints.constraint_name = key_column_usage.constraint_name
    where 
      columns.table_schema = '${schema}' 
      and columns.table_name = '${table}';
  `);

  const columns = columnsInCsvFormat.stdout
    .split("\n")
    .filter(Boolean)
    .map((column) => {
      const [name, dataType, constraintType, isNullable] = column.split(",");
      return {
        name,
        dataType: dataType.replaceAll("_", ""),
        contraintType: formatContraintType(constraintType),
        isNullable: isNullable === "YES",
      };
    });

  for (const column of columns) {
    erDiagram.push(
      `  ${column.name} ${column.dataType} ${column.contraintType ?? ""} "${
        column.isNullable ? "null" : "not null"
      }"`
    );
  }

  erDiagram.push("}");
}

// Relationship
const foreignKeysInCsvFormat = await runSql(`
  select 
    key_column_usage_1.table_name,
    key_column_usage_1.column_name,
    key_column_usage_2.table_name,
    key_column_usage_2.column_name
  from 
    information_schema.referential_constraints
    join information_schema.key_column_usage as key_column_usage_1
      on key_column_usage_1.constraint_schema = referential_constraints.constraint_schema
      and key_column_usage_1.constraint_name = referential_constraints.constraint_name
      and key_column_usage_1.table_name in (${selectedTables
        .map((table) => `'${table}'`)
        .join(", ")})
    join information_schema.key_column_usage as key_column_usage_2
      on key_column_usage_2.constraint_schema = referential_constraints.unique_constraint_schema
      and key_column_usage_2.constraint_name = referential_constraints.unique_constraint_name
      and key_column_usage_2.table_name in (${selectedTables
        .map((table) => `'${table}'`)
        .join(", ")})
  where 
    referential_constraints.constraint_schema = '${schema}';
`);

const foreignKeys = foreignKeysInCsvFormat.stdout
  .split("\n")
  .filter(Boolean)
  .map((foreignKey) => {
    const [childTableName, childColumnName, parentTableName, parentColumnName] =
      foreignKey.split(",");
    return {
      childTableName,
      childColumnName,
      parentTableName,
      parentColumnName,
    };
  });

for (const foreignKey of foreignKeys) {
  const { childTableName, childColumnName, parentTableName, parentColumnName } =
    foreignKey;
  erDiagram.push(
    `${parentTableName} ||--o{ ${childTableName}: "${childTableName}(${childColumnName}) -> ${parentTableName}(${parentColumnName})"`
  );
}

// Output
if (argv["output-path"]) {
  const markdown = "```mermaid\n" + erDiagram.join("\n") + "\n```";
  await $`echo ${markdown} > ${argv["output-path"]}`;
  echo(`Done! (see '${argv["output-path"]}')`);
  process.exit();
}

const { choice } = await prompt({
  type: "select",
  name: "choice",
  message: " ",
  choices: [
    "Preview diagram in Mermaid live editor",
    "Generate diagram in markdown format",
  ],
});

switch (choice) {
  case "Preview diagram in Mermaid live editor":
    echo(
      `https://mermaid.live/edit#base64:${btoa(
        JSON.stringify({
          code: erDiagram.join("\n"),
          mermaid: {},
        })
      )}`
    );
    break;
  case "Generate diagram in markdown format":
    const { outputPath } = await prompt({
      type: "input",
      name: "outputPath",
      message: "Path?",
      initial: "./entity-relationship-diagram.md",
    });
    const markdown = "```mermaid\n" + erDiagram.join("\n") + "\n```";
    await $`echo ${markdown} > ${outputPath}`;
    echo("Tips! Next time, you can directly run:");
    echo(
      `  ./pg-mermaid.mjs --host=${hostname} --port=${port} --username=${username} --dbname=${databaseName} --schema=${schema} ${
        selectedTables.length === tables.length
          ? ""
          : `--exclude-tables=${tables
              .filter((table) => !selectedTables.includes(table))
              .join(",")} `
      }--output-path=${outputPath}`
    );
    break;
}
