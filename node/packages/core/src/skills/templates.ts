export const nodeTemplate = ({ title, content }: { title: string; content: string }) => {
  return `<node>
**Title:** ${title}
**Content:** ${content}
</node>
`;
};

export const promptTemplate = (nodes: string[], promptNode: { title: string; content: string }) => {
  return `${nodes.join("\n\n")}

**Instruction:**
${promptNode.title} ${promptNode.content}
`;
};
