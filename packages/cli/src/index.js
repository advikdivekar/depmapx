#!/usr/bin/env node

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import path from 'path';
import { scanProject, generateArchitectureMap } from './scanner.js';
import { calculateBlastRadius } from './impact.js';

const program = new Command();

program
    .name('depmapx')
    .description('AST-driven dependency analyzer and architecture mapper')
    .version('1.1.3');

program
    .command('analyze')
    .description('Analyze the current directory for dead dependencies')
    .action(async () => {
        const targetDir = process.cwd();
        const spinner = ora(`Analyzing AST for project at ${targetDir}...`).start();

        try {
            const results = await scanProject(targetDir);
            spinner.succeed(chalk.green('Analysis complete\n'));

            console.log(chalk.bold.blue('Analysis Results:'));
            console.log(`Files Scanned: ${chalk.yellow(results.scannedFiles)}`);
            console.log(`Dependencies Declared: ${chalk.yellow(results.declaredCount)}`);
            console.log(`Dependencies Used: ${chalk.green(results.usedCount)}\n`);

            if (results.unusedDeps.length > 0) {
                console.log(chalk.bold.red(`Unused Dependencies Detected (${results.unusedDeps.length}):`));
                results.unusedDeps.forEach(dep => {
                    console.log(chalk.red(`  - ${dep}`));
                });
                console.log(`\n${chalk.gray('Recommendation: Run npm uninstall <package> to remove these dependencies.')}`);
                process.exit(1);
            } else {
                console.log(chalk.bold.green('Success: No unused dependencies found.'));
                process.exit(0);
            }
        } catch (error) {
            spinner.fail(chalk.red('Analysis failed'));
            console.error(chalk.red(error.message));
            process.exit(1);
        }
    });

program
    .command('map')
    .description('Generate a visual ARCHITECTURE.md map of your dependencies')
    .action(async () => {
        const targetDir = process.cwd();
        const spinner = ora(`Mapping architecture for ${targetDir}...`).start();

        try {
            const results = await scanProject(targetDir);
            const outputPath = await generateArchitectureMap(targetDir, results);

            spinner.succeed(chalk.green('Architecture map generated successfully.\n'));
            console.log(chalk.bold.blue('File saved to: ') + chalk.underline(outputPath));
            console.log(chalk.gray('Commit this file to GitHub to see the interactive visualization.'));

        } catch (error) {
            spinner.fail(chalk.red('Failed to generate map.'));
            console.error(chalk.red(error.message));
            process.exit(1);
        }
    });

program
    .command('impact <packages...>')
    .description('Calculate the blast radius of one or more dependencies')
    .action(async (packages) => {
        const targetDir = process.cwd();

        // Loop through the array of packages provided in the terminal
        for (const packageName of packages) {
            const spinner = ora(`Calculating blast radius for ${chalk.cyan(packageName)}...`).start();

            try {
                const results = await calculateBlastRadius(targetDir, packageName);

                if (results.total === 0) {
                    spinner.info(chalk.yellow(`No impact detected for ${packageName}. It may be unused.`));
                    console.log(chalk.gray('─'.repeat(50)));
                    continue;
                }

                spinner.succeed(`Analysis complete for ${chalk.bold(packageName)}\n`);

                console.log(chalk.bold.underline('Blast Radius Summary:'));
                console.log(`${chalk.red('●')} Total Affected Files: ${chalk.bold(results.total)}`);
                console.log(`${chalk.red('└──')} ${chalk.bold(results.directCount)} Direct Importers`);
                console.log(`${chalk.red('└──')} ${chalk.bold(results.indirectCount)} Indirect/Secondary Importers`);

                console.log(`\n${chalk.bold.underline('Affected Files:')}`);
                results.affectedFiles.forEach(file => {
                    const isDirect = results.directCount > 0 && results.affectedFiles.indexOf(file) < results.directCount;
                    const prefix = isDirect ? chalk.red(' (Direct)') : chalk.yellow(' (Indirect)');
                    console.log(`${chalk.gray('  -')} ${file}${prefix}`);
                });

                console.log(`\n${chalk.bgRed.white.bold(' VERDICT ')} Deleting ${packageName} will break ${results.total} files.\n`);
                console.log(chalk.gray('─'.repeat(50)) + '\n');

            } catch (error) {
                spinner.fail(chalk.red(`Impact analysis failed for ${packageName}.`));
                console.error(chalk.red(`Error: ${error.message}\n`));
                console.log(chalk.gray('─'.repeat(50)) + '\n');
                // We remove process.exit(1) here so one failed package doesn't stop the rest from scanning
            }
        }
    });

program.parse(process.argv);