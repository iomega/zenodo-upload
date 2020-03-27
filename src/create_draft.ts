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

export async function create_draft(
  deposition_id: number,
  access_token: string,
  options: Options = DEFAULT_OPTIONS
) {
  const { sandbox = false, checksum = false } = options;
  const api_base_url = determine_api_base_url(sandbox);
  const url =
    api_base_url + `/deposit/depositions/${deposition_id}/actions/newversion`;
  const init = {
    method: 'POST',
    headers: auth_headers(access_token),
  };
  const response = await fetch(url, init);
  if (response.ok) {
    const body = await response.json();
    return new ZenodoDraft(body.links.latest_draft, access_token, checksum);
  } else {
    throw new Error(`Zenodo API communication error: ${response.statusText}`);
  }
}
