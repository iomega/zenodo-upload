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

export class ZenodoDraft {
  private url: string;
  private access_token: string;
  private checksum: boolean;
  private bucket = '';
  private _metadata: any;
  private files: DepositionFile[] = [];

  constructor(url: string, access_token: string, checksum: boolean) {
    this.url = url;
    this.access_token = access_token;
    this.checksum = checksum;
  }

  async set_version(version: string) {
    const metadata = await this.get_metadata();
    metadata.version = version;
    await this.set_metadata(metadata);
  }

  async get_metadata() {
    if (!this._metadata) {
      await this.build_cache();
    }
    return JSON.parse(JSON.stringify(this._metadata));
  }

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
