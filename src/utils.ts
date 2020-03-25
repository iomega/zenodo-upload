
export function determine_api_base_url(sandbox: boolean) {
  if (sandbox) {
    return 'https://sandbox.zenodo.org/api';
  }
  return 'https://zenodo.org/api';
}

export function auth_headers(access_token: string) {
  return {
    Authorization: `Bearer ${access_token}`,
  };
}
