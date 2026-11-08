
document.addEventListener("DOMContentLoaded", function () {
  const welcome = [...document.querySelectorAll("h1,h2")]
    .find(el => el.textContent.trim() === "Welcome to Enterprise360");

  if (!welcome) return;

  const buttons = document.createElement("div");
  buttons.style.cssText =
    "display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0;";

  buttons.innerHTML = `
    <a href="register.html" style="background:#147b59;color:white;padding:14px 6px;border-radius:12px;text-align:center;text-decoration:none;font-weight:bold;font-size:14px;">Join Enterprise360</a>
    <a href="login.html" style="background:#14283b;color:white;padding:14px 6px;border-radius:12px;text-align:center;text-decoration:none;font-weight:bold;font-size:14px;">Member Login</a>
  `;

const growthHub = [...document.querySelectorAll("*")]
  .find(el => el.children.length === 0 &&
    el.textContent.trim() === "Your Business Growth Hub");

if (growthHub) {
  const hubBox = growthHub.closest(".card") || growthHub.parentElement;
  hubBox.insertAdjacentElement("afterend", buttons);
} else {
  welcome.insertAdjacentElement("afterend", buttons);
}

});
