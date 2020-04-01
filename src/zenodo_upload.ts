import { create_draft, Options, DEFAULT_OPTIONS } from './create_draft';
import { FilePresentError } from './utils';

export class DraftDiscardedError extends Error {
  constructor(m: string) {
    super(m);
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, DraftDiscardedError.prototype);
  }
}

/**
 * Create a new version of a Zenodo upload with a file.
 *
 * Makes a draft copy of an existing Zenodo upload.
 * After overwriting the file and version the upload is published.
 *
 * For example
 *
 * ```javascript
 * import fs from 'fs';
 * import zenodo_upload from '@iomeg/zenodo-upload';
 *
 * const deposition_id = 1234567;
 * const filename = 'somefile.txt';
 * await fs.promises.writeFile(filename, 'sometext', 'utf8');
 * const version = '1.2.3';
 * const access_token = 'sometoken';
 *
 * const result = await zenodo_upload(deposition_id, filename, version, access_token);
 * console.log(`New zenodo entry ${result.doi} created`);
 * ```
 *
 * @param deposition_id Zenodo upload identifier
 * @param file Path to file to upload
 * @param version Version to use
 * @param access_token The [Zenodo personal access token](https://sandbox.zenodo.org/account/settings/applications/tokens/new/) with the `deposit:actions` and `deposit:write` scopes.
 * @param options Advanced options
 *
 * @throws {DraftDiscardedError} When `options.checksum` and `file` is already present.
 *
 * @returns The id, url of the html page and the DOI of the new version.
 */
export async function zenodo_upload(
  deposition_id: number,
  file: string,
  version: string,
  access_token: string,
  options: Options = DEFAULT_OPTIONS
) {
  const { sandbox = false, checksum = false } = options;
  const draft = await create_draft(deposition_id, access_token, {
    sandbox,
    checksum,
  });
  try {
    await draft.add_file(file);
  } catch (error) {
    if (checksum && error instanceof FilePresentError) {
      await draft.discard();
      throw new DraftDiscardedError(
        `Zenodo draft version ${draft} has been discarded`
      );
    }
    throw error;
  }
  await draft.set_version(version);
  return await draft.publish();
}
