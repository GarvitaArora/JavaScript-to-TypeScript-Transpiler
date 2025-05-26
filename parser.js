const fs = require('fs').promises;
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const path = require('path');

// Function to read and parse JavaScript file to AST
async function parseJSFile(filePath) {
    try {
        const code = await fs.readFile(filePath, 'utf-8');
        const ast = parser.parse(code, {
            sourceType: 'module',
            plugins: ['jsx', 'flow']
        });
        return ast;
    } catch (error) {
        throw new Error(`Failed to parse ${filePath}: ${error.message}`);
    }
}

// Function to analyze AST and collect information
function analyzeAST(ast) {
    const analysis = {
        variableDeclarations: [],
        functionDefinitions: [],
        returnStatements: [],
        objectLiterals: [],
        arrayLiterals: []
    };

    traverse(ast, {
        VariableDeclaration(path) {
            analysis.variableDeclarations.push({
                kind: path.node.kind,       // var | let | const
                declarations: path.node.declarations.map(decl => ({
                    name: decl.id.name,
                    type: decl.init ? decl.init.type : 'undefined'
                }))
            });
        },
        FunctionDeclaration(path) {
            analysis.functionDefinitions.push({
                name: path.node.id ? path.node.id.name : 'anonymous',
                params: path.node.params.map(param => param.name),
                returnType: 'unknown' // Placeholder for future TypeScript inference
            });
        },
        ReturnStatement(path) {
            analysis.returnStatements.push({
                argumentType: path.node.argument ? path.node.argument.type : 'none'
            });
        },
        ObjectExpression(path) {
            analysis.objectLiterals.push({
                properties: path.node.properties.map(prop => ({
                    key: prop.key.name || prop.key.value,
                    valueType: prop.value.type
                }))
            });
        },
        ArrayExpression(path) {
            analysis.arrayLiterals.push({
                elementTypes: path.node.elements.map(el => el ? el.type : 'undefined')
            });
        }
    });

    return analysis;
}

// Main function to process a JavaScript file
async function processJSFile(filePath) {
    const ast = await parseJSFile(filePath);
    const analysis = analyzeAST(ast);
    return { ast, analysis };
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
    const testFile = 'test.js';
    let testPassed = true;

    try {
        // Write test file
        await fs.writeFile(testFile, testCode);

        // Process the file
        const { analysis } = await processJSFile(testFile);

        // Log the analysis object for visibility
        console.log('AST Analysis Output:');
        console.log(JSON.stringify(analysis, null, 2));

        // Test variable declarations
        if (analysis.variableDeclarations.length !== 3) {
            console.error(`Test failed: Expected 3 variable declarations, got ${analysis.variableDeclarations.length}`);
            testPassed = false;
        }
        if (!analysis.variableDeclarations.some(decl => decl.declarations[0].name === 'x')) {
            console.error('Test failed: Variable x not detected');
            testPassed = false;
        }

        // Test function definitions
        if (analysis.functionDefinitions.length !== 1) {
            console.error(`Test failed: Expected 1 function definition, got ${analysis.functionDefinitions.length}`);
            testPassed = false;
        }
        if (analysis.functionDefinitions[0].name !== 'add') {
            console.error('Test failed: Function add not detected');
            testPassed = false;
        }

        // Test return statements
        if (analysis.returnStatements.length !== 1) {
            console.error(`Test failed: Expected 1 return statement, got ${analysis.returnStatements.length}`);
            testPassed = false;
        }

        // Test object literals
        if (analysis.objectLiterals.length !== 1) {
            console.error(`Test failed: Expected 1 object literal, got ${analysis.objectLiterals.length}`);
            testPassed = false;
        }

        // Test array literals
        if (analysis.arrayLiterals.length !== 1) {
            console.error(`Test failed: Expected 1 array literal, got ${analysis.arrayLiterals.length}`);
            testPassed = false;
        }

        if (testPassed) {
            console.log('All tests passed!');
        } else {
            throw new Error('One or more tests failed');
        }
    } catch (error) {
        console.error('Test execution failed:', error.message);
        throw error;
    } finally {
        await fs.unlink(testFile).catch(() => {});
    }
}

// Export functions for external use
module.exports = { parseJSFile, analyzeAST, processJSFile, runTests };

// Run tests if script is executed directly
if (require.main === module) {
    runTests().catch(error => {
        console.error('Script execution failed:', error.message);
        process.exit(1);
    });
}
