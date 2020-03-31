import { basename } from 'path';
import { fromFile } from 'hasha';

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

export interface DepositionFile {
  id: string;
  filename: string;
  filesize: number;
  checksum: string;
}

export class FilePresentError extends Error {
  constructor(m: string) {
    super(m);
    Object.setPrototypeOf(this, FilePresentError.prototype);
  }
}

export async function is_same_file_present(
  file: string,
  bag: DepositionFile[]
) {
  const filename = basename(file);
  const other = bag.find(f => f.filename === filename);
  if (!other) {
    return false;
  }
  const checksum = await fromFile(file, { algorithm: 'md5' });
  if (checksum === other.checksum) {
    throw new FilePresentError(`File ${file} is present`);
  }
  return true;
}
