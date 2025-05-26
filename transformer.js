const fs = require("fs").promises;
const traverse = require("@babel/traverse").default;
const generate = require("@babel/generator").default;
const t = require("@babel/types");
const { parseJSFile } = require("./parser");

// Babel plugin to add TypeScript type annotations (Phase 3 + Phase 5: Generics and Interfaces)
function typeScriptTransformer(analysis) {
	return {
		visitor: {
			Program(path) {
				// Prepend interface declarations
				Object.entries(analysis.interfaces).forEach(([name, tsType]) => {
					const properties = tsType
						.slice(2, -2)
						.split(";")
						.map((prop) => {
							const [key, valType] = prop
								.trim()
								.split(":")
								.map((s) => s.trim());
							let valTypeNode;
							if (valType === "number") {
								valTypeNode = t.tsNumberKeyword();
							} else if (valType === "string") {
								valTypeNode = t.tsStringKeyword();
							} else {
								valTypeNode = t.tsAnyKeyword();
							}
							return t.tsPropertySignature(
								t.identifier(key),
								t.tsTypeAnnotation(valTypeNode)
							);
						});
					const interfaceDecl = t.tsInterfaceDeclaration(
						t.identifier(name),
						null,
						[],
						t.tsInterfaceBody(properties)
					);
					path.node.body.unshift(interfaceDecl);
				});
			},
			VariableDeclaration(path) {
				path.node.declarations.forEach((decl) => {
					const varName = decl.id.name;
					const tsType = analysis.typeAnnotations[varName] || "any";
					let typeAnnotation;

					// Check if tsType is an interface name (not a raw type like 'number' or '{ ... }')
					if (analysis.interfaces[tsType]) {
						typeAnnotation = t.tsTypeAnnotation(
							t.tsTypeReference(t.identifier(tsType))
						);
					} else if (tsType === "number") {
						typeAnnotation = t.tsTypeAnnotation(t.tsNumberKeyword());
					} else if (tsType === "string") {
						typeAnnotation = t.tsTypeAnnotation(t.tsStringKeyword());
					} else if (tsType === "boolean") {
						typeAnnotation = t.tsTypeAnnotation(t.tsBooleanKeyword());
					} else if (tsType.startsWith("{")) {
						const properties = tsType
							.slice(2, -2)
							.split(";")
							.map((prop) => {
								const [key, valType] = prop
									.trim()
									.split(":")
									.map((s) => s.trim());
								let valTypeNode;
								if (valType === "number") {
									valTypeNode = t.tsNumberKeyword();
								} else if (valType === "string") {
									valTypeNode = t.tsStringKeyword();
								} else {
									valTypeNode = t.tsAnyKeyword();
								}
								return t.tsPropertySignature(
									t.identifier(key),
									t.tsTypeAnnotation(valTypeNode)
								);
							});
						typeAnnotation = t.tsTypeAnnotation(t.tsTypeLiteral(properties));
					} else if (tsType.startsWith("Array<")) {
						let elementType = tsType.slice(6, -1);
						let elementTypeNode;
						if (elementType.includes("|")) {
							const unionTypes = elementType.split(" | ").map((type) => {
								if (type === "number") return t.tsNumberKeyword();
								if (type === "string") return t.tsStringKeyword();
								if (type === "boolean") return t.tsBooleanKeyword();
								return t.tsAnyKeyword();
							});
							elementTypeNode = t.tsUnionType(unionTypes);
						} else {
							elementTypeNode =
								elementType === "number"
									? t.tsNumberKeyword()
									: elementType === "string"
									? t.tsStringKeyword()
									: t.tsAnyKeyword();
						}
						typeAnnotation = t.tsTypeAnnotation(
							t.tsTypeReference(
								t.identifier("Array"),
								t.tsTypeParameterInstantiation([elementTypeNode])
							)
						);
					} else {
						typeAnnotation = t.tsTypeAnnotation(t.tsAnyKeyword());
					}

					decl.id.typeAnnotation = typeAnnotation;
				});
			},
			FunctionDeclaration(path) {
				const funcName = path.node.id ? path.node.id.name : "anonymous";
				const returnTsType =
					analysis.typeAnnotations[`${funcName}_return`] || "any";
				path.node.params.forEach((param) => {
					const paramName = param.name;
					const tsType = analysis.typeAnnotations[paramName] || "any";
					let typeAnnotation;

					if (tsType === "number") {
						typeAnnotation = t.tsTypeAnnotation(t.tsNumberKeyword());
					} else {
						typeAnnotation = t.tsTypeAnnotation(t.tsAnyKeyword());
					}

					param.typeAnnotation = typeAnnotation;
				});

				let returnTypeAnnotation;
				if (returnTsType === "number") {
					returnTypeAnnotation = t.tsTypeAnnotation(t.tsNumberKeyword());
				} else {
					returnTypeAnnotation = t.tsTypeAnnotation(t.tsAnyKeyword());
				}
				path.node.returnType = returnTypeAnnotation;
			},
		},
	};
}

// Function to transform AST and generate TypeScript code (Phase 3 + Phase 5)
async function transformToTypeScript(filePath, analysis) {
	const ast = await parseJSFile(filePath);
	traverse(ast, typeScriptTransformer(analysis).visitor);
	const output = generate(
		ast,
		{ compact: true },
		await fs.readFile(filePath, "utf-8")
	);
	const outputFile = filePath.replace(".js", ".ts");
	await fs.writeFile(outputFile, output.code);
	return outputFile;
}

module.exports = { transformToTypeScript };
