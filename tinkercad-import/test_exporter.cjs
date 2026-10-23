const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { test } = require("node:test");

const html = fs.readFileSync(__dirname + "/bookmarklet.html", "utf8");
const source = html.match(/<script id="exporter">([\s\S]*?)<\/script>/)[1];
const STRING_LIMIT = 262144;

function environment() {
  let blob,
    downloads = 0,
    largestString = 0,
    clearedTimers = 0;
  const limitedJSON = {
    parse: JSON.parse,
    stringify(value) {
      const result = JSON.stringify(value);
      largestString = Math.max(largestString, result?.length || 0);
      if (result?.length > STRING_LIMIT)
        throw new RangeError("Invalid string length");
      return result;
    },
  };
  const context = vm.createContext({
    Blob,
    JSON: limitedJSON,
    console,
    setTimeout(fn, delay) {
      if (delay === 0) return setImmediate(fn);
      return 99;
    },
    clearTimeout() {
      clearedTimers++;
    },
    URL: {
      createObjectURL(value) {
        blob = value;
        return "blob:test";
      },
      revokeObjectURL() {},
    },
    document: {
      createElement() {
        return {
          click() {
            downloads++;
          },
        };
      },
    },
    alert() {},
  });
  context.window = context;
  vm.runInContext(source, context);
  return {
    context,
    limitedJSON,
    get blob() {
      return blob;
    },
    get downloads() {
      return downloads;
    },
    get largestString() {
      return largestString;
    },
    get clearedTimers() {
      return clearedTimers;
    },
  };
}

test("chunked JSON preserves nested data, optional fields, and Unicode", async () => {
  const env = environment();
  env.context.value = {
    name: 'Hinge "pin" 🟢',
    optional: undefined,
    nested: [null, true, {}, [], ["a", 12]],
    positions: Array.from({ length: 90000 }, (_, i) => i / 37),
  };
  assert.throws(() => env.limitedJSON.stringify(env.context.value), RangeError);
  const blob = await vm.runInContext("tinkercadJsonBlob(value)", env.context);
  assert.deepEqual(
    JSON.parse(await blob.text()),
    JSON.parse(JSON.stringify(env.context.value)),
  );
});

test("reflected captures swap triangle winding and corresponding normals without changing source geometry", async () => {
  const env = environment(),
    points = [
      [0, 0, 0],
      [2, 0, 0],
      [0, 3, 4],
    ],
    normals = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
  const attribute = (data) => ({
    count: 3,
    getX: (i) => data[i][0],
    getY: (i) => data[i][1],
    getZ: (i) => data[i][2],
  });
  const attributes = {
    position: attribute(points),
    normal: attribute(normals),
  };
  let disposed = 0;
  const geometry = {
    clone: () => ({
      attributes,
      applyMatrix4() {
        return this;
      },
      dispose() {
        disposed++;
      },
    }),
  };
  env.context.llm = {
    tools: {
      get_design_data: {
        run: () => ({
          shapes: [{ versions_id: "reflected", dataType: "preset" }],
        }),
      },
    },
  };
  env.context.testKit = {
    sceneModel: {
      children: new Map([
        [
          "reflected",
          {
            versions_id: "reflected",
            geometry: { get: () => geometry },
            computeWorldMatrix: () => ({ determinant: () => -1 }),
          },
        ],
      ]),
    },
  };
  // The capture reads position availability before cloning.
  geometry.attributes = attributes;
  const result = await vm.runInContext(
    "exportTinkercadDesign({download:false})",
    env.context,
  );
  assert.deepEqual(Array.from(result.meshes.reflected.positions), [
    ...points[0],
    ...points[2],
    ...points[1],
  ]);
  assert.deepEqual(Array.from(result.meshes.reflected.normals), [
    ...normals[0],
    ...normals[2],
    ...normals[1],
  ]);
  assert.deepEqual(points, [
    [0, 0, 0],
    [2, 0, 0],
    [0, 3, 4],
  ]);
  assert.equal(disposed, 1);
});

test("evaluated geometry clears its timeout and disposes cloned geometry even when extraction fails", async () => {
  const env = environment();
  let available = false,
    disposed = 0;
  const geometry = {
    attributes: {
      position: {
        count: 3,
        getX() {
          throw Error("Unreadable position");
        },
      },
    },
    clone() {
      return {
        attributes: this.attributes,
        applyMatrix4() {
          return this;
        },
        dispose() {
          disposed++;
        },
      };
    },
  };
  const scene = {
    versions_id: "bad",
    geometry: { get: () => (available ? geometry : null) },
    evaluate(callback) {
      available = true;
      callback();
    },
    computeWorldMatrix: () => ({ determinant: () => 1 }),
  };
  env.context.llm = {
    tools: {
      get_design_data: {
        run: () => ({ shapes: [{ versions_id: "bad", dataType: "preset" }] }),
      },
    },
  };
  env.context.testKit = { sceneModel: { children: new Map([["bad", scene]]) } };
  await assert.rejects(
    vm.runInContext("exportTinkercadDesign()", env.context),
    /Unreadable position/,
  );
  assert.equal(env.clearedTimers, 1);
  assert.equal(disposed, 1);
  assert.equal(env.downloads, 0);
});
