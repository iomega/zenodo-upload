import yargs from 'yargs';
import zenodo_upload from './zenodo_upload';

function builder(instance: any) {
  return instance
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
    .option('checksum', {
      type: 'boolean',
      default: true,
      description:
        'Only create new Zenodo version when checksum of file is different',
    });
}

function handler(argv: any) {
  zenodo_upload(
    argv.deposition_id,
    argv.file,
    argv.version,
    argv.access_token,
    { sandbox: argv.sandbox, checksum: argv.checksum }
  )
    .then(result => {
      console.log(
        `Generated new versioned DOI: ${result.doi}, can take a while to be found`
      );
      console.log(`Generated new Zenodo upload: ${result.html}`);
      process.exit(0);
    })
    .catch(e => {
      console.error(e.message);
      process.exit(1);
    });
}

/**
 * Command line tool implementation
 *
 * @param args When empty will use arguments from process.argv
 */
export function main(args: string[] = []) {
  const parser = yargs
    .version(false) // disabled interferes with <version> positional argument
    .usage(
      '$0 [--sandbox] [--no-checksum] <deposition_id> <file> <version> <access_token>',
      'Create new version of a Zenodo upload',
      builder
    );
  let argv;
  if (args.length > 0) {
    argv = parser.parse(args);
  } else {
    argv = parser.parse();
  }
  handler(argv);
}
