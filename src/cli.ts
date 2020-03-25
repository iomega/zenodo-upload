#!/usr/bin/env node

import yargs from 'yargs';
import zenodo_upload from './index';

const argv = yargs
  .positional('deposition_id', {
    type: 'number',
    description:
      'Zenodo deposition identifier. For eg. use 3726935 as identifier for https://zenodo.org/record/3726935.',
  })
  .positional('file', {
    type: 'string',
    description: 'Path to file to upload to Zenodo',
  })
  .positional('version', {
    type: 'string',
    description: 'Version string to use in new Zenodo upload',
  })
  .positional('access_token', {
    type: 'string',
    description:
      'Zenodo access token. During token generation check the `deposit:actions` and `deposit:write` scopes. Generate at https://zenodo.org/account/settings/applications/tokens/new/',
  })
  .option('sandbox', {
    type: 'boolean',
    default: false,
    description:
      'Publish to Zenodo sandbox (https://sandbox.zenodo.org) environment instead of Zenodo production environment',
  })
  .demandOption(['deposition_id', 'file', 'version', 'access_token']).argv;

zenodo_upload(
  argv.deposition_id,
  argv.file,
  argv.version,
  argv.access_token,
  argv.sandbox
).then(result => {
  console.log(
    `Generated new versioned DOI: ${result.doi}, can take a while to be found`
  );
  console.log(`Generated new Zenodo upload: ${result.html}`);
  process.exit(0);
});
