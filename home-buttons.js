
document.addEventListener("DOMContentLoaded", function () {
  // Find the Business Growth Hub heading.
  const hubHeading = Array.from(
    document.querySelectorAll("h1, h2, h3, h4, h5, h6, div, p, span")
  ).find(el =>
    el.children.length === 0 &&
    /Your Business Growth Hub/i.test(el.textContent.trim())
  );

  if (!hubHeading) {
    console.warn("Business Growth Hub heading not found.");
    return;
  }

  // Find the box containing the heading.
  const hubBox =
    hubHeading.closest(".card, .hero, .welcome-card, section") ||
    hubHeading.parentElement;

  if (!hubBox || !hubBox.parentElement) return;

  // Avoid duplicate buttons.
  const existing = document.getElementById("enterprise360-buttons");
  if (existing) existing.remove();

  // Create a side-by-side button container.
  const buttons = document.createElement("div");
  buttons.id = "enterprise360-buttons";
  buttons.style.cssText =
    "display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0;";

  const links = [
    ["Join Enterprise360", "register.html", "#147b59"],
    ["Member Login", "login.html", "#14283b"]
  ];

  links.forEach(([label, url, color]) => {
    const link = document.createElement("a");
    link.href = url;
    link.textContent = label;
    link.style.cssText =
      "display:flex;align-items:center;justify-content:center;" +
      "background:" + color + ";color:white;" +
      "padding:14px 6px;border-radius:12px;" +
      "text-align:center;text-decoration:none;" +
      "font-weight:bold;font-size:14px;";
    buttons.appendChild(link);
  });

  // Position buttons immediately after the Growth Hub box.
  hubBox.insertAdjacentElement("afterend", buttons);
});
