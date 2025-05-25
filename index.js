const fs = require("fs").promises;
const path = require("path");
const ts = require("typescript");
const { parseJSFile } = require("./parser");
const { analyzeAST } = require("./analyzer");
const { transformToTypeScript } = require("./transformer");

// Main function to process a single JavaScript file (renamed from processJSFile to processSingleFile)
async function processSingleFile(filePath) {
    const ast = await parseJSFile(filePath);
    const analysis = analyzeAST(ast);
    return { ast, analysis };
}

// Function to process multiple JavaScript files (updated with Code 2’s parallel implementation)
async function processMultipleFiles(inputPaths, outputDir) {
    await fs.mkdir(outputDir, { recursive: true });
    const results = await Promise.all(
        inputPaths.map(async (inputPath) => {
            const fileName = path.basename(inputPath, ".js") + ".ts";
            const outputPath = path.join(outputDir, fileName);
            try {
                const { analysis } = await processSingleFile(inputPath);
                const tsFile = await transformToTypeScript(inputPath, analysis);
                await fs.rename(tsFile, outputPath);

                // Validate with TypeScript Compiler API (retained from Code 1)
                const tsCode = await fs.readFile(outputPath, "utf-8");
                const sourceFile = ts.createSourceFile(
                    outputPath,
                    tsCode,
                    ts.ScriptTarget.ESNext,
                    true
                );
                const diagnostics = ts
                    .createProgram([outputPath], { noEmit: true })
                    .getSyntacticDiagnostics(sourceFile);
                if (diagnostics.length > 0) {
                    const errors = diagnostics.map((d) => d.messageText).join("\n");
                    throw new Error(
                        `TypeScript validation failed for ${outputPath}:\n${errors}`
                    );
                }

                return { input: inputPath, output: outputPath, status: "success" };
            } catch (error) {
                return {
                    input: inputPath,
                    output: null,
                    status: "failed",
                    error: error.message,
                };
            }
        })
    );
    return results;
}

// Unit tests
const testCode = `
let x = 42;
const obj = { a: 1, b: 'test' };
function add(a, b) {
    return a + b;
}
const arr = [1, 'two', true];
`;

