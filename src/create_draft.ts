import fetch from 'node-fetch';
import { auth_headers, determine_api_base_url } from './utils';
import { ZenodoDraft } from './zenodo_draft';

export interface Options {
  /**
   * Whether to use the production Zenodo environment or the sandbox environment. False by default.
   */
  sandbox?: boolean;
  /**
   * If true will check if MD5 checksum of `file` is already present in previous Zenodo upload. False by default.
   */
  checksum?: boolean;
}

export const DEFAULT_OPTIONS = Object.freeze({
  sandbox: false,
  checksum: false,
});

function determine_base_url(sandbox: boolean) {
  if (sandbox) {
    return 'https://sandbox.zenodo.org/record/';
  }
  return 'https://zenodo.org/record/';
}

function deposition_id_from_pageurl(url: string) {
  return parseInt(url.slice(url.lastIndexOf('/') + 1));
}

function newversion_url(sandbox: boolean, deposition_id: number) {
  const api_base_url = determine_api_base_url(sandbox);
  return (
    api_base_url + `/deposit/depositions/${deposition_id}/actions/newversion`
  );
}

async function resolve_concept_to_latestversion(
  sandbox: boolean,
  deposition_id: number
) {
  const url = determine_base_url(sandbox) + deposition_id;
  const response = await fetch(url, { redirect: 'manual', follow: 0 });
  if (response.status === 302) {
    const latestversion_pageurl = response.headers.get('Location');
    return deposition_id_from_pageurl(latestversion_pageurl!);
  }
  throw new Error(
    `Zenodo communication error determining latest version from concept: ${response.statusText}`
  );
}

/**
 * Create a draft from an existing Zenodo upload
 *
 * For example to create a draft from [https://zenodo.org/record/1234567](https://zenodo.org/record/1234567).
 *
 * ```javascript
 * import { create_draft } from '@iomeg/zenodo-upload';
 *
 * const deposition_id = 1234567;
 * const access_token = 'sometoken';
 *
 * const draft = await create_draft(deposition_id, access_token);
 * draft.discard();
 * ```
 *
 * @param deposition_id The deposition identifier of a Zenodo upload
 * @param access_token The [Zenodo personal access token](https://sandbox.zenodo.org/account/settings/applications/tokens/new/) with the `deposit:actions` and `deposit:write` scopes.
 * @param options
 *
 * @throws {Error} When communication with Zenodo API fails
 */
export async function create_draft(
  deposition_id: number,
  access_token: string,
  options: Options = DEFAULT_OPTIONS
): Promise<ZenodoDraft> {
  const { sandbox = false, checksum = false } = options;
  const url = newversion_url(sandbox, deposition_id);
  const init = {
    method: 'POST',
    headers: auth_headers(access_token),
  };
  const response = await fetch(url, init);
  if (response.ok) {
    const body = await response.json();
    return new ZenodoDraft(body.links.latest_draft, access_token, checksum);
  } else {
    if (response.status === 404) {
      // Possibly a concept DOI, will try to get latest version DOI and try again
      const latestversion_deposition_id = await resolve_concept_to_latestversion(
        sandbox,
        deposition_id
      );
      return await create_draft(
        latestversion_deposition_id,
        access_token,
        options
      );
    }
    throw new Error(
      `Zenodo API communication error creating draft: ${
        response.statusText
      }, ${await response.text()}`
    );
  }
}
