JS to TS Transpiler
A tool to transpile JavaScript code to TypeScript with type inference, generics, and interfaces.
Installation

Clone the repository:
git clone <repository-url>
cd js-to-ts-transpiler


Install dependencies:
npm install


(Optional) Link the CLI globally:
npm link



Usage
The transpiler provides a CLI to convert JavaScript files to TypeScript.
Command
js-to-ts -i <input> -o <output>


-i, --input <path>: Input file or directory pattern (e.g., src/*.js).
-o, --output <path>: Output directory for TypeScript files.

Example

Create some JavaScript files:
mkdir src
echo "let x = 42;" > src/file1.js
echo "const y = 'hello';" > src/file2.js


Run the transpiler:
js-to-ts -i "src/*.js" -o dist


Check the output in the dist directory:

dist/file1.ts: let x:number=42;
dist/file2.ts: const y:string="hello";



Features

Type Inference: Infers TypeScript types for variables, functions, and return statements.
Generics: Supports Array<T> for arrays with inferred element types.
Interfaces: Generates interfaces for object literals (e.g., interface Obj { a: number; b: string; }).
Validation: Uses the TypeScript Compiler API to validate generated code.
Performance: Caches type inference results to optimize processing.

Project Structure

cli.js: Entry point for the CLI.
index.js: Main logic and tests.
parser.js: Parses JavaScript files into ASTs.
analyzer.js: Analyzes ASTs for type inference and interface generation.
transformer.js: Transforms ASTs to add TypeScript annotations.
setup.js: Utility script to create test files programmatically.

Running Tests
To run the built-in tests:
npm test

Contributing
Contributions are welcome! Please submit a pull request or open an issue.
License
This project is licensed under the MIT License. See the LICENSE file for details.
