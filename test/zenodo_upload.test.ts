import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { dir } from 'tmp-promise';

import { zenodo_upload, DraftDiscardedError } from '../src/zenodo_upload';

jest.mock('node-fetch');
const { Response } = jest.requireActual('node-fetch');

const mockedfetch = (fetch as any) as jest.Mock;

const mockedZenodoSandboxAPI = async (url: string, init: RequestInit) => {
  if (
    url ===
    'https://sandbox.zenodo.org/api/deposit/depositions/1234567/actions/newversion'
  ) {
    const response: any = {
      links: {
        latest_draft:
          'https://sandbox.zenodo.org/api/deposit/depositions/7654321',
      },
    };
    const response_init = {
      status: 201,
      statusText: 'Created',
      headers: {
        'Content-Type': 'application/json',
      },
    };
    return new Response(JSON.stringify(response), response_init);
  } else if (
    url === 'https://sandbox.zenodo.org/api/deposit/depositions/7654321' &&
    init.method === 'GET'
  ) {
    const response: any = {
      links: {
        bucket:
          'https://sandbox.zenodo.org/api/files/1e1986e8-f4d5-4d17-91be-2159f9c62b13',
      },
      metadata: {
        version: '0.1.0',
      },
      files: [
        {
          id: 'fileid1',
          filename: 'somefile.txt',
          filesize: 1,
          checksum: '2067974dbfa4906d06f127781fc3ef38',
        },
      ],
    };
    const response_init = {
      status: 200,
      statusText: 'OK',
      headers: {
        'Content-Type': 'application/json',
      },
    };
    return new Response(JSON.stringify(response), response_init);
  } else if (
    url ===
    'https://sandbox.zenodo.org/api/files/1e1986e8-f4d5-4d17-91be-2159f9c62b13/somefile.txt'
  ) {
    const response = {
      id: 'fileid1',
      filename: 'somefile.txt',
      filesize: 9,
      checksum: '4e74fa271381933159558bf36bed0a50',
    };
    const response_init = {
      status: 201,
      statusText: 'Created',
      headers: {
        'Content-Type': 'application/json',
      },
    };
    return new Response(JSON.stringify(response), response_init);
  } else if (
    url === 'https://sandbox.zenodo.org/api/deposit/depositions/7654321' &&
    init.method === 'PUT'
  ) {
    const response: any = {
      links: {
        bucket:
          'https://sandbox.zenodo.org/api/files/1e1986e8-f4d5-4d17-91be-2159f9c62b13',
      },
      metadata: {
        version: '1.2.3',
        publication_date: '2020-04-02',
      },
      files: [
        {
          id: 'fileid1',
          filename: 'somefile.txt',
          filesize: 9,
          checksum: '4e74fa271381933159558bf36bed0a50',
        },
      ],
    };
    const response_init = {
      status: 200,
      statusText: 'Accepted',
      headers: {
        'Content-Type': 'application/json',
      },
    };
    return new Response(JSON.stringify(response), response_init);
  } else if (
    url ===
    'https://sandbox.zenodo.org/api/deposit/depositions/7654321/actions/publish'
  ) {
    const response: any = {
      id: 7654321,
      links: {
        bucket:
          'https://sandbox.zenodo.org/api/files/1e1986e8-f4d5-4d17-91be-2159f9c62b13',
        latest_html: 'https://sandbox.zenodo.org/record/7654321',
        doi: 'https://doi.org/10.5072/zenodo.7654321',
      },
      metadata: {
        version: '1.2.3',
      },
      files: [
        {
          id: 'fileid1',
          filename: 'somefile.txt',
          filesize: 9,
          checksum: '4e74fa271381933159558bf36bed0a50',
        },
      ],
    };
    const response_init = {
      status: 202,
      statusText: 'Accepted',
      headers: {
        'Content-Type': 'application/json',
      },
    };
    return new Response(JSON.stringify(response), response_init);
  } else if (
    url === 'https://sandbox.zenodo.org/api/deposit/depositions/7654321' &&
    init.method === 'DELETE'
  ) {
    const response_init = {
      status: 201,
      statusText: 'Created',
      headers: {
        'Content-Type': 'application/json',
      },
    };
    return new Response('', response_init);
  }
  throw new Error('URL not mocked, ' + url);
};

