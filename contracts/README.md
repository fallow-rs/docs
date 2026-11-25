# Contracts

These files are the source of the generated reference pages. `fallow schema --cli-reference --pretty` writes `cli-reference.json`: each command, option, exit code, environment variable, issue type and MCP tool and resource. `fallow config-schema` writes `config-schema.json`: the JSON Schema of the config file.

The files come from a build of the main branch of fallow, with the version 3.48.0. No release has this version yet. Do not edit the files by hand.

To refresh them, run `node scripts/generate-reference.mjs --update-contracts <path>`. The path is a `fallow` binary or a fallow checkout. Add `--main-build` when the binary is a build of the main branch and not a release. Then run `npm run docs:reference:write`.
