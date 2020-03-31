import { main } from '../src/cli';
import zenodo_upload from '../src/zenodo_upload';
jest.mock('../src/zenodo_upload');

describe('main()', () => {
  let mockedExit: any;

  beforeAll(() => {
    mockedExit = jest.spyOn(process, 'exit').mockImplementation(exit => {
      throw Error(`${exit}`);
    });
  });

  describe('called with `--help`', () => {
    it('should show help', () => {
      expect.assertions(1);

      try {
        main(['--help']);
      } catch (error) {
        expect(mockedExit).toHaveBeenCalledWith(0);
      }
    });
  });

  describe('called with `1234 somefile 1.2.3 sometoken`', () => {
    beforeEach(() => {
      (zenodo_upload as jest.Mock).mockImplementation(() => {
        return {
          id: 12345,
          doi: 'somedio/12345',
          result: 'https://zenodo.org/record/12345',
        };
      });
    });

    it('should call zenodo_upload()', () => {
      expect.assertions(1);

      try {
        main(['1234', 'somefile', '1.2.3', 'sometoken']);
      } catch (error) {
        expect(zenodo_upload).toHaveBeenCalledWith(
          1234,
          'somefile',
          '1.2.3',
          'sometoken',
          { checksum: true, sandbox: false }
        );
      }
    });
  });
});
