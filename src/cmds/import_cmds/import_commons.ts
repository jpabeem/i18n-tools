import fs from 'fs';
import path from 'path';

// lodash methodes
import set from 'lodash/set';
import groupBy from 'lodash/groupBy';

// For typings
import type { Argv } from 'yargs';
import {
  CommonImportArguments,
  extractedTranslation,
} from '../../types/importTypes';

// Builder for yargs
export class CommonImporttYargsBuilder {
  y: Argv<{ [x: string]: any }>; // current yargs result

  constructor(y: Argv<{ [x: string]: any }>) {
    this.y = y;
  }

  addInputOption() {
    this.y = this.y.options('input', {
      type: 'string',
      describe:
        'Absolute path to a file that will be used as source to generate i18n file(s)',
      demandOption: true,
    });
    return this;
  }

  addOutputDir() {
    this.y = this.y
      .option('outputDir', {
        type: 'string',
        alias: 'od',
        describe: 'Output folder where to store the output file(s)',
        default: process.cwd(),
      })
      // coerce path provided by outputDir
      .coerce(['outputDir'], path.resolve);
    return this;
  }

  addSettingConfig() {
    this.y = this.y.config('settings', function (configPath) {
      let ext = path.extname(configPath);
      return /\.js$/i.test(ext)
        ? require(configPath)
        : JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    });
    return this;
  }

  addLocalesOption() {
    this.y = this.y.options('locales', {
      type: 'array',
      describe:
        'Array of locales (such as ["FR", "NL"]) that will be used to generate i18n file(s)',
      demandOption: true,
    });
    return this;
  }

  addSuffixOption() {
    this.y = this.y
      .option('suffix', {
        type: 'string',
        describe:
          "Suffix to append in the output filename(s) to distinguish executions of this script. Use an empty string if you don't want this behavior",
      })
      .default('suffix', function () {
        const date = new Date();
        const timestamp = `${date.getDate()}-${
          date.getMonth() + 1
        }-${date.getFullYear()} ${date.getHours()}h${date.getMinutes()}m${date.getSeconds()}`;
        return `_${timestamp}`;
      });
    return this;
  }

  build() {
    return this.y;
  }
}

// generate filepaths for locales
export function generate_i18n_filepaths(argv: CommonImportArguments) {
  return argv.locales.reduce((acc: { [x: string]: string }, locale: string) => {
    acc[locale] = path.resolve(
      argv.outputDir,
      `${locale.toLowerCase()}${argv.suffix}.json`
    );
    return acc;
  }, {});
}

// extractedTranslation[] to i18n file(s)
export function extractedTranslations_to_i18n_files(
  files: { [x: string]: string },
  translations: extractedTranslation[]
) {
  let groupBy_locales = groupBy(translations, 'locale');
  return Promise.all(
    Object.entries(groupBy_locales).map(([locale, translations]) =>
      write_new_i18n_file(
        locale,
        files[locale],
        translations_2_i18n_object(translations)
      )
    )
  );
}

// export result for a given language into the given file
function write_new_i18n_file(
  locale: string,
  filepath: string,
  json: { [x: string]: any }
) {
  console.log(`\t Trying to write ${locale} i18n file at ${filepath}`);
  return new Promise((resolve, reject) => {
    fs.promises
      .writeFile(filepath, JSON.stringify(json, null, 4))
      .then((_) => {
        console.log(`\t Successfully wrote ${locale} i18n file`);
        resolve(undefined);
      })
      .catch((err) => reject(err));
  });
}

// Turns  array for a given lang into a i18n js object
function translations_2_i18n_object(translations: extractedTranslation[]) {
  let result = {};
  translations.forEach((item) => {
    set(result, item['technical_key'], item['label']);
  });
  return result;
}
