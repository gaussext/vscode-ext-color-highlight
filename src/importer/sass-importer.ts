import { ImporterOptions } from '../types';

export function parseImports(options: ImporterOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const fileImporter = require('file-importer');
    fileImporter.parse(options, (err: Error | null, data: string) => {
      if (err) {
        return reject(err);
      }
      return resolve(data);
    });
  });
}