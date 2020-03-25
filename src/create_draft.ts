import fetch from 'node-fetch';
import { auth_headers, determine_api_base_url } from './utils';
import { ZenodoDraft } from './zenodo_draft';

export async function create_draft(
  deposition_id: number,
  access_token: string,
  sandbox = false
) {
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
    return new ZenodoDraft(body.links.latest_draft, access_token);
  } else {
    throw new Error(`Zenodo API communication error: ${response.statusText}`);
  }
}
