const App = (() => {
  const WEBHOOK_URL =
    "https://n8n.rayantion.me/webhook/e98c0572-0b47-40c9-b830-db97d4676521/";
  const DB_NAME = "magic-story-image";
  const DB_STORE = "generations";
  const DB_VERSION = 1;
  const CACHE_LIMIT = 20;

  let generations = [];
  let db = null;
  let compareIndex = 0;

  const $ = (id) => document.getElementById(id);

  async function init() {
    DrawCanvas.init();
    I18N.apply();

    db = await openDB();
    generations = await loadGenerations();
    renderGallery();

    const savedLang = localStorage.getItem("msi_lang") || "zh-TW";
    I18N.setLang(savedLang);
    document.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.lang === savedLang);
      btn.addEventListener("click", () => {
        I18N.setLang(btn.dataset.lang);
        document
          .querySelectorAll(".lang-btn")
          .forEach((b) => b.classList.toggle("active", b === btn));
      });
    });

    $("btn-generate").addEventListener("click", startGeneration);
    $("btn-generate").disabled = true;
    $("btn-dismiss-error").addEventListener("click", () =>
      $("error-banner").classList.add("hidden"),
    );

    // Contact
    $("btn-contact").addEventListener("click", morphContactButton);

    $("description-input").addEventListener("input", updateGenerateButton);
    DrawCanvas.onChange(updateGenerateButton);

    // Clear history
    $("btn-clear-history").addEventListener("click", clearHistory);

    // Comparison viewer
    $("btn-compare-close").addEventListener("click", closeCompare);
    $("btn-show-drawing").addEventListener("click", () => showCompareSide(0));
    $("btn-show-ai").addEventListener("click", () => showCompareSide(1));
    $("btn-compare-download").addEventListener("click", downloadCompareImage);
    $("compare-overlay").addEventListener("click", (e) => {
      if (e.target.id === "compare-overlay") closeCompare();
    });

    // Swipe support for comparison
    let touchStartX = 0;
    $("compare-overlay").addEventListener("touchstart", (e) => {
      touchStartX = e.changedTouches[0].screenX;
    });
    $("compare-overlay").addEventListener("touchend", (e) => {
      const diff = e.changedTouches[0].screenX - touchStartX;
      if (Math.abs(diff) > 50) {
        showCompareSide(diff > 0 ? 0 : 1);
      }
    });

    // Keyboard arrows for comparison
    document.addEventListener("keydown", (e) => {
      if ($("compare-overlay").classList.contains("hidden")) return;
      if (e.key === "ArrowLeft") showCompareSide(0);
      if (e.key === "ArrowRight") showCompareSide(1);
      if (e.key === "Escape") closeCompare();
    });
  }

  function updateGenerateButton() {
    const hasDesc = $("description-input").value.trim().length > 0;
    const hasDrawing = DrawCanvas.hasContent();
    $("btn-generate").disabled = !(hasDesc && hasDrawing);
  }

  function showError(msg) {
    $("error-text").textContent = msg;
    $("error-banner").classList.remove("hidden");
    setTimeout(() => {
      $("error-banner").classList.add("hidden");
    }, 5000);
  }

  function isSafeUrl(url) {
    if (!url || typeof url !== "string") return false;
    return (
      url.startsWith("http://") ||
      url.startsWith("https://") ||
      url.startsWith("blob:") ||
      url.startsWith("data:")
    );
  }

  function startGeneration() {
    const description = $("description-input").value.trim();
    if (!description) {
      showError(I18N.t("error.generic"));
      return;
    }

    const drawingDataUrl = DrawCanvas.toDataURL();
    const base64 = DrawCanvas.toBase64();
    const id = Date.now().toString();

    generations.unshift({
      id,
      drawingDataUrl,
      description,
      status: "generating",
      generatedImageUrl: null,
      error: null,
      createdAt: Date.now(),
    });

    DrawCanvas.clear();
    $("description-input").value = "";
    updateGenerateButton();

    renderGallery();
    callWebhook(id, base64, description, I18N.getLang());
  }

  async function callWebhook(id, base64, description, language) {
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64,
          description: description,
          language: language,
        }),
      });

      if (!response.ok) {
        throw new Error(
          I18N.t("error.webhook") + " (HTTP " + response.status + ")",
        );
      }

      let imageUrl = "";
      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const data = await response.json();
        const payload =
          Array.isArray(data) && data.length > 0 && data[0].json
            ? data[0].json
            : data;
        imageUrl =
          payload.imageUrl || payload.myField || payload.url || "";
      } else if (
        contentType.includes("image/") ||
        contentType.includes("octet-stream")
      ) {
        const blob = await response.blob();
        imageUrl = URL.createObjectURL(blob);
      }

      if (!isSafeUrl(imageUrl)) {
        throw new Error(I18N.t("error.webhook"));
      }

      const gen = generations.find((g) => g.id === id);
      if (gen) {
        gen.status = "done";
        gen.generatedImageUrl = imageUrl;
        await saveGeneration(gen);
        renderGallery();
      }
    } catch (err) {
      const gen = generations.find((g) => g.id === id);
      if (gen) {
        gen.status = "error";
        gen.error = err.message || I18N.t("error.generic");
        renderGallery();
      }
    }
  }

  // === IndexedDB ===

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains(DB_STORE)) {
          d.createObjectStore(DB_STORE, { keyPath: "id" });
        }
      };
    });
  }

  function saveGeneration(gen) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      const store = tx.objectStore(DB_STORE);
      store.put(gen);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  function loadGenerations() {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readonly");
      const store = tx.objectStore(DB_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const all = req.result;
        all.sort((a, b) => b.createdAt - a.createdAt);
        // Only keep completed ones in cache, limit to 20
        const completed = all
          .filter((g) => g.status === "done")
          .slice(0, CACHE_LIMIT);
        resolve(completed);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async function clearHistory() {
    const tx = db.transaction(DB_STORE, "readwrite");
    const store = tx.objectStore(DB_STORE);
    await new Promise((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = resolve;
      req.onerror = () => reject(req.error);
    });
    generations = [];
    renderGallery();
  }

  function deleteGeneration(id) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      const store = tx.objectStore(DB_STORE);
      const req = store.delete(id);
      req.onsuccess = resolve;
      req.onerror = () => reject(req.error);
    });
  }

  // === Gallery Rendering ===

  function renderGallery() {
    const grid = $("gallery-grid");
    const empty = $("gallery-empty");
    const clearBtn = $("btn-clear-history");

    if (generations.length === 0) {
      grid.textContent = "";
      empty.classList.remove("hidden");
      clearBtn.classList.add("hidden");
      return;
    }

    empty.classList.add("hidden");
    clearBtn.classList.remove("hidden");
    grid.textContent = "";

    generations.forEach((g) => {
      const card = document.createElement("div");
      card.className = "gallery-card";
      card.dataset.id = g.id;

      // Images container
      const imagesDiv = document.createElement("div");
      imagesDiv.className = "card-images";

      // Original drawing
      const drawingWrap = document.createElement("div");
      drawingWrap.className = "img-wrap";
      drawingWrap.style.cursor = "pointer";
      const drawingImg = document.createElement("img");
      drawingImg.src = g.drawingDataUrl;
      drawingImg.alt = "Drawing";
      const drawingLabel = document.createElement("span");
      drawingLabel.className = "img-label";
      drawingLabel.textContent = I18N.t("gallery.drawn");
      drawingWrap.appendChild(drawingImg);
      drawingWrap.appendChild(drawingLabel);
      drawingWrap.addEventListener("click", () => openCompare(g.id));
      imagesDiv.appendChild(drawingWrap);

      // AI image / loading / error
      const aiWrap = document.createElement("div");
      aiWrap.className = "img-wrap";
      aiWrap.style.cursor = g.status === "done" ? "pointer" : "default";

      if (g.status === "generating") {
        const loadingDiv = document.createElement("div");
        loadingDiv.className = "loading-animation";
        ["", "", ""].forEach(() => {
          const dot = document.createElement("span");
          dot.className = "dot";
          loadingDiv.appendChild(dot);
        });
        aiWrap.appendChild(loadingDiv);
      } else if (g.status === "error") {
        const errorDiv = document.createElement("div");
        errorDiv.style.cssText =
          "display:flex;align-items:center;justify-content:center;height:100%;color:var(--accent-pink);font-size:0.85rem;font-weight:600;text-align:center;padding:1rem;";
        errorDiv.textContent = I18N.t("gallery.error");
        aiWrap.appendChild(errorDiv);
      } else if (g.generatedImageUrl && isSafeUrl(g.generatedImageUrl)) {
        const aiImg = document.createElement("img");
        aiImg.src = g.generatedImageUrl;
        aiImg.alt = "AI Image";
        aiWrap.appendChild(aiImg);
      }

      if (g.status === "done") {
        aiWrap.addEventListener("click", () => openCompare(g.id));
      }

      const aiLabel = document.createElement("span");
      aiLabel.className = "img-label";
      aiLabel.textContent = I18N.t("gallery.ai_image");
      aiWrap.appendChild(aiLabel);
      imagesDiv.appendChild(aiWrap);
      card.appendChild(imagesDiv);

      // Info
      const infoDiv = document.createElement("div");
      infoDiv.className = "card-info";

      const descP = document.createElement("p");
      descP.className = "card-desc";
      descP.textContent = g.description;
      infoDiv.appendChild(descP);

      const statusDiv = document.createElement("div");
      statusDiv.className = "card-status";
      const dot = document.createElement("span");
      dot.className = "status-dot";
      if (g.status === "generating") dot.classList.add("loading");
      if (g.status === "error") dot.classList.add("error");
      const statusText = document.createElement("span");
      statusText.className = "status-text";
      statusText.textContent =
        g.status === "generating"
          ? I18N.t("gallery.generating")
          : g.status === "error"
            ? I18N.t("gallery.error")
            : I18N.t("gallery.drawn");
      statusDiv.appendChild(dot);
      statusDiv.appendChild(statusText);
      infoDiv.appendChild(statusDiv);
      card.appendChild(infoDiv);

      // Actions
      const actionsDiv = document.createElement("div");
      actionsDiv.className = "card-actions";

      if (g.status === "error") {
        const retryBtn = document.createElement("button");
        retryBtn.className = "btn-small";
        retryBtn.textContent = I18N.t("gallery.retry");
        retryBtn.addEventListener("click", () => {
          const gen = generations.find((item) => item.id === g.id);
          if (!gen || !gen.drawingDataUrl) return;
          const base64 = gen.drawingDataUrl.split(",")[1];
          gen.status = "generating";
          gen.error = null;
          renderGallery();
          callWebhook(gen.id, base64, gen.description, I18N.getLang());
        });
        actionsDiv.appendChild(retryBtn);
      }

      if (g.generatedImageUrl && isSafeUrl(g.generatedImageUrl)) {
        const downloadBtn = document.createElement("button");
        downloadBtn.className = "btn-small";
        downloadBtn.textContent = I18N.t("gallery.download");
        downloadBtn.addEventListener("click", () =>
          downloadImage(g.generatedImageUrl, "magic-story-image.png"),
        );
        actionsDiv.appendChild(downloadBtn);
      }

      if (actionsDiv.children.length > 0) {
        card.appendChild(actionsDiv);
      }

      grid.appendChild(card);
    });
  }

  // === Contact ===

  async function morphContactButton() {
    const btn = $("btn-contact");
    const originalText = I18N.t("contact.button");
    const email = "aaron@jieren.my.id";

    try {
      await navigator.clipboard.writeText(email);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = email;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }

    btn.textContent = email + " ✓";
    btn.classList.add("copied");

    setTimeout(() => {
      btn.textContent = originalText;
      btn.classList.remove("copied");
    }, 3000);
  }

  // === Direct Download ===

  async function downloadImage(url, filename) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      showError(I18N.t("error.generic"));
    }
  }

  // === Comparison Viewer ===

  function openCompare(id) {
    const gen = generations.find((g) => g.id === id);
    if (!gen) return;
    compareIndex = 0;
    $("compare-drawing").src = gen.drawingDataUrl;
    $("compare-ai").src = gen.generatedImageUrl || "";
    $("compare-overlay").classList.remove("hidden");
    showCompareSide(0);
  }

  function closeCompare() {
    $("compare-overlay").classList.add("hidden");
  }

  function showCompareSide(index) {
    compareIndex = index;
    $("compare-drawing-wrap").classList.toggle("active", index === 0);
    $("compare-ai-wrap").classList.toggle("active", index === 1);
    $("btn-show-drawing").classList.toggle("active", index === 0);
    $("btn-show-ai").classList.toggle("active", index === 1);
  }

  async function downloadCompareImage() {
    const isDrawing = compareIndex === 0;
    const src = isDrawing
      ? $("compare-drawing").src
      : $("compare-ai").src;
    if (!src) {
      showError(I18N.t("error.generic"));
      return;
    }

    const filename = isDrawing
      ? I18N.t("gallery.download_drawing") + ".png"
      : I18N.t("gallery.download_generated") + ".png";

    if (src.startsWith("data:")) {
      const a = document.createElement("a");
      a.href = src;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      await downloadImage(src, filename);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
  return { init };
})();
