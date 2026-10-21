const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { test } = require("node:test");
const {
  bookmarkSource,
  bookmarkEnvironment,
} = require("./browser-test-helpers.cjs");

const source = fs.readFileSync(__dirname + "/browser-convert.js", "utf8");
function context() {
  const sandbox = {
    Blob,
    TextEncoder,
    DataView,
    Uint8Array,
    Uint32Array,
    Map,
    Set,
    Math,
    Number,
    String,
    Array,
    Object,
    Error,
    Date,
    crypto: require("node:crypto").webcrypto,
    setTimeout,
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(source, sandbox);
  return sandbox;
}
const leaf = (id) => ({
  versions_id: id,
  dataType: "preset",
  params: { id: "custom" },
  tags: {},
});
const mesh = (x) => ({
  space: "world",
  positions: [x, 0, 0, x + 2, 0, 0, x, 3, 4],
  normals: [0, -0.8, 0.6, 0, -0.8, 0.6, 0, -0.8, 0.6],
});
function readStoredZip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    decoder = new TextDecoder(),
    entries = new Map();
  let at = 0;
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (data) => {
    let c = 0xffffffff;
    for (const b of data) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  while (view.getUint32(at, true) === 0x04034b50) {
    const check = view.getUint32(at + 14, true),
      size = view.getUint32(at + 18, true),
      nameLen = view.getUint16(at + 26, true),
      extraLen = view.getUint16(at + 28, true),
      name = decoder.decode(bytes.slice(at + 30, at + 30 + nameLen)),
      start = at + 30 + nameLen + extraLen,
      data = bytes.slice(start, start + size);
    assert.equal(crc(data), check, `CRC ${name}`);
    entries.set(name, data);
    at = start + size;
  }
  assert.equal(
    view.getUint32(at, true),
    0x02014b50,
    "central directory follows local entries",
  );
  return entries;
}

test("browser conversion creates a readable Layerling ZIP with binary mesh and coordinate conversion", async () => {
  const c = context(),
    blob = await c.convertTinkercadToLayerling(
      { shapes: [leaf("part")], meshes: { part: mesh(11.125) } },
      "Test",
    );
  const bytes = new Uint8Array(await blob.arrayBuffer());
  assert.equal(new DataView(bytes.buffer).getUint32(0, true), 0x04034b50);
  const decoder = new TextDecoder(),
    entries = readStoredZip(bytes);
  const project = JSON.parse(decoder.decode(entries.get("project.json"))),
    object = project.states[0].nodes[0];
  assert.equal(project.schema, "com.layerling.project");
  assert.equal(object.definition.x, 12.125);
  assert.equal(object.definition.elevation, 0);
  const asset = project.assets[0],
    meshBytes = entries.get(asset.path);
  assert.ok(meshBytes);
  assert.equal(meshBytes.length, asset.byteLength);
  assert.equal(decoder.decode(meshBytes.slice(0, 8)), "LYLMSH1\0");
  assert.ok(blob.size > 300);
});

test("browser conversion rejects missing evaluated geometry before producing a project", async () => {
  const c = context();
  await assert.rejects(
    c.convertTinkercadToLayerling(
      { shapes: [leaf("missing")], meshes: {} },
      "Bad",
    ),
    /missing evaluated world mesh/,
  );
});

test("boolean groups retain evaluated output and editable children", async () => {
  const c = context(),
    tree = {
      shapes: [
        {
          versions_id: "group",
          dataType: "csg",
          params: { groupType: 1 },
          tags: {},
          children: [
            leaf("body"),
            { ...leaf("cutter"), tags: { volumePolarity: -1 } },
          ],
        },
      ],
      meshes: { group: mesh(0), body: mesh(0), cutter: mesh(1) },
    };
  const blob = await c.convertTinkercadToLayerling(tree, "Grouped");
  const entries = readStoredZip(new Uint8Array(await blob.arrayBuffer())),
    project = JSON.parse(new TextDecoder().decode(entries.get("project.json"))),
    nodes = project.states[0].nodes;
  const group = nodes.find((n) => n.objectId === "group"),
    cutter = nodes.find((n) => n.objectId === "cutter");
  assert.ok(group.importedMesh);
  assert.equal(group.groupedShapeNodeIds.length, 2);
  assert.equal(group.definition.groupOperation, "group");
  assert.equal(cutter.definition.hole, true);
});

test("generated install page embeds a syntactically valid, self-contained bookmarklet", () => {
  const bookmark = bookmarkSource();
  assert.match(bookmark, /convertTinkercadToLayerling/);
  assert.match(bookmark, /void runLayerlingImport\(\)/);
  new Function(bookmark);
});

test("the direct bookmarklet captures, converts, and downloads one Layerling file", async () => {
  const host = bookmarkEnvironment();
  await host.invoke();
  assert.equal(host.downloads.length, 1);
  assert.equal(host.downloads[0].filename, "Sample - arm.lyl");
  const entries = readStoredZip(
    new Uint8Array(await host.downloads[0].blob.arrayBuffer()),
  );
  assert.ok(entries.has("project.json"));
  assert.equal(
    JSON.parse(new TextDecoder().decode(entries.get("project.json"))).states[0]
      .nodes.length,
    1,
  );
});

test("two clicks share a capture; retained download retries without recapturing and close releases it", async () => {
  const host = bookmarkEnvironment(),
    task = host.invoke();
  assert.equal(
    host.env.__layerlingImportSession.panel.children[2].hidden,
    true,
  );
  host.invoke();
  await task;
  assert.equal(host.captureCalls, 1);
  assert.equal(host.env.document.body.children.length, 1);
  const session = host.env.__layerlingImportSession,
    [, status, link, close] = session.panel.children;
  assert.match(status.textContent, /Project ready/);
  assert.equal(close.disabled, false);
  assert.equal(host.urls.size, 1);
  link.click();
  assert.equal(host.downloads.length, 2);
  assert.equal(host.captureCalls, 1);
  close.click();
  assert.equal(host.urls.size, 0);
  assert.equal(host.env.document.body.children.length, 0);
});

test("leaving the page during capture suppresses the pending download", async () => {
  const early = bookmarkEnvironment(),
    earlyTask = early.invoke();
  early.env.__layerlingImportSession.dispose();
  await earlyTask;
  assert.equal(early.captureCalls, 0);
  assert.equal(early.downloads.length, 0);
  const host = bookmarkEnvironment();
  let finish;
  host.env.llm.tools.get_design_data.run = () =>
    new Promise((resolve) => {
      finish = resolve;
    });
  const task = host.invoke();
  while (!finish) await new Promise((resolve) => setTimeout(resolve, 1));
  host.env.__layerlingImportSession.dispose();
  finish({ shapes: [host.shape] });
  await task;
  assert.equal(host.downloads.length, 0);
  assert.equal(host.urls.size, 0);
  assert.equal(host.env.document.body.children.length, 0);
});

test("the bookmark refuses non-editor pages without enabling tools or reading designs", async () => {
  const host = bookmarkEnvironment();
  host.env.location.pathname = "/dashboard";
  await host.invoke();
  assert.equal(host.captureCalls, 0);
  assert.equal(host.env.__layerlingImportSession, undefined);
  assert.equal(host.downloads.length, 0);
});

test("failed captures show an error, download nothing, and allow retry", async () => {
  const host = bookmarkEnvironment();
  host.env.testKit.sceneModel.children.clear();
  await host.invoke();
  const session = host.env.__layerlingImportSession;
  assert.equal(host.downloads.length, 0);
  assert.equal(host.urls.size, 0);
  assert.equal(session.busy, false);
  assert.match(session.panel.children[1].textContent, /Import failed/);
  host.env.testKit.sceneModel.children.set("single-part", host.scene);
  await host.invoke();
  assert.equal(host.downloads.length, 1);
});

test("a blocked automatic download leaves a working link for a manual retry", async () => {
  const host = bookmarkEnvironment(),
    create = host.env.document.createElement;
  let blocked = true;
  host.env.document.createElement = (tag) => {
    const element = create(tag),
      click = element.click.bind(element);
    if (tag === "a")
      element.click = () => {
        if (blocked) {
          blocked = false;
          throw Error("Automatic download blocked");
        }
        click();
      };
    return element;
  };
  await host.invoke();
  assert.equal(host.downloads.length, 0);
  const link = host.env.__layerlingImportSession.panel.children[2];
  assert.equal(link.hidden, false);
  link.click();
  assert.equal(host.downloads.length, 1);
  assert.equal(host.captureCalls, 1);
});

test("capture identity strings cannot change the mesh table prototype", async () => {
  const host = bookmarkEnvironment();
  host.shape.versions_id = "__proto__";
  host.scene.versions_id = "__proto__";
  host.env.testKit.sceneModel.children.clear();
  host.env.testKit.sceneModel.children.set("__proto__", host.scene);
  await host.invoke();
  assert.equal(host.downloads.length, 1);
  const project = JSON.parse(
    new TextDecoder().decode(
      readStoredZip(
        new Uint8Array(await host.downloads[0].blob.arrayBuffer()),
      ).get("project.json"),
    ),
  );
  assert.equal(project.states[0].nodes[0].objectId, "--proto--");
});

test("two equal surfaces keep the last source material and retain earlier editable nodes", async () => {
  const a = leaf("a"),
    b = leaf("b");
  a.tags.renderingMaterial = { color: { r: 255, g: 0, b: 0 } };
  b.tags.renderingMaterial = { color: { r: 0, g: 255, b: 0 } };
  const tree = {
    shapes: [
      {
        versions_id: "bundle",
        dataType: "csg",
        params: { groupType: 0 },
        tags: { isMulticolor: true },
        children: [a, b],
      },
    ],
    meshes: { a: mesh(0), b: mesh(0) },
  };
  const before = JSON.stringify(tree),
    blob = await context().convertTinkercadToLayerling(tree);
  const project = JSON.parse(
    new TextDecoder().decode(
      readStoredZip(new Uint8Array(await blob.arrayBuffer())).get(
        "project.json",
      ),
    ),
  );
  const nodes = project.states[0].nodes;
  assert.equal(nodes.find((n) => n.objectId === "a").definition.hidden, true);
  assert.equal(
    nodes.find((n) => n.objectId === "b").definition.hidden,
    undefined,
  );
  assert.equal(
    nodes.find((n) => n.objectId === "b").definition.color,
    "#00ff00",
  );
  assert.equal(JSON.stringify(tree), before);
});

test("ambiguous or malformed trees fail rather than omit source parts", async () => {
  for (const shapes of [
    [leaf("a"), null],
    [leaf("a"), leaf("a")],
    [{ ...leaf("a"), children: {} }],
    [{ ...leaf("a"), versions_id: 12 }],
  ]) {
    await assert.rejects(
      context().convertTinkercadToLayerling({ shapes, meshes: { a: mesh(0) } }),
    );
  }
});

test("coincident faces with reversed winding remain separate editable surfaces", async () => {
  for (const normals of [true, false]) {
    const a = mesh(0),
      b = mesh(0);
    b.positions = [
      ...b.positions.slice(0, 3),
      ...b.positions.slice(6, 9),
      ...b.positions.slice(3, 6),
    ];
    if (!normals) {
      delete a.normals;
      delete b.normals;
    }
    const input = {
      shapes: [
        {
          versions_id: "bundle",
          dataType: "csg",
          params: { groupType: 0 },
          children: [leaf("a"), leaf("b")],
        },
      ],
      meshes: { a, b },
    };
    const blob = await context().convertTinkercadToLayerling(input),
      project = JSON.parse(
        new TextDecoder().decode(
          readStoredZip(new Uint8Array(await blob.arrayBuffer())).get(
            "project.json",
          ),
        ),
      );
    assert.equal(
      project.states[0].nodes.some((n) => n.definition.hidden),
      false,
    );
  }
});
