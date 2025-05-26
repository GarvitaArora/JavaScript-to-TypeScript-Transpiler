#!/usr/bin/env node
const { Command } = require("commander");
const glob = require("glob");
const path = require("path");
const { processMultipleFiles } = require("./index");

const program = new Command();

program
	.name("js-to-ts")
	.description("CLI to transpile JavaScript files to TypeScript")
	.version("1.0.0")
	.requiredOption(
		"-i, --input <path>",
		"Input file or directory pattern (e.g., src/*.js)"
	)
	.requiredOption(
		"-o, --output <path>",
		"Output directory for TypeScript files"
	)
	.action(async (options) => {
		try {
			// Resolve input files using glob
			const files = glob.sync(options.input, { absolute: true });
			if (files.length === 0) {
				console.error(
					"No files found matching the input pattern:",
					options.input
				);
				process.exit(1);
			}

			// Process files
			const results = await processMultipleFiles(files, options.output);

			// Display results
			console.log("\nProcessing Results:");
			results.forEach((result) => {
				if (result.status === "success") {
					console.log(`✔ ${result.input} -> ${result.output}`);
				} else {
					console.error(`✖ ${result.input} -> Failed: ${result.error}`);
				}
			});

			const failedCount = results.filter((r) => r.status === "failed").length;
			if (failedCount > 0) {
				console.error(`\n${failedCount} file(s) failed to process.`);
				process.exit(1);
			} else {
				console.log("\nAll files processed successfully!");
			}
		} catch (error) {
			console.error("CLI execution failed:", error.message);
			process.exit(1);
		}
	});

program.parse(process.argv);
