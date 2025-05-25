const traverse = require("@babel/traverse").default;

// Cache for type inference results to optimize performance
const typeInferenceCache = new Map();

// Function to map AST node types to TypeScript types
function inferTsType(node, context = {}) {
	if (!node) return "any";

	const cacheKey =
		node.type +
		JSON.stringify(
			node.value || node.elements || node.properties || node.operator || ""
		);
	if (typeInferenceCache.has(cacheKey)) {
		return typeInferenceCache.get(cacheKey);
	}

	let tsType;
	switch (node.type) {
		case "NumericLiteral":
			tsType = "number";
			break;
		case "StringLiteral":
			tsType = "string";
			break;
		case "BooleanLiteral":
			tsType = "boolean";
			break;
		case "NullLiteral":
			tsType = "null";
			break;
		case "ObjectExpression": {
			const properties = node.properties.map((prop) => {
				const key = prop.key.name || prop.key.value;
				const valueType = inferTsType(prop.value);
				return `${key}: ${valueType}`;
			});
			tsType = `{ ${properties.join("; ")} }`;
			break;
		}
		case "ArrayExpression": {
			const elementTypes = node.elements
				.map((el) => (el ? inferTsType(el) : "any"))
				.filter((type, idx, arr) => type !== "any" || arr.length === 1);
			const uniqueTypes = [...new Set(elementTypes)];
			if (uniqueTypes.length > 1) {
				tsType = `Array<${uniqueTypes.join(" | ")}>`;
			} else {
				tsType = `Array<${uniqueTypes[0] || "any"}>`;
			}
			break;
		}
		case "BinaryExpression":
			if (node.operator === "+") {
				const leftType = inferTsType(node.left);
				const rightType = inferTsType(node.right);
				if (leftType === "string" || rightType === "string") {
					tsType = "string";
				} else {
					tsType = "number";
				}
			} else {
				tsType = "any";
			}
			break;
		case "Identifier":
			tsType = context[node.name] || "any";
			break;
		default:
			tsType = "any";
	}

	typeInferenceCache.set(cacheKey, tsType);
	return tsType;
}

// Function to analyze AST and collect information (Phase 2 + Phase 5: Generics and Interfaces)
function analyzeAST(ast) {
	const analysis = {
		variableDeclarations: [],
		functionDefinitions: [],
		returnStatements: [],
		objectLiterals: [],
		arrayLiterals: [],
		typeAnnotations: {},
		interfaces: {}, // Store interface definitions
	};

	traverse(ast, {
		VariableDeclaration(path) {
			const decl = {
				kind: path.node.kind,
				declarations: path.node.declarations.map((decl) => {
					const tsType = decl.init ? inferTsType(decl.init) : "any";
					analysis.typeAnnotations[decl.id.name] = tsType;

					// Generate interface for object literals
					if (decl.init && decl.init.type === "ObjectExpression") {
						const interfaceName =
							decl.id.name.charAt(0).toUpperCase() + decl.id.name.slice(1);
						analysis.interfaces[interfaceName] = tsType;
						analysis.typeAnnotations[decl.id.name] = interfaceName;
					}

					return {
						name: decl.id.name,
						type: decl.init ? decl.init.type : "undefined",
						tsType,
					};
				}),
			};
			analysis.variableDeclarations.push(decl);
		},
		FunctionDeclaration(path) {
			const paramTypes = {};
			path.traverse({
				BinaryExpression(innerPath) {
					if (innerPath.node.operator === "+") {
						innerPath.node.left.name &&
							(paramTypes[innerPath.node.left.name] = "number");
						innerPath.node.right.name &&
							(paramTypes[innerPath.node.right.name] = "number");
					}
				},
			});

			const params = path.node.params.map((param) => {
				const tsType = paramTypes[param.name] || "any";
				analysis.typeAnnotations[param.name] = tsType;
				return {
					name: param.name,
					tsType,
				};
			});

			let returnTsType = "any";
			path.traverse({
				ReturnStatement(innerPath) {
					if (innerPath.node.argument) {
						returnTsType = inferTsType(innerPath.node.argument, paramTypes);
					}
				},
			});

			const funcName = path.node.id ? path.node.id.name : "anonymous";
			analysis.typeAnnotations[`${funcName}_return`] = returnTsType;

			analysis.functionDefinitions.push({
				name: funcName,
				params,
				returnType: "unknown",
				tsType: `(${params
					.map((p) => `${p.name}: ${p.tsType}`)
					.join(", ")}) => ${returnTsType}`,
			});
		},
		ReturnStatement(path) {
			const tsType = path.node.argument
				? inferTsType(path.node.argument)
				: "void";
			analysis.returnStatements.push({
				argumentType: path.node.argument ? path.node.argument.type : "none",
				tsType,
			});
		},
		ObjectExpression(path) {
			const obj = {
				properties: path.node.properties.map((prop) => ({
					key: prop.key.name || prop.key.value,
					valueType: prop.value.type,
					tsType: inferTsType(prop.value),
				})),
				tsType: inferTsType(path.node),
			};
			analysis.objectLiterals.push(obj);
		},
		ArrayExpression(path) {
			const arr = {
				elementTypes: path.node.elements.map((el) =>
					el ? el.type : "undefined"
				),
				tsType: inferTsType(path.node),
			};
			analysis.arrayLiterals.push(arr);
		},
	});

	return analysis;
}

module.exports = { analyzeAST, inferTsType };
