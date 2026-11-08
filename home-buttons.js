
(function () {
  const originalShow = window.show;

  if (typeof originalShow !== "function") return;

  window.show = function (page) {
    originalShow(page);

    if (page !== "home") return;

    const view = document.getElementById("view");
    if (!view) return;

    const hubCard = view.querySelector(".card");
    if (!hubCard) return;

    const buttons = document.createElement("div");
    buttons.id = "mzanconnect-buttons";

    buttons.style.cssText =
      "display:grid;" +
      "grid-template-columns:repeat(2,minmax(0,1fr));" +
      "gap:10px;" +
      "margin:12px 0 18px;";

    const links = [
      ["Join MzanConnect", "register.html", "#147b59"],
      ["Member Login", "login.html", "#14283b"]
    ];

    links.forEach(([label, url, color]) => {
      const link = document.createElement("a");

      link.href = url;
      link.textContent = label;

      link.style.cssText =
        "display:flex;" +
        "align-items:center;" +
        "justify-content:center;" +
        "background:" + color + ";" +
        "color:white;" +
        "padding:14px 6px;" +
        "border-radius:12px;" +
        "text-align:center;" +
        "text-decoration:none;" +
        "font-weight:bold;" +
        "font-size:13px;";

      buttons.appendChild(link);
    });

    hubCard.insertAdjacentElement("afterend", buttons);
  };

  window.show(
    ["business", "compliance", "opportunities"].includes(
      window.location.hash.slice(1)
    )
      ? window.location.hash.slice(1)
      : "home"
  );
})();
