# Contracts

These files are the source of the generated reference pages. `fallow schema --cli-reference` writes `cli-reference.json`: each command, option, exit code, environment variable and issue type. `fallow config-schema` writes `config-schema.json`: the JSON Schema of the config file.

The files come from fallow 3.44.0. Do not edit them by hand.

To refresh them, run `node scripts/generate-reference.mjs --update-contracts <path>`. The path is a `fallow` binary or a fallow checkout. Then run `npm run docs:reference:write`.
