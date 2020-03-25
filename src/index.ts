import { create_draft } from './create_draft';

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
 * const file = fs.writeFileSync('somefile.txt', 'sometext', 'utf8');
 * const version '1.2.3';
 * const access_token = 'sometoken';
 *
 * await zenodo_upload(deposition_id, file, version, access_token);
 * ```
 *
 * @param deposition_id Zenodo upload identifier
 * @param file Path to file to upload
 * @param version Version to use.
 * @param access_token [Zenodo personal access token](https://sandbox.zenodo.org/account/settings/applications/tokens/new/) with the `deposit:actions` and `deposit:write` scopes.
 * @param sandbox Whether to use the production Zenodo environment or the sandbox environment.
 * @returns The id, url of the html page and the DOI of the new version.
 */
export default async function zenodo_upload(
  deposition_id: number,
  file: string,
  version: string,
  access_token: string,
  sandbox = false
) {
  const draft = await create_draft(deposition_id, access_token, sandbox);
  await draft.add_file(file);
  await draft.set_version(version);
  return await draft.publish();
}
