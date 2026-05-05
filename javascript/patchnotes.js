(function () {
  const STORAGE_KEY = "changeLogId";

  function base64Now() {
    return btoa(Date.now().toString());
  }

 function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function showOverlay(content) {
  const overlay = document.createElement("div");
  overlay.style = `
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.9);
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  const box = document.createElement("div");
  box.style = `
    all: unset;
    display: block;
    width: 90%;
    max-width: 800px;
    max-height: 80%;
    overflow: auto;
    background: #111;
    color: #eee;
    font-size: 16px;
    font-family: monospace;
    line-height: 1.5;
    padding: 20px;
    border-radius: 8px;
    border: 1px solid #555;
    text-align: left;
  `;

  const contentEl = document.createElement("div");
  contentEl.innerHTML = escapeHtml(content); // SAFE
  contentEl.style = `
    white-space: pre-wrap;
    margin-bottom: 20px;
  `;

  const center = document.createElement("div");
  center.style = `
    text-align: center;
    margin-top: 10px;
  `;

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Close";
  closeBtn.style = `
    all: unset;
    display: inline-block;
    padding: 8px 16px;
    background: #333;
    color: #fff;
    cursor: pointer;
    border-radius: 4px;
    font-size: 14px;
  `;
  closeBtn.onclick = () => overlay.remove();

  center.appendChild(closeBtn);

  box.appendChild(contentEl);
  box.appendChild(center);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

 const closeBtn = document.createElement("button");
  closeBtn.textContent = "Close";
  closeBtn.style = `
    all: unset;
    display: inline-block;
    margin-bottom: 10px;
    padding: 6px 12px;
    background: #333;
    color: #fff;
    cursor: pointer;
    border-radius: 4px;
    font-size: 14px;
  `;
  closeBtn.onclick = () => overlay.remove();

  async function run() {
    try {
      const res = await fetch(`/change/index.json?time=${base64Now()}`);
      if (!res.ok) return;

      const data = await res.json();
      if (!data || !data.id) return;

      const savedId = localStorage.getItem(STORAGE_KEY);

      if (savedId !== data.id) {
        const logRes = await fetch(`/change/log-${data.id}.txt`);
        if (!logRes.ok) return;

        const text = await logRes.text();
        showOverlay(text);

        localStorage.setItem(STORAGE_KEY, data.id);
      }
    } catch (e) {
      console.error("Change log check failed:", e);
    }
  }

  // run after DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();