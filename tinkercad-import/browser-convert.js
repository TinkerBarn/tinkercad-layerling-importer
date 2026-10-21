/* Browser implementation of the evaluated-world JSON -> Layerling v2 writer.
 * Kept dependency-free so it can be embedded in the install page/bookmarklet. */
(function (root) {
  "use strict";
  const MIN_SIZE = 0.05;
  function yUpVectors(values) {
    const result = new Array(values.length);
    for (let i = 0; i < values.length; i += 3) {
      result[i] = values[i];
      result[i + 1] = values[i + 2];
      result[i + 2] = -values[i + 1];
    }
    return result;
  }
  function unionBounds(shapes) {
    const result = [
      Infinity,
      -Infinity,
      Infinity,
      -Infinity,
      Infinity,
      -Infinity,
    ];
    for (const shape of shapes)
      for (let k = 0; k < 6; k++)
        result[k] =
          k % 2
            ? Math.max(result[k], shape._bounds[k])
            : Math.min(result[k], shape._bounds[k]);
    return result;
  }
  const positive = (n) => Math.max(MIN_SIZE, Math.abs(n));
  const bounds = (p) => {
    const b = [Infinity, -Infinity, Infinity, -Infinity, Infinity, -Infinity];
    for (let i = 0; i < p.length; i += 3)
      for (let k = 0; k < 3; k++) {
        const x = p[i + k];
        b[k * 2] = Math.min(b[k * 2], x);
        b[k * 2 + 1] = Math.max(b[k * 2 + 1], x);
      }
    return b;
  };
  const colorOf = (c) => {
    if (!c || typeof c !== "object") return "";
    return (
      "#" +
      [c.r, c.g, c.b]
        .map((x) =>
          Math.max(0, Math.min(255, Math.trunc(Number(x) || 0)))
            .toString(16)
            .padStart(2, "0"),
        )
        .join("")
    );
  };
  const visibleChildren = (n) =>
    (n.children || []).filter((x) => !x.tags?.preview);
  const compareNumbers = (a, b) => {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
    return 0;
  };
  const equalNumbers = (a, b) =>
    a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) <= 1e-5);
  function canonicalTriangles(mesh) {
    const triangles = [];
    for (let i = 0; i < mesh.positions.length; i += 9) {
      const vertices = [];
      for (let j = i; j < i + 9; j += 3)
        vertices.push([
          ...mesh.positions.slice(j, j + 3),
          ...(mesh.normals || []).slice(j, j + 3),
        ]);
      // Cyclic rotations preserve a face; reversing its winding does not.
      const rotations = vertices.map((_, k) =>
        [...vertices.slice(k), ...vertices.slice(0, k)].flat(),
      );
      triangles.push(rotations.sort(compareNumbers)[0]);
    }
    return triangles.sort(compareNumbers).flat();
  }
  async function sameConvexSurface(first, second) {
    const points = (p) =>
      Array.from({ length: p.length / 3 }, (_, i) => p.slice(i * 3, i * 3 + 3));
    const a = points(first),
      b = points(second);
    a.sort(compareNumbers);
    b.sort(compareNumbers);
    if (
      a.length !== b.length ||
      a.some((p, i) => Math.hypot(...p.map((v, k) => v - b[i][k])) > 1e-5)
    )
      return false;
    const closedConvex = async (positions) => {
      const vertices = points(positions),
        unique = [
          ...new Map(vertices.map((v) => [JSON.stringify(v), v])).values(),
        ];
      const center = [0, 1, 2].map(
          (k) => unique.reduce((sum, v) => sum + v[k], 0) / unique.length,
        ),
        edges = new Map();
      let orientation = 0;
      for (let i = 0; i < vertices.length; i += 3) {
        if (i && i % 192 === 0)
          await new Promise((resolve) => setTimeout(resolve, 0));
        const [p, q, r] = vertices.slice(i, i + 3),
          u = q.map((v, k) => v - p[k]),
          v = r.map((x, k) => x - p[k]);
        let n = [
            u[1] * v[2] - u[2] * v[1],
            u[2] * v[0] - u[0] * v[2],
            u[0] * v[1] - u[1] * v[0],
          ],
          length = Math.hypot(...n);
        if (length < 1e-12) continue;
        n = n.map((x) => x / length);
        const side = n.reduce((sum, x, k) => sum + x * (center[k] - p[k]), 0),
          winding = side > 1e-12 ? -1 : side < -1e-12 ? 1 : 0;
        if (!winding || (orientation && orientation !== winding)) return 0;
        orientation = winding;
        if (side > 0) n = n.map((x) => -x);
        if (
          unique.some(
            (x) => n.reduce((sum, c, k) => sum + c * (x[k] - p[k]), 0) > 1e-4,
          )
        )
          return 0;
        for (const [x, y] of [
          [p, q],
          [q, r],
          [r, p],
        ]) {
          const endpoints = [x, y]
              .map((point) => point.map((c) => Math.round(c * 1e4) / 1e4))
              .sort(compareNumbers),
            key = JSON.stringify(endpoints);
          edges.set(key, (edges.get(key) || 0) + 1);
        }
      }
      return edges.size > 0 && [...edges.values()].every((n) => n === 2)
        ? orientation
        : 0;
    };
    const firstOrientation = await closedConvex(first);
    return (
      firstOrientation !== 0 &&
      firstOrientation === (await closedConvex(second))
    );
  }
  function validateMesh(m, id) {
    const p = m?.positions,
      n = m?.normals;
    if (
      m?.space !== "world" ||
      !Array.isArray(p) ||
      !p.length ||
      p.length % 9 ||
      !p.every(Number.isFinite)
    )
      throw Error(id + ": expected finite complete world-space triangles");
    if (
      n != null &&
      (!Array.isArray(n) || n.length !== p.length || !n.every(Number.isFinite))
    )
      throw Error(id + ": invalid normals");
  }
  async function zipStore(entries, onProgress) {
    if (entries.length >= 65535)
      throw Error(
        "This project has too many files for the browser ZIP writer.",
      );
    const enc = new TextEncoder(),
      files = [],
      chunks = [];
    let offset = 0;
    const crcTable = (() => {
      const t = new Uint32Array(256);
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++)
          c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c >>> 0;
      }
      return t;
    })();
    const crc = async (data) => {
      let c = 0xffffffff;
      for (let start = 0; start < data.length; start += 1048576) {
        const end = Math.min(start + 1048576, data.length);
        for (let i = start; i < end; i++)
          c = crcTable[(c ^ data[i]) & 255] ^ (c >>> 8);
        if (end < data.length)
          await new Promise((resolve) => setTimeout(resolve, 0));
      }
      return (c ^ 0xffffffff) >>> 0;
    };
    const u16 = (v) => [v & 255, (v >>> 8) & 255],
      u32 = (v) => [
        v & 255,
        (v >>> 8) & 255,
        (v >>> 16) & 255,
        (v >>> 24) & 255,
      ];
    for (const [name, value] of entries) {
      const n = enc.encode(name),
        data = typeof value === "string" ? enc.encode(value) : value;
      if (
        n.length > 65535 ||
        data.length > 0xffffffff ||
        offset > 0xffffffff - data.length - 30 - n.length
      )
        throw Error("This project exceeds the browser ZIP format size limit.");
      const sum = await crc(data);
      const head = new Uint8Array([
        ...u32(0x04034b50),
        ...u16(20),
        ...u16(0x0800),
        ...u16(0),
        ...u16(0),
        ...u16(0x21),
        ...u32(sum),
        ...u32(data.length),
        ...u32(data.length),
        ...u16(n.length),
        ...u16(0),
        ...n,
      ]);
      chunks.push(head, data);
      files.push({ n, sum, size: data.length, offset });
      offset += head.length + data.length;
      onProgress(`Packaging project (${files.length}/${entries.length})…`);
      if (files.length % 8 === 0)
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
    const central = [];
    for (const f of files)
      central.push(
        new Uint8Array([
          ...u32(0x02014b50),
          ...u16(20),
          ...u16(20),
          ...u16(0x0800),
          ...u16(0),
          ...u16(0),
          ...u16(0x21),
          ...u32(f.sum),
          ...u32(f.size),
          ...u32(f.size),
          ...u16(f.n.length),
          ...u16(0),
          ...u16(0),
          ...u16(0),
          ...u16(0),
          ...u32(0),
          ...u32(f.offset),
          ...f.n,
        ]),
      );
    const centralSize = central.reduce((a, x) => a + x.length, 0),
      end = new Uint8Array([
        ...u32(0x06054b50),
        ...u16(0),
        ...u16(0),
        ...u16(files.length),
        ...u16(files.length),
        ...u32(centralSize),
        ...u32(offset),
        ...u16(0),
      ]);
    if (offset + centralSize + end.length > 0xffffffff)
      throw Error("This project exceeds the browser ZIP format size limit.");
    return new Blob([...chunks, ...central, end], {
      type: "application/vnd.layerling.project",
    });
  }
  async function convertTinkercadToLayerling(
    input,
    projectName = "Tinkercad design",
    { onProgress = () => {} } = {},
  ) {
    const nodes = Array.isArray(input) ? input : input?.shapes,
      meshes = input?.meshes || {};
    if (!Array.isArray(nodes))
      throw Error("The selected file is not a Tinkercad export.");
    if (input.format && input.format !== "tinkercad-evaluated-world-v1")
      throw Error(
        "Unsupported capture format; export again with the current bookmark.",
      );
    if (!root.crypto?.subtle)
      throw Error(
        "This browser requires HTTPS or the downloaded HTML page for local conversion.",
      );
    if (typeof meshes !== "object" || Array.isArray(meshes))
      throw Error("Meshes must be a table keyed by source identity.");
    const meshFor = (id) =>
      Object.prototype.hasOwnProperty.call(meshes, id) ? meshes[id] : null;
    const identities = new Set();
    const validateNodes = (items) => {
      if (!Array.isArray(items)) throw Error("Shape children must be a list.");
      for (const node of items) {
        if (!node || typeof node !== "object" || Array.isArray(node))
          throw Error("Each source shape must be an object.");
        if (node.tags?.preview) continue;
        const id = node.versions_id;
        if (typeof id !== "string" || !id || identities.has(id))
          throw Error("Missing or repeated source shape identity: " + id);
        identities.add(id);
        validateNodes(node.children === undefined ? [] : node.children);
      }
    };
    validateNodes(nodes);
    const pause = () => new Promise((resolve) => setTimeout(resolve, 0));
    let completed = 0;
    onProgress("Checking geometry…");
    await pause();
    for (const [id, m] of Object.entries(meshes)) validateMesh(m, id);
    const seen = new Set(),
      ids = new Set(),
      assets = [],
      binary = new Map();
    const unique = (raw) => {
      let base =
          String(raw || "shape").replace(/[^\p{L}\p{N}]/gu, "-") || "shape",
        id = base,
        i = 2;
      while (ids.has(id)) id = base + "-" + i++;
      ids.add(id);
      return id;
    };
    const addMesh = (name, p, n, w, d, h) => {
      if (16 + (p.length + (n?.length || 0)) * 8 > 0xffffffff)
        throw Error("A mesh exceeds the browser ZIP format size limit.");
      const bytes = new Uint8Array(16 + (p.length + (n?.length || 0)) * 8),
        view = new DataView(bytes.buffer);
      bytes.set([76, 89, 76, 77, 83, 72, 49, 0]);
      view.setUint32(8, p.length, true);
      view.setUint32(12, n?.length || 0, true);
      let at = 16;
      for (const x of p) {
        view.setFloat64(at, x === 0 ? 0 : x, true);
        at += 8;
      }
      if (n)
        for (const x of n) {
          view.setFloat64(at, x === 0 ? 0 : x, true);
          at += 8;
        }
      return crypto.subtle.digest("SHA-256", bytes).then((hash) => {
        const hex = [...new Uint8Array(hash)]
            .map((x) => x.toString(16).padStart(2, "0"))
            .join(""),
          id = "mesh-" + hex.slice(0, 16);
        if (!binary.has(id)) {
          const path = `assets/derived-mesh/${id}.bin`;
          binary.set(id, bytes);
          assets.push({
            id,
            kind: "derived-mesh",
            path,
            mediaType: "application/vnd.layerling.mesh",
            byteLength: bytes.length,
            sha256: hex,
            fileName: name,
          });
        }
        return {
          meshAssetId: id,
          baseWidth: w,
          baseDepth: d,
          baseHeight: h,
          triangleCount: p.length / 9,
          sourceFormat: "json",
        };
      });
    };
    const mkNode = async (node, parentColor = null, parentHole = false) => {
      if (!node || node.tags?.preview) return null;
      const raw = String(node.versions_id || "");
      if (!raw || seen.has(raw))
        throw Error("Missing or repeated source shape identity: " + raw);
      seen.add(raw);
      const tags = node.tags || {},
        own = colorOf(tags.renderingMaterial?.color),
        hole = parentHole || tags.volumePolarity === -1,
        csg = node.dataType === "csg";
      const kids = [];
      let groupMesh = null,
        bundle = false,
        name,
        col;
      if (csg) {
        bundle = node.params?.groupType === 0;
        name = tags.label || (bundle ? "Bundle" : "Group");
        col = own && own !== "#dde2e4" ? own : parentColor || own;
        const rawKids = visibleChildren(node),
          childColor = parentColor || (tags.isMulticolor ? null : own || null);
        const childHole =
          hole && rawKids.every((x) => x.tags?.volumePolarity !== -1);
        for (const child of rawKids) {
          const c = await mkNode(child, childColor, childHole);
          if (c) kids.push(c);
        }
        if (!kids.length) return null;
        if (!bundle) {
          groupMesh = meshFor(raw);
          if (!groupMesh)
            throw Error(raw + ": missing evaluated boolean mesh; export again");
        }
      } else {
        name =
          tags.label ||
          node.params?.fileName ||
          node.params?.id ||
          node.dataType;
        col = parentColor || own || "#d41721";
      }
      const m = csg ? (bundle ? null : groupMesh) : meshFor(raw);
      if (!csg && !m)
        throw Error(raw + ": missing evaluated world mesh; export again");
      let b,
        x,
        z,
        elevation,
        w,
        d,
        h,
        ref = null;
      if (m) {
        const p = yUpVectors(m.positions);
        b = bounds(p);
        x = (b[0] + b[1]) / 2;
        z = (b[4] + b[5]) / 2;
        elevation = b[2];
        w = positive(b[1] - b[0]);
        h = positive(b[3] - b[2]);
        d = positive(b[5] - b[4]);
        const local = new Array(p.length);
        for (let i = 0; i < p.length; i += 3) {
          local[i] = p[i] - x;
          local[i + 1] = p[i + 1] - elevation;
          local[i + 2] = p[i + 2] - z;
        }
        const normals = m.normals == null ? null : yUpVectors(m.normals);
        ref = await addMesh(name, local, normals, w, d, h);
      } else {
        b = unionBounds(kids);
        x = (b[0] + b[1]) / 2;
        z = (b[4] + b[5]) / 2;
        elevation = b[2];
        w = positive(b[1] - b[0]);
        h = positive(b[3] - b[2]);
        d = positive(b[5] - b[4]);
      }
      if (csg)
        for (const k of kids) {
          k.x -= x;
          k.z -= z;
          k.elevation -= elevation;
        }
      const shape = {
        id: unique(raw),
        name: String(name || "Shape").slice(0, 80) || "Shape",
        kind: "mesh",
        color: col,
        x,
        z,
        elevation,
        size: Math.max(w, d),
        width: w,
        depth: d,
        height: h,
        rotation: 0,
        rotationX: 0,
        rotationZ: 0,
        _children: kids,
        _objectType: csg ? "group" : "imported",
        _bounds: b,
      };
      if (hole) shape.hole = true;
      if (tags.visible === false) shape.hidden = true;
      if (csg) {
        shape.groupOperation = bundle ? "bundle" : "group";
        shape.groupedBaseWidth = w;
        shape.groupedBaseDepth = d;
        shape.groupedBaseHeight = h;
        shape.multicolor = true;
        if (ref) {
          const colors = new Set(
            kids.filter((k) => !k.hole && !k.hidden).map((k) => k.color),
          );
          if (colors.size <= 1) {
            shape.multicolor = false;
            if (colors.size) shape.color = [...colors][0];
          }
        }
      }
      if (ref) shape._meshRef = ref;
      shape._sourceId = raw;
      completed++;
      onProgress(`Converting parts (${completed}/${identities.size})…`);
      if (completed % 8 === 0) await pause();
      return shape;
    };
    const shapes = [];
    for (const node of nodes) {
      const s = await mkNode(node);
      if (s) shapes.push(s);
    }
    if (!shapes.length) throw Error("No shapes to convert.");
    // Hide only complete, identical triangle surfaces within a root. Keep the
    // earlier copy in the editable tree and let the last source material render.
    onProgress("Checking overlapping surfaces…");
    await pause();
    let checkedSurfaces = 0;
    for (const rootShape of shapes) {
      const surfaces = new Map();
      const visitShape = async (s) => {
        if (++checkedSurfaces % 8 === 0) {
          onProgress(`Checking surfaces (${checkedSurfaces})…`);
          await pause();
        }
        if (s.hidden || s.hole) return;
        if (s._meshRef) {
          const m = meshFor(s._sourceId);
          if (!m) return;
          const key = m.positions.length + ":" + Boolean(s.transparent),
            prior = surfaces.get(key) || [];
          const b = bounds(m.positions);
          let sig = null;
          for (const prev of prior) {
            if (
              b.some((v, i) => Math.abs(v - prev.bounds[i]) > 1e-5) ||
              (m.normals?.length || 0) !== (prev.mesh.normals?.length || 0)
            )
              continue;
            let same =
              equalNumbers(m.positions, prev.mesh.positions) &&
              equalNumbers(m.normals || [], prev.mesh.normals || []);
            if (!same) {
              if (sig === null) sig = canonicalTriangles(m);
              if (prev.signature === null)
                prev.signature = canonicalTriangles(prev.mesh);
              same = equalNumbers(sig, prev.signature);
            }
            if (!same && !m.normals?.length)
              same = await sameConvexSurface(m.positions, prev.mesh.positions);
            if (same) {
              prev.shape.hidden = true;
              prev.shape = s;
              prev.bounds = b;
              prev.mesh = m;
              prev.signature = sig;
              return;
            }
          }
          prior.push({ shape: s, bounds: b, mesh: m, signature: sig });
          surfaces.set(key, prior);
          return;
        }
        for (const child of s._children) await visitShape(child);
      };
      await visitShape(rootShape);
      await pause();
    }
    const stateNodes = [];
    function emit(s, path) {
      const nodeId = path + "/" + s.id,
        childIds = s._children.map((c) => emit(c, nodeId + "/group"));
      const def = {};
      for (const [k, v] of Object.entries(s))
        if (!k.startsWith("_") && k !== "_children") def[k] = v;
      const n = {
        nodeId,
        objectId: s.id,
        objectType: s._objectType,
        workplaneId: "base",
        definition: def,
      };
      if (childIds.length) n.groupedShapeNodeIds = childIds;
      if (s._meshRef) n.importedMesh = s._meshRef;
      stateNodes.push(n);
      return nodeId;
    }
    const rootIds = shapes.map((s) => emit(s, "scene/object"));
    stateNodes.sort((a, b) =>
      a.nodeId < b.nodeId ? -1 : a.nodeId > b.nodeId ? 1 : 0,
    );
    const byId = new Map(stateNodes.map((n) => [n.nodeId, n])),
      features = [],
      groups = [],
      last = new Map(),
      visit = (id) => {
        const n = byId.get(id),
          children = n.groupedShapeNodeIds || [];
        children.forEach(visit);
        if (!children.length) return;
        const defs = children.map((c) => byId.get(c).definition),
          operation =
            n.definition.groupOperation === "bundle"
              ? "group"
              : defs.some((d) => d.hole) && defs.some((d) => !d.hole)
                ? "boolean-subtraction"
                : "group",
          fid = `feature/${id}/${operation}`;
        features.push({
          id: fid,
          type: operation,
          outputObjectId: n.objectId,
          inputObjectIds: defs.map((d) => d.id),
          dependsOnFeatureIds: children
            .filter((c) => last.has(c))
            .map((c) => last.get(c)),
        });
        groups.push({
          id: `group/${n.objectId}`,
          nodeId: id,
          objectId: n.objectId,
          memberNodeIds: children,
          operation,
        });
        last.set(id, fid);
      };
    rootIds.forEach(visit);
    const sceneBounds = unionBounds(shapes),
      bb = [sceneBounds[0], sceneBounds[1], sceneBounds[4], sceneBounds[5]];
    const span = Math.max(
        200,
        bb[1] - bb[0] + 40,
        bb[3] - bb[2] + 40,
        Math.abs(bb[0]) * 2 + 40,
        Math.abs(bb[1]) * 2 + 40,
        Math.abs(bb[2]) * 2 + 40,
        Math.abs(bb[3]) * 2 + 40,
      ),
      plate = Math.ceil(span / 10) * 10,
      now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const doc = {
      schema: "com.layerling.project",
      formatVersion: 2,
      minimumReaderVersion: 2,
      createdWithVersion: "tinkercad-import",
      metadata: {
        projectName: projectName,
        units: "mm",
        createdAt: now,
        modifiedAt: now,
      },
      assets,
      sceneStateId: "scene",
      states: [{ id: "scene", rootNodeIds: rootIds, nodes: stateNodes }],
      history: {
        entries: [{ stateId: "scene", selectedObjectIds: [], recordedAt: now }],
        index: 0,
      },
      sketches: [],
      features,
      groups,
      workplanes: [{ id: "workplane-base", kind: "base", elevation: 0 }],
      exactCad: [],
      editor: {
        workspace: {
          width: plate,
          depth: plate,
          sizePreset: `${plate} x ${plate} mm`,
          units: "Metric (Default)",
          scale: "1:1 (millimeters)",
          showGrid: true,
          showAxes: true,
          edgeLines: true,
        },
        snapGrid: "1.0 mm",
        selectedWorkplaneId: "workplane-base",
        placementElevation: 0,
      },
    };
    onProgress("Preparing Layerling download…");
    await pause();
    const entries = [
      ["project.json", JSON.stringify(doc)],
      ...assets.map((a) => [a.path, binary.get(a.id)]),
    ];
    return zipStore(entries, onProgress);
  }
  root.convertTinkercadToLayerling = convertTinkercadToLayerling;
})(globalThis);
