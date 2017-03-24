import * as fs from 'fs';
import { ResourceLoader } from '@angular/compiler';

export class FileLoader implements ResourceLoader {
  get(url: string): Promise<string> {
    return new Promise((resolve) => {
      resolve(fs.readFileSync(url).toString());
    });
  }
}
