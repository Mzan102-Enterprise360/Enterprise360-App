
function showEnterpriseButtons() {
  // Remove previously generated buttons.
  document.getElementById("enterprise360-buttons")?.remove();

  // Create the button row.
  const buttons = document.createElement("div");
  buttons.id = "enterprise360-buttons";
  buttons.style.cssText =
    "display:grid;grid-template-columns:repeat(2,minmax(0,1fr));" +
    "gap:10px;margin:16px 0;width:100%;";

  [
    ["Join Enterprise360", "register.html", "#147b59"],
    ["Member Login", "login.html", "#14283b"]
  ].forEach(([label, url, color]) => {
    const link = document.createElement("a");
    link.href = url;
    link.textContent = label;
    link.style.cssText =
      "display:flex;align-items:center;justify-content:center;" +
      "min-width:0;padding:14px 6px;border-radius:12px;" +
      "background:" + color + ";color:white;" +
      "font-size:14px;font-weight:bold;text-align:center;" +
      "text-decoration:none;";
    buttons.appendChild(link);
  });

  // Find the Growth Hub heading.
  const headings = Array.from(
    document.querySelectorAll("h1,h2,h3,h4,h5,h6")
  );

  const hub = headings.find(el =>
    /business growth hub/i.test(el.textContent)
  );

  if (hub) {
    const container =
      hub.closest(".card,.hero,.welcome-card,section") ||
      hub.parentElement;

    if (container && container !== document.body) {
      container.insertAdjacentElement("afterend", buttons);
      return;
    }
  }

  // Fallback: display beneath the Welcome heading.
  const welcome = headings.find(el =>
    /welcome to enterprise360/i.test(el.textContent)
  );

  if (welcome) {
    welcome.insertAdjacentElement("afterend", buttons);
  } else {
    // Final fallback: show at the top of the page.
    const main = document.querySelector("main") || document.body;
    main.prepend(buttons);
  }
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    showEnterpriseButtons
  );
} else {
  showEnterpriseButtons();
}
