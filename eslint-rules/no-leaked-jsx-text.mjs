import ts from "typescript";

// `{value && <X />}` renders `value` itself when it's falsy. For a string or number that's a bare text node,
// which crashes on web inside a View ("Unexpected text node"). Booleans, null and undefined render nothing,
// so they're fine: only conditions whose type can be a string or number are reported. Needs type information
const TEXT_LIKE = ts.TypeFlags.StringLike | ts.TypeFlags.NumberLike | ts.TypeFlags.BigIntLike;

export default {
  meta: {
    type: "problem",
    docs: { description: "Disallow `&&` in JSX when the left side can be a string or number" },
    messages: {
      leaked: "This can render a falsy string or number as text (a crash on web). Make it boolean or use a ternary.",
    },
    schema: [],
  },
  create(context) {
    const services = context.sourceCode.parserServices;
    const checker = services.program.getTypeChecker();

    const canRenderText = (type) =>
      type.isUnion() ? type.types.some(canRenderText) : (type.flags & (TEXT_LIKE | ts.TypeFlags.Any)) !== 0;

    return {
      // Children only: `prop={a && b}` passes a value to a component rather than rendering it
      ":matches(JSXElement, JSXFragment) > JSXExpressionContainer > LogicalExpression[operator='&&']"(node) {
        const type = checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(node.left));
        if (canRenderText(type)) context.report({ node: node.left, messageId: "leaked" });
      },
    };
  },
};
