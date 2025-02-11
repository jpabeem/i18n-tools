// checks import
import { resolveChecksInOrder, DIFF_CHECKS } from '../checks/index';

// For typing
// eslint-disable-next-line
import type { Argv } from "yargs";
import { backupPaths, parsePathsToJSON } from '../middlewares/middlewares';
import { CommonDiffArguments, ChangesOps } from '../types/diffTypes';
import CommandBuilder from '../commons/commandBuilder';

// sub fonctions
import detectChanges from './diff/detectChanges';
import reporters from './diff/reporter-strategies/index';

// checks for this command
const CHECKS = DIFF_CHECKS.CHECKS;

// named exports
export const command = 'diff [files..]';
export const description =
  'Compare at least two i18n files & generate a report';

// Builder for yargs
export class CommonDiffYargsBuilder extends CommandBuilder {
  addFilenameOption() {
    this.y = this.y
      .option('filename', {
        type: 'string',
        alias: 'of',
        describe:
          'Name of the output file generated by this CLI (without extension)',
      })
      // default value for filename
      .default('filename', function () {
        const date = new Date();
        const timestamp = `${date.getDate()}-${
          date.getMonth() + 1
        }-${date.getFullYear()} ${date.getHours()}h${date.getMinutes()}m${date.getSeconds()}`;
        return `diff_report_${timestamp}`;
      });
    return this;
  }

  addOutputFormatOption() {
    this.y = this.y.option('outputFormat', {
      describe: 'Output format',
      choices: ['JSON'],
      default: 'JSON',
    });
    return this;
  }

  addFilesOption() {
    this.y = this.y
      // save provided paths into a backup key
      .middleware(backupPaths('files', 'paths'), true)
      // coerce varidic path(s) into Object(s)
      .middleware(parsePathsToJSON('files'), true);
    return this;
  }

  addOperationsOption() {
    this.y = this.y.option('operations', {
      type: 'array',
      describe:
        'Array of operations (such as ["ADD", "PUT"]) that should be checked when comparing files',
      default: Object.keys(ChangesOps),
    });
    return this;
  }
}

export const builder = function (y: Argv) {
  return (
    new CommonDiffYargsBuilder(y)
      .addFilenameOption()
      .addOutputDirOption()
      .addKeySeparatorOption()
      .addOutputFormatOption()
      .addOperationsOption()
      .addFilesOption()
      .addSettingConfig()
      .build()
      // validations
      .check(resolveChecksInOrder(CHECKS))
  );
};

export const handler = async function (argv: any) {
  try {
    const changes = detectChanges(argv as CommonDiffArguments);
    console.log(`Preparing the report file ...`);
    await reporters({
      yargs: argv as CommonDiffArguments,
      changes: changes,
    });
    console.log('Successfully wrote the report file');
    return Promise.resolve(undefined);
  } catch (/* istanbul ignore next */ err) {
    /* istanbul ignore next */
    return Promise.reject(err);
  }
};

// default export
export default {
  command: command,
  description: description,
  builder: builder,
  handler: handler,
};
