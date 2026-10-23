// Run the shipped browser converter without a browser for Python parity checks.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");

async function main() {
  const [input, output] = process.argv.slice(2);
  if (!input || !output)
    throw Error(
      "Usage: node convert_browser_fixtures.cjs cases.json output-directory",
    );
  const html = fs.readFileSync(
    path.join(__dirname, "../tinkercad-import/bookmarklet.html"),
    "utf8",
  );
  const source = html.match(/<script id="converter">([\s\S]*?)<\/script>/)[1];
  const context = vm.createContext({
    Blob,
    CompressionStream,
    Float64Array,
    TextEncoder,
    crypto: webcrypto,
    setTimeout,
  });
  vm.runInContext(source, context);
  for (const fixture of JSON.parse(fs.readFileSync(input, "utf8"))) {
    const blob = await context.convertTinkercadToLayerling(
      fixture.input,
      fixture.name,
    );
    fs.writeFileSync(
      path.join(output, fixture.name + ".lyl"),
      Buffer.from(await blob.arrayBuffer()),
    );
    const lazy = await context.convertTinkercadToLayerling({
      ...fixture.input,
      meshes: {},
      readMesh: async id => {
        const mesh = fixture.input.meshes[id];
        return mesh && {...mesh, positions: new Float64Array(mesh.positions),
          normals: mesh.normals == null ? mesh.normals : new Float64Array(mesh.normals)};
      },
    }, fixture.name);
    fs.writeFileSync(path.join(output, fixture.name + "-lazy.lyl"), Buffer.from(await lazy.arrayBuffer()));
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
