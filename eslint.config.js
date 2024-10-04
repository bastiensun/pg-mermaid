import js from "@eslint/js"
import comments from "@eslint-community/eslint-plugin-eslint-comments/configs"
import gitignore from "eslint-config-flat-gitignore"
import * as depend from "eslint-plugin-depend"
import jsdoc from "eslint-plugin-jsdoc"
import markdown from "eslint-plugin-markdown"
import node from "eslint-plugin-n"
import perfectionist from "eslint-plugin-perfectionist"
import promise from "eslint-plugin-promise"
import * as regexp from "eslint-plugin-regexp"
import security from "eslint-plugin-security"
import sonarjs from "eslint-plugin-sonarjs"
import unicorn from "eslint-plugin-unicorn"
import vitest from "eslint-plugin-vitest"
import ts from "typescript-eslint"

export default [
  gitignore(),
  { files: ["**/*.{js,mjs,cjs,ts}"] },
  js.configs.recommended,
  ...ts.configs.strictTypeChecked,
  ...ts.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  comments.recommended,
  depend.configs["flat/recommended"],
  jsdoc.configs["flat/logical-typescript"],
  jsdoc.configs["flat/stylistic-typescript"],
  jsdoc.configs["flat/contents-typescript"],
  ...markdown.configs.recommended,
  node.configs["flat/recommended-module"],
  perfectionist.configs["recommended-natural"],
  promise.configs["flat/recommended"],
  regexp.configs["flat/recommended"],
  security.configs.recommended,
  sonarjs.configs.recommended,
  unicorn.configs["flat/recommended"],
  vitest.configs.recommended,
  {
    plugins: {
      node,
    },
    rules: {
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "@typescript-eslint/explicit-function-return-type": "error",
      "@typescript-eslint/method-signature-style": "error", // cf. https://www.totaltypescript.com/method-shorthand-syntax-considered-harmful
      "@typescript-eslint/naming-convention": [
        "error",
        {
          format: ["PascalCase"],
          prefix: ["is", "should", "has", "can", "did", "will"],
          selector: "variable",
          types: ["boolean"],
        },
      ],
      "@typescript-eslint/no-magic-numbers": [
        "error",
        {
          ignore: [-1, 0, 1, 2], // cf. https://en.wikipedia.org/wiki/Magic_number_(programming)#Accepted_uses
        },
      ],
      "@typescript-eslint/promise-function-async": "error", // cf. https://maximorlov.com/linting-rules-for-asynchronous-code-in-javascript/#14-typescript-eslint-promise-function-async
      "@typescript-eslint/strict-boolean-expressions": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "arrow-body-style": "error",
      eqeqeq: "error",
      "guard-for-in": "error", // cf. https://www.executeprogram.com/courses/modern-javascript/lessons/for-of-loops
      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      "max-nested-callbacks": ["error", 3], // cf. https://maximorlov.com/linting-rules-for-asynchronous-code-in-javascript/#5-max-nested-callbacks
      "n/hashbang": "off", // FIX ME
      "n/no-missing-import": [
        "error",
        {
          tryExtensions: [".js", ".json", ".node", ".ts"],
        },
      ],
      "no-await-in-loop": "error", // cf. https://maximorlov.com/linting-rules-for-asynchronous-code-in-javascript/#2-no-await-in-loop
      "no-plusplus": "error",
      "no-promise-executor-return": "error", // cf. https://maximorlov.com/linting-rules-for-asynchronous-code-in-javascript/#3-no-promise-executor-return
      "no-restricted-syntax": [
        "error",
        {
          // cf. https://www.typescriptlang.org/docs/handbook/enums.html#objects-vs-enums
          // cf. https://www.typescriptlang.org/docs/handbook/enums.html#const-enum-pitfalls
          message: "Use const assertion or a string union type instead.",
          selector: "TSEnumDeclaration",
        },
        {
          // cf. https://effectivetypescript.com/2020/03/09/evolving-any
          // cf. https://stackoverflow.com/questions/77150939/triggering-typescript-error-for-untyped-arrays/77804988#77804988
          message: "Don't use evolving any arrays.",
          selector:
            "VariableDeclarator:matches([id.typeAnnotation=undefined]):matches([init.type=ArrayExpression]):matches([init.elements.length=0])",
        },
      ],
      "node/handle-callback-err": ["error", "^.*(e|E)rr"], // cf. https://maximorlov.com/linting-rules-for-asynchronous-code-in-javascript/#8-node-handle-callback-err
      "node/no-callback-literal": "error", // cf. https://maximorlov.com/linting-rules-for-asynchronous-code-in-javascript/#9-node-no-callback-literal
      "node/no-sync": "error", // cf. https://maximorlov.com/linting-rules-for-asynchronous-code-in-javascript/#10-node-no-sync
      "prefer-arrow-callback": "error",
      "prefer-promise-reject-errors": "error", // cf. https://maximorlov.com/linting-rules-for-asynchronous-code-in-javascript/#7-prefer-promise-reject-errors
      "require-atomic-updates": "error", // cf. https://maximorlov.com/linting-rules-for-asynchronous-code-in-javascript/#4-require-atomic-updates
      "unicorn/prefer-at": ["error", { checkAllIndexAccess: true }],
      "vitest/prefer-strict-equal": "error",
    },
  },
  {
    files: ["**/*.{js,mjs,cjs}", "vitest.config.ts"],
    ...ts.configs.disableTypeChecked,
  },
]
