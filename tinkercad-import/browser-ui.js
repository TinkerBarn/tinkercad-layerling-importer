/* Shared browser download controls and the Tinkercad bookmark entry point. */
(function (root) {
  "use strict";
  function projectName(title) {
    return (
      String(title || "")
        .replace(/^3D design\s+/i, "")
        .replace(/\s*[-|]\s*Tinkercad\s*$/i, "")
        .trim() || "Tinkercad design"
    );
  }

  function setDownload(link, blob, name) {
    const url = URL.createObjectURL(blob);
    const filename =
      String(name)
        .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-")
        .slice(0, 120)
        .replace(/[. ]+$/, "") || "Tinkercad design";
    link.href = url;
    link.download = filename + ".lyl";
    link.hidden = false;
    link.style.display = "inline-block";
    return () => {
      URL.revokeObjectURL(url);
      link.hidden = true;
      link.style.display = "none";
      link.removeAttribute("href");
    };
  }

  function createPanel() {
    const panel = document.createElement("section");
    panel.setAttribute("aria-label", "Tinkercad to layerling import");
    panel.tabIndex = -1;
    panel.style.cssText =
      "position:fixed;right:20px;top:20px;z-index:2147483647;max-width:360px;padding:18px;background:#fff;color:#222;border:2px solid #1473e6;border-radius:10px;box-shadow:0 4px 24px #0004;font:15px/1.5 system-ui,sans-serif";
    const title = document.createElement("strong");
    title.textContent = "Tinkercad → layerling";
    const status = document.createElement("p");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    const link = document.createElement("a");
    link.textContent = "Download .lyl again";
    link.style.cssText =
      "color:#075ac1;text-decoration:underline;margin:10px 12px 10px 0";
    link.hidden = true;
    link.style.display = "none";
    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "Close";
    close.disabled = true;
    panel.append(title, status, link, close);
    document.body.append(panel);
    return { panel, status, link, close };
  }

  async function runLayerlingImport() {
    const previous = root.__layerlingImportSession;
    if (previous?.busy) {
      previous.panel.focus();
      return previous.promise;
    }
    if (
      !["www.tinkercad.com", "tinkercad.com"].includes(location.hostname) ||
      !/^\/things\/[^/]+\/edit(?:\/|$)/.test(location.pathname)
    ) {
      alert(
        "Open your design in the Tinkercad editor, then click this bookmark.",
      );
      return;
    }
    previous?.dispose();
    const view = createPanel();
    let releaseDownload = () => {};
    const session = {
      busy: true,
      disposed: false,
      panel: view.panel,
      promise: null,
      dispose() {
        session.disposed = true;
        releaseDownload();
        view.panel.remove();
        root.removeEventListener?.("pagehide", session.dispose);
        if (root.__layerlingImportSession === session)
          delete root.__layerlingImportSession;
      },
    };
    root.__layerlingImportSession = session;
    root.addEventListener?.("pagehide", session.dispose);
    view.close.addEventListener("click", session.dispose);
    const progress = (message) => {
      if (session.disposed) throw Error("Import closed.");
      view.status.textContent = message;
    };
    session.promise = (async () => {
      try {
        progress("Capturing the open design…");
        await new Promise((resolve) => setTimeout(resolve, 0));
        if (session.disposed) return;
        root.exportTinkercadDesign = exportTinkercadDesign;
        const capture = await exportTinkercadDesign({
          download: false,
          onProgress: progress,
        });
        if (session.disposed) return;
        if (!capture) {
          progress(
            "Editor tools enabled. Click the bookmark again after the design reloads.",
          );
          return;
        }
        const name = projectName(document.title);
        const blob = await convertTinkercadToLayerling(capture, name, {
          onProgress: progress,
        });
        if (session.disposed) return;
        releaseDownload = setDownload(view.link, blob, name);
        const skipped = capture.failures || [];
        const warning = skipped.length
          ? " " +
            skipped.length +
            " shape(s) or group(s) were skipped because Tinkercad could not evaluate their geometry."
          : "";
        progress(
          "Project ready." +
            warning +
            " Open the downloaded .lyl in layerling. If the download did not start, use the link below.",
        );
        try {
          view.link.click();
        } catch (_) {
          /* The retained link allows a user gesture to retry. */
        }
      } catch (error) {
        if (session.disposed) return;
        console.error("Tinkercad import failed:", error);
        progress(
          "Import failed: " +
            (error?.message || error) +
            ". Close this panel to retry.",
        );
      } finally {
        session.busy = false;
        view.close.disabled = false;
      }
    })();
    return session.promise;
  }

  root.layerlingImportUI = { projectName, setDownload };
  root.runLayerlingImport = runLayerlingImport;
})(globalThis);
