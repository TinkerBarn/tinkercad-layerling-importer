/* Optional online loader. The self-contained bookmark remains available offline. */
(function (root) {
  "use strict";
  root.layerlingLoadLatest = function () {
    if (!["www.tinkercad.com","tinkercad.com"].includes(location.hostname) ||
        !/^\/things\/[^/]+\/edit(?:\/|$)/.test(location.pathname)) {
      alert("Open your design in the Tinkercad editor, then click this bookmark.");
      return;
    }
    if (root.__layerlingImportSession?.busy) {
      alert("Wait for the current export to finish, or cancel it before updating.");
      return;
    }
    if (root.__layerlingLoaderActive) return;
    root.__layerlingLoaderActive = true;
    root.__layerlingRuntimeLoaded = false;
    const script = document.createElement("script");
    let done = false;
    const finish = success => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      script.remove();
      root.__layerlingLoaderActive = false;
      if (success && root.__layerlingRuntimeLoaded && typeof root.runLayerlingImport === "function") void root.runLayerlingImport();
      else alert("Online importer blocked or unavailable. Use the self-contained bookmark from https://taylormadearmy.github.io/tinkercad-layerling-importer/ .");
    };
    const timer = setTimeout(() => finish(false),15000);
    script.referrerPolicy = "no-referrer";
    script.src = "https://taylormadearmy.github.io/tinkercad-layerling-importer/importer.js?t=" + Date.now();
    script.onload = () => finish(true);
    script.onerror = () => finish(false);
    try {document.head.append(script);} catch (_) {finish(false);}
  };
})(globalThis);
