const DrawCanvas = (() => {
  let canvas, ctx;
  let drawing = false;
  let erasing = false;
  let brushColor = "#2d2dff";
  let brushSize = 8;
  let lastX = 0,
    lastY = 0;
  let brushCursor;
  let undoStack = [];
  let redoStack = [];
  let hasDrawing = false;
  const MAX_HISTORY = 30;
  let onChangeCallback = null;

  function init() {
    canvas = document.getElementById("draw-canvas");
    ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Save blank state
    saveState(true);

    canvas.addEventListener("mousedown", startDraw);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDrawAndSave);
    canvas.addEventListener("mouseleave", stopDraw);

    canvas.addEventListener("touchstart", handleTouch, { passive: false });
    canvas.addEventListener("touchmove", handleTouch, { passive: false });
    canvas.addEventListener("touchend", stopDrawAndSave);

    brushCursor = document.createElement("div");
    brushCursor.className = "brush-cursor";
    document.body.appendChild(brushCursor);

    canvas.addEventListener("mouseenter", () =>
      brushCursor.classList.add("visible"),
    );
    canvas.addEventListener("mouseleave", () =>
      brushCursor.classList.remove("visible"),
    );
    canvas.addEventListener("mousemove", updateBrushCursor);

    document
      .getElementById("color-picker")
      .addEventListener("input", (e) => {
        brushColor = e.target.value;
        erasing = false;
        document.getElementById("btn-eraser").classList.remove("active");
        updateColorDots();
        updateBrushCursorStyle();
      });

    document.querySelectorAll(".color-dot").forEach((dot) => {
      dot.addEventListener("click", () => {
        brushColor = dot.dataset.color;
        document.getElementById("color-picker").value = brushColor;
        erasing = false;
        document.getElementById("btn-eraser").classList.remove("active");
        updateColorDots();
        updateBrushCursorStyle();
      });
    });

    document.getElementById("brush-size").addEventListener("input", (e) => {
      brushSize = parseInt(e.target.value);
      updateBrushCursorStyle();
    });

    document.getElementById("btn-eraser").addEventListener("click", () => {
      erasing = !erasing;
      document
        .getElementById("btn-eraser")
        .classList.toggle("active", erasing);
      updateColorDots();
      updateBrushCursorStyle();
    });

    document.getElementById("btn-clear").addEventListener("click", () => {
      saveState();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    });

    document.getElementById("btn-undo").addEventListener("click", undo);
    document.getElementById("btn-redo").addEventListener("click", redo);

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      const isTextInput =
        e.target.tagName === "TEXTAREA" ||
        e.target.tagName === "INPUT" ||
        e.target.isContentEditable;
      if (isTextInput) return;

      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        redo();
      }
    });

    // Upload
    const fileInput = document.getElementById("file-upload");
    document.getElementById("btn-upload").addEventListener("click", () => {
      fileInput.click();
    });
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) loadImage(file);
      fileInput.value = "";
    });

    updateBrushCursorStyle();
    updateColorDots();
    updateUndoRedoButtons();
  }

  function saveState(skipRedoClear) {
    undoStack.push(canvas.toDataURL("image/png"));
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    if (!skipRedoClear) redoStack = [];
    updateUndoRedoButtons();
  }

  function undo() {
    if (undoStack.length <= 1) return;
    const current = undoStack.pop();
    redoStack.push(current);
    restoreState(undoStack[undoStack.length - 1]);
    updateUndoRedoButtons();
  }

  function redo() {
    if (redoStack.length === 0) return;
    const next = redoStack.pop();
    undoStack.push(next);
    restoreState(next);
    updateUndoRedoButtons();
  }

  function restoreState(dataUrl) {
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      notifyChange();
    };
    img.src = dataUrl;
  }

  function updateUndoRedoButtons() {
    const undoBtn = document.getElementById("btn-undo");
    const redoBtn = document.getElementById("btn-redo");
    if (undoBtn) undoBtn.disabled = undoStack.length <= 1;
    if (redoBtn) redoBtn.disabled = redoStack.length === 0;
  }

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function startDraw(e) {
    drawing = true;
    const pos = getPos(e);
    lastX = pos.x;
    lastY = pos.y;
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
  }

  function draw(e) {
    if (!drawing) return;
    const pos = getPos(e);
    ctx.strokeStyle = erasing ? "#ffffff" : brushColor;
    ctx.lineWidth = erasing ? brushSize * 3 : brushSize;
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastX = pos.x;
    lastY = pos.y;
    if (!hasDrawing) {
      hasDrawing = true;
      notifyChange();
    }
  }

  function stopDraw() {
    drawing = false;
  }

  function stopDrawAndSave() {
    if (!drawing) return;
    drawing = false;
    saveState();
  }

  function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent(
      e.type === "touchstart" ? "mousedown" : "mousemove",
      { clientX: touch.clientX, clientY: touch.clientY },
    );
    canvas.dispatchEvent(mouseEvent);
  }

  function updateColorDots() {
    document.querySelectorAll(".color-dot").forEach((d) => {
      d.classList.toggle("active", d.dataset.color === brushColor && !erasing);
    });
  }

  function updateBrushCursor(e) {
    if (!brushCursor) return;
    const size = erasing ? brushSize * 3 : brushSize;
    const radius = size / 2;
    brushCursor.style.left = e.clientX - radius + "px";
    brushCursor.style.top = e.clientY - radius + "px";
  }

  function updateBrushCursorStyle() {
    if (!brushCursor) return;
    const size = erasing ? brushSize * 3 : brushSize;
    brushCursor.style.width = size + "px";
    brushCursor.style.height = size + "px";
    brushCursor.style.borderColor = erasing ? "#ff4444" : brushColor;
  }

  function clear() {
    saveState();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    hasDrawing = false;
    notifyChange();
  }

  function loadImage(file) {
    saveState();
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const scale = Math.min(
          canvas.width / img.width,
          canvas.height / img.height,
        );
        const x = (canvas.width - img.width * scale) / 2;
        const y = (canvas.height - img.height * scale) / 2;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        hasDrawing = true;
        notifyChange();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function toBase64() {
    return canvas.toDataURL("image/png").split(",")[1];
  }

  function toDataURL() {
    return canvas.toDataURL("image/png");
  }

  function hasContent() {
    return hasDrawing;
  }

  function onChange(cb) {
    onChangeCallback = cb;
  }

  function notifyChange() {
    if (onChangeCallback) onChangeCallback();
  }

  return { init, clear, loadImage, toBase64, toDataURL, hasContent, onChange };
})();
