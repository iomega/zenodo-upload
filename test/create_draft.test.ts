import fetch from 'node-fetch';

import { ZenodoDraft } from '../src/zenodo_draft';
import { create_draft } from '../src/create_draft';

jest.mock('node-fetch');
const { Response } = jest.requireActual('node-fetch');

const mockedfetch = (fetch as any) as jest.Mock;

const mockedZenodoSandboxAPI = (url: string, init: RequestInit) => {
  if (
    url ===
      'https://sandbox.zenodo.org/api/deposit/depositions/518011/actions/newversion' &&
    init.method === 'POST'
  ) {
    return new Response(
      JSON.stringify({
        links: {
          latest_draft:
            'https://sandbox.zenodo.org/api/deposit/depositions/518042',
        },
      }),
      {
        status: 201,
        statusText: 'Created',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } else if (
    url ===
      'https://sandbox.zenodo.org/api/deposit/depositions/512658/actions/newversion' &&
    init.method === 'POST'
  ) {
    return new Response(
      JSON.stringify({ status: 404, message: 'PID does not exist.' }),
      {
        status: 404,
        statusText: 'NOT FOUND',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } else if (url === 'https://sandbox.zenodo.org/record/512658') {
    return new Response('', {
      status: 302,
      statusText: 'FOUND',
      headers: {
        Location: 'https://sandbox.zenodo.org/record/518011',
      },
    });
  }

  throw new Error('URL not mocked, ' + url);
};

const mockedZenodoAPI = (url: string, init: RequestInit) => {
  if (
    url ===
      'https://zenodo.org/api/deposit/depositions/518011/actions/newversion' &&
    init.method === 'POST'
  ) {
    return new Response(
      JSON.stringify({
        links: {
          latest_draft: 'https://zenodo.org/api/deposit/depositions/518042',
        },
      }),
      {
        status: 201,
        statusText: 'Created',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } else if (
    url ===
      'https://zenodo.org/api/deposit/depositions/512658/actions/newversion' &&
    init.method === 'POST'
  ) {
    return new Response(
      JSON.stringify({ status: 404, message: 'PID does not exist.' }),
      {
        status: 404,
        statusText: 'NOT FOUND',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } else if (url === 'https://zenodo.org/record/512658') {
    return new Response('', {
      status: 302,
      statusText: 'FOUND',
      headers: {
        Location: 'https://zenodo.org/record/518011',
      },
    });
  }

  throw new Error('URL not mocked, ' + url);
};

describe('create_draft()', () => {
  const access_token = 'sometoken';

  describe('with version DOI against sandbox Zenodo API', () => {
    let draft: ZenodoDraft;
    beforeAll(async () => {
      mockedfetch.mockImplementation(mockedZenodoSandboxAPI);
      draft = await create_draft(518011, access_token, { sandbox: true });
    });

    it('should create draft using version DOI', () => {
      const expected_url =
        'https://sandbox.zenodo.org/api/deposit/depositions/518011/actions/newversion';
      const expected_init = {
        method: 'POST',
        headers: {
          Authorization: 'Bearer sometoken',
        },
      };
      expect(fetch).toHaveBeenCalledWith(expected_url, expected_init);
    });

    it('should return a new draft', () => {
      expect(draft.toString()).toEqual(
        'https://sandbox.zenodo.org/api/deposit/depositions/518042'
      );
    });
  });

  describe('with version DOI against production Zenodo API', () => {
    let draft: ZenodoDraft;
    beforeAll(async () => {
      mockedfetch.mockImplementation(mockedZenodoAPI);
      draft = await create_draft(518011, access_token);
    });

    it('should create draft using version DOI', () => {
      const expected_url =
        'https://zenodo.org/api/deposit/depositions/518011/actions/newversion';
      const expected_init = {
        method: 'POST',
        headers: {
          Authorization: 'Bearer sometoken',
        },
      };
      expect(fetch).toHaveBeenCalledWith(expected_url, expected_init);
    });

    it('should return a new draft', () => {
      expect(draft.toString()).toEqual(
        'https://zenodo.org/api/deposit/depositions/518042'
      );
    });
  });

  describe('with wrong deposition id against sandbox Zenodo API', () => {
    it('should throw a not found error', async () => {
      expect.assertions(1);
      mockedfetch.mockImplementation((url: string) => {
        if (
          url ===
          'https://sandbox.zenodo.org/api/deposit/depositions/-1/actions/newversion'
        ) {
          return new Response(
            JSON.stringify({ status: 404, message: 'PID does not exist.' }),
            {
              status: 404,
              statusText: 'NOT FOUND',
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        }
        return new Response('html page with not found error', {
          status: 404,
          statusText: 'NOT FOUND',
        });
      });
      try {
        await create_draft(-1, access_token, { sandbox: true });
      } catch (error) {
        expect(error).toEqual(
          new Error(
            'Zenodo communication error determining latest version from concept: NOT FOUND'
          )
        );
      }
    });
  });

  describe('with wrong deposition id against production Zenodo API', () => {
    it('should throw a not found error', async () => {
      expect.assertions(1);
      mockedfetch.mockImplementation((url: string) => {
        if (
          url ===
          'https://zenodo.org/api/deposit/depositions/-1/actions/newversion'
        ) {
          return new Response(
            JSON.stringify({ status: 404, message: 'PID does not exist.' }),
            {
              status: 404,
              statusText: 'NOT FOUND',
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        }
        return new Response('html page with not found error', {
          status: 404,
          statusText: 'NOT FOUND',
        });
      });
      try {
        await create_draft(-1, access_token);
      } catch (error) {
        expect(error).toEqual(
          new Error(
            'Zenodo communication error determining latest version from concept: NOT FOUND'
          )
        );
      }
    });
  });

  describe('with wrong token against sandbox Zenodo API', () => {
    it('should throw an unauthorized error', async () => {
      expect.assertions(1);
      mockedfetch.mockImplementation(() => {
        return new Response(
          JSON.stringify({
            message: 'Wrong credentials',
            status: 401,
          }),
          {
            status: 401,
            statusText: 'UNAUTHORIZED',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      });
      try {
        await create_draft(518011, 'badtoken', { sandbox: true });
      } catch (error) {
        expect(error).toEqual(
          new Error(
            'Zenodo API communication error creating draft: UNAUTHORIZED, {"message":"Wrong credentials","status":401}'
          )
        );
      }
    });
  });

  describe('with concept DOI against sandbox Zenodo API', () => {
    let draft: ZenodoDraft;
    beforeAll(async () => {
      mockedfetch.mockImplementation(mockedZenodoSandboxAPI);
      draft = await create_draft(512658, access_token, { sandbox: true });
    });

    it('should try to create draft using concept DOI', () => {
      expect(fetch).toHaveBeenCalledWith(
        'https://sandbox.zenodo.org/api/deposit/depositions/512658/actions/newversion',
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer sometoken',
          },
        }
      );
    });

    it('should fetch concept DOI page', () => {
      expect(fetch).toHaveBeenCalledWith(
        'https://sandbox.zenodo.org/record/512658',
        {
          redirect: 'manual',
          follow: 0,
        }
      );
    });

    it('should create draft using latest version DOI', () => {
      const expected_url =
        'https://sandbox.zenodo.org/api/deposit/depositions/518011/actions/newversion';
      const expected_init = {
        method: 'POST',
        headers: {
          Authorization: 'Bearer sometoken',
        },
      };
      expect(fetch).toHaveBeenCalledWith(expected_url, expected_init);
    });

    it('should return a new draft', () => {
      expect(draft.toString()).toEqual(
        'https://sandbox.zenodo.org/api/deposit/depositions/518042'
      );
    });
  });
});
