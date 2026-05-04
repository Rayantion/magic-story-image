const App = (() => {
  const WEBHOOK_URL =
    "https://n8n.rayantion.me/webhook/e98c0572-0b47-40c9-b830-db97d4676521/";

  let generations = [];

  const $ = (id) => document.getElementById(id);

  function init() {
    DrawCanvas.init();
    I18N.apply();

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

    $("description-input").addEventListener("input", updateGenerateButton);
    DrawCanvas.onChange(updateGenerateButton);
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
    const id = Date.now() + Math.random().toString(36).slice(2, 8);

    generations.unshift({
      id,
      drawingDataUrl,
      description,
      status: "generating",
      generatedImageUrl: null,
      error: null,
    });

    DrawCanvas.clear();
    $("description-input").value = "";

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
          payload.imageUrl ||
          payload.myField ||
          payload.url ||
          "";
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

  function renderGallery() {
    const grid = $("gallery-grid");
    const empty = $("gallery-empty");

    if (generations.length === 0) {
      grid.textContent = "";
      empty.classList.remove("hidden");
      return;
    }

    empty.classList.add("hidden");
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
      const drawingImg = document.createElement("img");
      drawingImg.src = g.drawingDataUrl;
      drawingImg.alt = "Drawing";
      const drawingLabel = document.createElement("span");
      drawingLabel.className = "img-label";
      drawingLabel.textContent = I18N.t("gallery.drawn");
      drawingWrap.appendChild(drawingImg);
      drawingWrap.appendChild(drawingLabel);
      imagesDiv.appendChild(drawingWrap);

      // AI image / loading / error
      const aiWrap = document.createElement("div");
      aiWrap.className = "img-wrap";

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
          // Re-encode the stored drawing for retry
          const base64 = gen.drawingDataUrl.split(",")[1];
          gen.status = "generating";
          gen.error = null;
          renderGallery();
          callWebhook(gen.id, base64, gen.description, I18N.getLang());
        });
        actionsDiv.appendChild(retryBtn);
      }

      if (g.generatedImageUrl && isSafeUrl(g.generatedImageUrl)) {
        const downloadLink = document.createElement("a");
        downloadLink.className = "btn-small";
        downloadLink.href = g.generatedImageUrl;
        downloadLink.download = "magic-story-image.png";
        downloadLink.textContent = "Download";
        actionsDiv.appendChild(downloadLink);
      }

      if (actionsDiv.children.length > 0) {
        card.appendChild(actionsDiv);
      }

      grid.appendChild(card);
    });
  }

  document.addEventListener("DOMContentLoaded", init);
  return { init };
})();