describe('zenodo_upload()', () => {
  describe('with a dummy file', () => {
    let dummy_file: string;
    let cleanup: () => Promise<void>;
    beforeAll(async () => {
      const result = await dir();
      cleanup = result.cleanup;
      dummy_file = path.join(result.path, 'somefile.txt');
      await fs.promises.writeFile(dummy_file, 'sometext', 'utf8');
    });

    afterAll(async () => {
      await cleanup();
    });

    describe('against a mocked Zenodo sandbox API', () => {
      let result: any;

      beforeAll(async () => {
        mockedfetch.mockImplementation(mockedZenodoSandboxAPI);

        result = await zenodo_upload(
          1234567,
          dummy_file,
          '1.2.3',
          'sometoken',
          { sandbox: true }
        );
      });

      it('should create a draft deposition', () => {
        const expected_url =
          'https://sandbox.zenodo.org/api/deposit/depositions/1234567/actions/newversion';
        const expected_init = {
          method: 'POST',
          headers: {
            Authorization: 'Bearer sometoken',
          },
        };
        expect(fetch).toHaveBeenCalledWith(expected_url, expected_init);
      });

      it('should retrieve deposition of new version', () => {
        const expected_url =
          'https://sandbox.zenodo.org/api/deposit/depositions/7654321';
        const expected_init = {
          method: 'GET',
          headers: {
            Authorization: 'Bearer sometoken',
          },
        };
        expect(fetch).toBeCalledWith(expected_url, expected_init);
      });

      it('should upload file to Zenodo', () => {
        const expected_url =
          'https://sandbox.zenodo.org/api/files/1e1986e8-f4d5-4d17-91be-2159f9c62b13/somefile.txt';
        expect(fetch).toBeCalledWith(expected_url, expect.anything());
        // TODO check headers
      });

      it('should set the version to the current date', () => {
        const expected_url =
          'https://sandbox.zenodo.org/api/deposit/depositions/7654321';

        const expected_init = {
          method: 'PUT',
          headers: {
            Authorization: 'Bearer sometoken',
            'Content-Type': 'application/json',
          },
          body: expect.anything(),
        };
        expect(fetch).toBeCalledWith(expected_url, expected_init);
        const recieved_init = mockedfetch.mock.calls.find(
          args => args[0] === expected_url && args[1].method === 'PUT'
        )[1];
        const metadata = JSON.parse(recieved_init.body).metadata;
        expect(metadata.version).toEqual('1.2.3');
        expect(metadata.publication_date).toMatch(/\d\d\d\d-\d\d-\d\d/);
      });

      it('should return the identifier new version', () => {
        const expected_id = 7654321;
        expect(result.id).toEqual(expected_id);
      });

      it('should return the html url of the new version', () => {
        const expected_url = 'https://sandbox.zenodo.org/record/7654321';
        expect(result.html).toEqual(expected_url);
      });

      it('should return the doi of the new version', () => {
        const expected_doi = 'https://doi.org/10.5072/zenodo.7654321';
        expect(result.doi).toEqual(expected_doi);
      });
    });

    describe('against a broken Zenodo API', () => {
      describe.each([
        [
          'when wrong deposition id is given',
          'https://sandbox.zenodo.org/api/deposit/depositions/1234567/actions/newversion',
          'POST',
          'Zenodo API communication error creating draft: Not found, Something bad happened',
        ],
        [
          'when retrieving new deposition fails',
          'https://sandbox.zenodo.org/api/deposit/depositions/7654321',
          'GET',
          'Zenodo API communication error fetching draft: Not found, Something bad happened',
        ],
        [
          'when adding file fails',
          'https://sandbox.zenodo.org/api/files/1e1986e8-f4d5-4d17-91be-2159f9c62b13/somefile.txt',
          'PUT',
          'Zenodo API communication error adding file: Not found, Something bad happened',
        ],
        [
          'when setting new version fails',
          'https://sandbox.zenodo.org/api/deposit/depositions/7654321',
          'PUT',
          'Zenodo API communication error updating metadata: Not found, Something bad happened',
        ],
        [
          'when publishing fails',
          'https://sandbox.zenodo.org/api/deposit/depositions/7654321/actions/publish',
          'POST',
          'Zenodo API communication error publishing: Not found, Something bad happened',
        ],
      ])(
        'should throw error',
        (why, broken_url, broken_method, expected_message) => {
          it(why, async () => {
            expect.assertions(1);
            mockedfetch.mockImplementation((url, init) => {
              if (url === broken_url && init.method === broken_method) {
                return new Response('Something bad happened', {
                  status: 404,
                  statusText: 'Not found',
                });
              }
              return mockedZenodoSandboxAPI(url, init);
            });

            try {
              await zenodo_upload(1234567, dummy_file, '1.2.3', 'sometoken', {
                sandbox: true,
              });
            } catch (error) {
              expect(error).toEqual(new Error(expected_message));
            }
          });
        }
      );
    });

    describe('with checksum check against a mocked Zenodo sandbox API', () => {
      describe('file not yet present', () => {
        let result: any;

        beforeAll(async () => {
          mockedfetch.mockImplementation((url, init) => {
            if (
              url ===
                'https://sandbox.zenodo.org/api/deposit/depositions/7654321' &&
              init.method === 'GET'
            ) {
              const response: any = {
                links: {
                  bucket:
                    'https://sandbox.zenodo.org/api/files/1e1986e8-f4d5-4d17-91be-2159f9c62b13',
                },
                metadata: {
                  version: '0.1.0',
                },
                files: [],
              };
              const response_init = {
                status: 200,
                statusText: 'OK',
                headers: {
                  'Content-Type': 'application/json',
                },
              };
              return new Response(JSON.stringify(response), response_init);
            }
            return mockedZenodoSandboxAPI(url, init);
          });

          result = await zenodo_upload(
            1234567,
            dummy_file,
            '1.2.3',
            'sometoken',
            { sandbox: true, checksum: true }
          );
        });

        it('should upload file to Zenodo', () => {
          const expected_url =
            'https://sandbox.zenodo.org/api/files/1e1986e8-f4d5-4d17-91be-2159f9c62b13/somefile.txt';
          expect(fetch).toBeCalledWith(expected_url, expect.anything());
        });

        it('should return the doi of the new version', () => {
          const expected_doi = 'https://doi.org/10.5072/zenodo.7654321';
          expect(result.doi).toEqual(expected_doi);
        });
      });

      describe('file already present with same checksum', () => {
        beforeAll(async () => {
          mockedfetch.mockImplementation((url, init) => {
            if (
              url ===
                'https://sandbox.zenodo.org/api/deposit/depositions/7654321' &&
              init.method === 'GET'
            ) {
              const response: any = {
                links: {
                  bucket:
                    'https://sandbox.zenodo.org/api/files/1e1986e8-f4d5-4d17-91be-2159f9c62b13',
                },
                metadata: {
                  version: '0.1.0',
                },
                files: [
                  {
                    id: 'fileid1',
                    filename: 'somefile.txt',
                    filesize: 9,
                    checksum: 'a29e90948f4eee52168fab5fa9cfbcf8',
                  },
                ],
              };
              const response_init = {
                status: 200,
                statusText: 'OK',
                headers: {
                  'Content-Type': 'application/json',
                },
              };
              return new Response(JSON.stringify(response), response_init);
            }
            return mockedZenodoSandboxAPI(url, init);
          });
        });

        it('should have discarded draft', async () => {
          expect.assertions(1);

          try {
            await zenodo_upload(1234567, dummy_file, '1.2.3', 'sometoken', {
              sandbox: true,
              checksum: true,
            });
          } catch {
            const expected_url =
              'https://sandbox.zenodo.org/api/deposit/depositions/7654321';
            const expected_init = {
              method: 'DELETE',
              headers: {
                Authorization: 'Bearer sometoken',
              },
            };
            expect(fetch).toBeCalledWith(expected_url, expected_init);
          }
        });

        it('should raise DraftDiscardedError', async () => {
          expect.assertions(1);

          try {
            await zenodo_upload(1234567, dummy_file, '1.2.3', 'sometoken', {
              sandbox: true,
              checksum: true,
            });
          } catch (error) {
            expect(error).toBeInstanceOf(DraftDiscardedError);
          }
        });
      });

      describe('file already present with different checksum', () => {
        let result: any;

        beforeAll(async () => {
          mockedfetch.mockImplementation(mockedZenodoSandboxAPI);

          result = await zenodo_upload(
            1234567,
            dummy_file,
            '1.2.3',
            'sometoken',
            { sandbox: true, checksum: true }
          );
        });

        it('should upload file to Zenodo', () => {
          const expected_url =
            'https://sandbox.zenodo.org/api/files/1e1986e8-f4d5-4d17-91be-2159f9c62b13/somefile.txt';
          expect(fetch).toBeCalledWith(expected_url, expect.anything());
        });

        it('should return the doi of the new version', () => {
          const expected_doi = 'https://doi.org/10.5072/zenodo.7654321';
          expect(result.doi).toEqual(expected_doi);
        });
      });
    });
  });

  describe('with a non-existing file', () => {});
});
