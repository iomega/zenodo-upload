import fs from 'fs';
import { basename } from 'path';
import fetch from 'node-fetch';
import { fromFile as fileTypefromFile } from 'file-type';
import { auth_headers, DepositionFile, is_same_file_present } from './utils';

export interface PublishResult {
  id: number;
  doi: string;
  html: string;
}

/**
 * Manage draft entry on Zenodo
 *
 * A draft can be created with {@link create_draft} function.
 */
export class ZenodoDraft {
  private url: string;
  private access_token: string;
  private checksum: boolean;
  private bucket = '';
  private _metadata: any;
  private files: DepositionFile[] = [];

  /**
   *
   * @param url URL of draft Zenodo upload
   * @param access_token The [Zenodo personal access token](https://sandbox.zenodo.org/account/settings/applications/tokens/new/) with the `deposit:actions` and `deposit:write` scopes.
   * @param checksum When true then an added file is checksum matched with file already in draft. If it matches an error is thrown.
   */
  constructor(url: string, access_token: string, checksum: boolean) {
    this.url = url;
    this.access_token = access_token;
    this.checksum = checksum;
  }

  /**
   * Set version of draft
   *
   * @param version Update draft with given version
   *
   * @throws {Error} When communication with Zenodo API fails
   */
  async set_version(version: string) {
    const metadata = await this.get_metadata();
    metadata.version = version;
    await this.set_metadata(metadata);
  }

  /**
   * Get copy of the metadata.
   *
   * @returns metadata object of draft
   *
   * @throws {Error} When communication with Zenodo API fails
   */
  async get_metadata() {
    if (!this._metadata) {
      await this.build_cache();
    }
    return JSON.parse(JSON.stringify(this._metadata));
  }

  /**
   * Overwrite complete metadata of draft
   *
   * For example
   *
   * ```javascript
   * const metadata = await draft.get_metdata();
   * metadata.title = 'My new title';
   * await draft.set_metadata(metadata);
   * ```
   *
   * @param metadata New metadata object for draft
   *
   * @throws {Error} When communication with Zenodo API fails
   */
  async set_metadata(metadata: any) {
    const body = JSON.stringify({ metadata });
    const init = {
      method: 'PUT',
      headers: {
        ...auth_headers(this.access_token),
        'Content-Type': 'application/json',
      },
      body,
    };
    const response = await fetch(this.url, init as any);
    if (response.ok) {
      const json = await response.json();
      this.fill_cache(json);
    } else {
      throw new Error(`Zenodo API communication error: ${response.statusText}`);
    }
  }

  /**
   * Add file to draft
   *
   * @param file Path to file
   *
   * @throws {FilePresentError} When checksum=true and file checksum matched with file already in draft.
   * @throws {Error} When communication with Zenodo API fails
   */
  async add_file(file: string) {
    if (!this.bucket) {
      await this.build_cache();
    }
    const stat = await fs.promises.stat(file);
    const content_type = await fileTypefromFile(file);
    if (this.checksum) {
      await is_same_file_present(file, this.files);
    }

    const body = fs.createReadStream(file);
    const init = {
      method: 'PUT',
      headers: {
        ...auth_headers(this.access_token),
        'Content-Type': content_type,
        'Content-Length': stat.size,
      },
      body,
    };
    const filename = basename(file);
    const url = `${this.bucket}/${filename}`;
    const response = await fetch(url, init as any);
    if (response.ok) {
      const rbody: DepositionFile = await response.json();
      this.add_file2cache(rbody);
      return rbody;
    } else {
      throw new Error(`Zenodo API communication error: ${response.statusText}`);
    }
  }

  /**
   * Publish draft Zenodo upload
   *
   * @throws {Error} When communication with Zenodo API fails
   */
  async publish() {
    const url = this.url + '/actions/publish';
    const init = {
      method: 'POST',
      headers: auth_headers(this.access_token),
    };
    const response = await fetch(url, init as any);
    if (response.ok) {
      const body = await response.json();
      this.fill_cache(body);

      const result: PublishResult = {
        id: body.id,
        doi: body.links.doi,
        html: body.links.latest_html,
      };
      return result;
    } else {
      throw new Error(`Zenodo API communication error: ${response.statusText}`);
    }
  }

  /**
   * Discard the draft.
   *
   * Any other methods on the object will fail after discarding.
   *
   * @throws {Error} When communication with Zenodo API fails
   */
  async discard() {
    const init = {
      method: 'DELETE',
      headers: auth_headers(this.access_token),
    };
    const response = await fetch(this.url, init as any);
    if (!response.ok) {
      throw new Error(`Zenodo API communication error: ${response.statusText}`);
    }
  }

  toString() {
    return this.url;
  }

  private add_file2cache(filedep: DepositionFile) {
    const index = this.files.findIndex(f => f.id === filedep.id);
    if (index === -1) {
      this.files.push(filedep);
    } else {
      this.files[index] = filedep;
    }
  }

  private fill_cache(record: any) {
    this.bucket = record.links.bucket;
    this._metadata = record.metadata;
    this.files = record.files;
  }

  private async build_cache() {
    const init = {
      method: 'GET',
      headers: auth_headers(this.access_token),
    };
    const response = await fetch(this.url, init);
    if (response.ok) {
      const body = await response.json();
      this.fill_cache(body);
    } else {
      throw new Error(`Zenodo API communication error: ${response.statusText}`);
    }
  }
}
