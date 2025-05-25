const fs = require("fs").promises;
const path = require("path");
const { processMultipleFiles } = require("./index");

async function setupAndProcess() {
    try {
        // Create source directory
        const srcDir = path.join(__dirname, "src");
        await fs.mkdir(srcDir, { recursive: true });

        // Define test files (from Code 2)
        const files = [
            {
                name: "file1.js",
                content: `
let counter = 0;
function increment(step) {
    counter += step;
    return counter;
}
const user = { name: "Alice", age: 30, isActive: true };
                `,
            },
            {
                name: "file2.js",
                content: `
const mixedData = [42, "hello", false];
function combine(a, b, c) {
    return \`\${a} \${b} \${c}\`;
}
const settings = {
    theme: "dark",
    preferences: { fontSize: 16, notifications: true }
};
                `,
            },
        ];

        // Write test files
        for (const file of files) {
            const filePath = path.join(srcDir, file.name);
            await fs.writeFile(filePath, file.content.trim());
            console.log(`Created ${filePath}`);
        }

        // Create output directory
        const outputDir = path.join(__dirname, "dist");
        await fs.mkdir(outputDir, { recursive: true });

        // Process files
        const inputFiles = files.map((file) => path.join(srcDir, file.name));
        const results = await processMultipleFiles(inputFiles, outputDir);

        // Log results (enhanced with Code 1's summary)
        console.log("\nProcessing Results:");
        results.forEach((result) => {
            if (result.status === "success") {
                console.log(`✔ Processed ${result.input} -> ${result.output}`);
            } else {
                console.error(`✖ Failed to process ${result.input}: ${result.error}`);
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
        console.error("Setup failed:", error.message);
        process.exit(1);
    }
}

// Run the setup if script is executed directly (from Code 2)
if (require.main === module) {
    setupAndProcess();
}

module.exports = { setupAndProcess };