async function runTests() {
    const testFile = "test.js";
    const outputFile = "analysis-output.json";
    let testPassed = true;

    try {
        // Write test file
        await fs.writeFile(testFile, testCode);

        // Process the file (Phase 2)
        const { analysis } = await processSingleFile(testFile);

        // Log the analysis object for visibility
        console.log("AST Analysis Output:");
        console.log(JSON.stringify(analysis, null, 2));

        // Write analysis to output file
        await fs.writeFile(outputFile, JSON.stringify(analysis, null, 2));
        console.log(`Analysis written to ${outputFile}`);

        // Test variable declarations (Phase 2)
        if (analysis.variableDeclarations.length !== 3) {
            console.error(
                `Test failed: Expected 3 variable declarations, got ${analysis.variableDeclarations.length}`
            );
            testPassed = false;
        }
        if (
            !analysis.variableDeclarations.some(
                (decl) => decl.declarations[0].name === "x"
            )
        ) {
            console.error("Test failed: Variable x not detected");
            testPassed = false;
        }
        if (analysis.variableDeclarations[0].declarations[0].tsType !== "number") {
            console.error(
                `Test failed: Expected x to have type 'number', got '${analysis.variableDeclarations[0].declarations[0].tsType}'`
            );
            testPassed = false;
        }
        if (
            analysis.variableDeclarations[1].declarations[0].tsType !==
            "{ a: number; b: string }"
        ) {
            console.error(
                `Test failed: Expected obj to have type '{ a: number; b: string }', got '${analysis.variableDeclarations[1].declarations[0].tsType}'`
            );
            testPassed = false;
        }

        // Test function definitions (Phase 2)
        if (analysis.functionDefinitions.length !== 1) {
            console.error(
                `Test failed: Expected 1 function definition, got ${analysis.functionDefinitions.length}`
            );
            testPassed = false;
        }
        if (analysis.functionDefinitions[0].name !== "add") {
            console.error("Test failed: Function add not detected");
            testPassed = false;
        }
        if (
            analysis.functionDefinitions[0].tsType !==
            "(a: number, b: number) => number"
        ) {
            console.error(
                `Test failed: Expected add to have type '(a: number, b: number) => number', got '${analysis.functionDefinitions[0].tsType}'`
            );
            testPassed = false;
        }

        // Test return statements (Phase 2)
        if (analysis.returnStatements.length !== 1) {
            console.error(
                `Test failed: Expected 1 return statement, got ${analysis.returnStatements.length}`
            );
            testPassed = false;
        }
        if (analysis.returnStatements[0].tsType !== "number") {
            console.error(
                `Test failed: Expected return statement to have type 'number', got '${analysis.returnStatements[0].tsType}'`
            );
            testPassed = false;
        }

        // Test object literals (Phase 2)
        if (analysis.objectLiterals.length !== 1) {
            console.error(
                `Test failed: Expected 1 object literal, got ${analysis.objectLiterals.length}`
            );
            testPassed = false;
        }
        if (analysis.objectLiterals[0].tsType !== "{ a: number; b: string }") {
            console.error(
                `Test failed: Expected object literal to have type '{ a: number; b: string }', got '${analysis.objectLiterals[0].tsType}'`
            );
            testPassed = false;
        }

        // Test array literals (Phase 2)
        if (analysis.arrayLiterals.length !== 1) {
            console.error(
                `Test failed: Expected 1 array literal, got ${analysis.arrayLiterals.length}`
            );
            testPassed = false;
        }
        if (
            analysis.arrayLiterals[0].tsType !== "Array<number | string | boolean>"
        ) {
            console.error(
                `Test failed: Expected array literal to have type 'Array<number | string | boolean>', got '${analysis.arrayLiterals[0].tsType}'`
            );
            testPassed = false;
        }

        // Transform to TypeScript (Phase 3 + Phase 5)
        const tsFile = await transformToTypeScript(testFile, analysis);
        console.log(`TypeScript file generated: ${tsFile}`);

        // Test the generated TypeScript code (Phase 3 + Phase 5)
        const tsCode = await fs.readFile(tsFile, "utf-8");
        const expectedTsCode = `interface Obj{a:number;b:string;}let x:number=42;const obj:Obj={a:1,b:'test'};function add(a:number,b:number):number{return a+b;}const arr:Array<number|string|boolean>=[1,'two',true];`;
        if (tsCode !== expectedTsCode) {
            console.error(
                "Test failed: Generated TypeScript code does not match expected output"
            );
            console.log("Expected:\n", expectedTsCode);
            console.log("Got:\n", tsCode);
            testPassed = false;
        }

        // Validate with TypeScript Compiler API
        const sourceFile = ts.createSourceFile(
            tsFile,
            tsCode,
            ts.ScriptTarget.ESNext,
            true
        );
        const diagnostics = ts
            .createProgram([tsFile], { noEmit: true })
            .getSyntacticDiagnostics(sourceFile);
        if (diagnostics.length > 0) {
            const errors = diagnostics.map((d) => d.messageText).join("\n");
            console.error(
                `Test failed: TypeScript validation failed for ${tsFile}:\n${errors}`
            );
            testPassed = false;
        }

        if (testPassed) {
            console.log("All tests passed!");
        } else {
            throw new Error("One or more tests failed");
        }
    } catch (error) {
        console.error("Test execution failed:", error.message);
        throw error;
    } finally {
        await fs.unlink(testFile).catch(() => {});
    }
}

// Run tests if script is executed directly
if (require.main === module) {
    runTests().catch((error) => {
        console.error("Script execution failed:", error.message);
        process.exit(1);
    });
}

// Exports (updated with Code 2)
module.exports = { parseJSFile, analyzeAST, processSingleFile, processMultipleFiles, runTests };