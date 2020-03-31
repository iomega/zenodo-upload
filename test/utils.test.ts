import { determine_api_base_url } from '../src/utils';

describe('determine_api_base_url()', () => {
  it.each([
    [false, 'https://zenodo.org/api'],
    [true, 'https://sandbox.zenodo.org/api'],
  ])('%b => %s', (arg, expected) => {
    expect(determine_api_base_url(arg)).toEqual(expected);
  });
});
