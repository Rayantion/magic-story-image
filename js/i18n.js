const I18N = (() => {
  const strings = {
    en: {
      "app.title": "Magic Story Image",
      "app.subtitle": "Draw a picture, get an AI illustration!",
      "draw.size": "Size",
      "draw.eraser": "Eraser",
      "draw.clear": "Clear",
      "draw.upload": "Upload",
      "draw.description_label": "Describe your drawing",
      "draw.description": "e.g. A dragon flying over a rainbow castle",
      "draw.generate": "Generate My Image",
      "gallery.title": "Your Generated Images",
      "gallery.empty": "No images yet — draw something and click Generate!",
      "gallery.generating": "Creating your image...",
      "gallery.error": "Oops! Something went wrong.",
      "gallery.retry": "Retry",
      "gallery.drawn": "Your Drawing",
      "gallery.ai_image": "AI Illustration",
      "error.generic": "Something went wrong. Please try again.",
      "error.network": "Network error. Check your connection.",
      "error.webhook": "Image generation failed. Please try again.",
    },
    "zh-TW": {
      "app.title": "魔法故事圖片",
      "app.subtitle": "畫一幅畫，獲得 AI 插圖！",
      "draw.size": "大小",
      "draw.eraser": "橡皮擦",
      "draw.clear": "清除",
      "draw.upload": "上傳",
      "draw.description_label": "描述你的畫",
      "draw.description": "例如：飛過彩虹城堡的龍",
      "draw.generate": "生成我的圖片",
      "gallery.title": "你生成的圖片",
      "gallery.empty": "還沒有圖片 — 畫一些東西然後點擊生成！",
      "gallery.generating": "正在創造你的圖片...",
      "gallery.error": "哎呀！出錯了。",
      "gallery.retry": "重試",
      "gallery.drawn": "你的畫",
      "gallery.ai_image": "AI 插圖",
      "error.generic": "發生錯誤，請重試。",
      "error.network": "網路錯誤，請檢查連線。",
      "error.webhook": "圖片生成失敗，請重試。",
    },
  };

  let lang = localStorage.getItem("msi_lang") || "zh-TW";

  function t(key) {
    return strings[lang]?.[key] || strings.en[key] || key;
  }

  function setLang(newLang) {
    lang = newLang;
    localStorage.setItem("msi_lang", lang);
    apply();
  }

  function apply() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const txt = t(key);
      if (txt !== key) el.textContent = txt;
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      const txt = t(key);
      if (txt !== key) el.placeholder = txt;
    });
  }

  function getLang() {
    return lang;
  }

  return { t, setLang, apply, getLang };
})();
