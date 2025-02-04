module.exports = {
    apps: [
      {
        name: "bun-app",
        script: "bun",
        args: "run index.ts",
        interpreter: "none",
        watch: true, 
      },
    ],
  };
  