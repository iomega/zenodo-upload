import fs from 'fs';
import { basename } from 'path';
import fetch from 'node-fetch';
import { fromFile as fileTypefromFile } from 'file-type';
import { auth_headers } from './utils';

export interface DepositionFile {
  id: string;
  filename: string;
  filesize: number;
  checksum: string;
}

export interface PublishResult {
  id: number;
  doi: string;
  html: string;
}

export class ZenodoDraft {
  private url: string;
  private access_token: string;
  private bucket = '';
  private _metadata: any;

  constructor(url: string, access_token: string) {
    this.url = url;
    this.access_token = access_token;
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
      this._metadata = json.metadata;
    } else {
      throw new Error(`Zenodo API communication error: ${response.statusText}`);
    }
  }

  async add_file(file: string) {
    if (!this.bucket) {
      await this.build_cache();
    }
    const filename = basename(file);
    const url = `${this.bucket}/${filename}`;
    const body = fs.createReadStream(file);
    const stat = await fs.promises.stat(file);
    const content_type = await fileTypefromFile(file);
    const init = {
      method: 'PUT',
      headers: {
        ...auth_headers(this.access_token),
        'Content-Type': content_type,
        'Content-Length': stat.size,
      },
      body,
    };
    const response = await fetch(url, init as any);
    if (response.ok) {
      const rbody: DepositionFile = await response.json();
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
      this._metadata = body.metadata;

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

  private async build_cache() {
    const init = {
      method: 'GET',
      headers: auth_headers(this.access_token),
    };
    const response = await fetch(this.url, init);
    if (response.ok) {
      const body = await response.json();
      this.bucket = body.links.bucket;
      this._metadata = body.metadata;
    } else {
      throw new Error(`Zenodo API communication error: ${response.statusText}`);
    }
  }
}
