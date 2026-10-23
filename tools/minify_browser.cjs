// Build-only minification. Keep global entry points and avoid code rewrites.
const { minify } = require("terser");

async function main() {
  process.stdin.setEncoding("utf8");
  let source = "";
  for await (const chunk of process.stdin) source += chunk;
  const result = await minify(source, {
    compress: false,
    mangle: true,
    format: { comments: false, ascii_only: true },
  });
  process.stdout.write(result.code);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
