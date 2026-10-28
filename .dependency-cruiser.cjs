/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "core-no-node-builtins",
      comment:
        "src/core must stay free of Node builtins so it runs on any content store.",
      severity: "error",
      from: { path: "^src/core" },
      to: { dependencyTypes: ["core"] },
    },
    {
      name: "core-no-outer-layers",
      comment: "src/core must not depend on server, cli or admin.",
      severity: "error",
      from: { path: "^src/core" },
      to: { path: "^(src/(server|cli)|admin)" },
    },
  ],
  options: {
    tsConfig: { fileName: "tsconfig.json" },
    doNotFollow: { path: "node_modules" },
  },
};
