#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { scanProject } from './scanner.js';

const program = new Command();

program
    .name('depmapx')
    .description('AST-driven dependency analyzer to detect unused packages.')
    .version('1.0.0');

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

program.parse();