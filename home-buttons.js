
document.addEventListener("DOMContentLoaded", function () {
  const buttons = document.createElement("div");

  buttons.innerHTML = `
    <div style="padding:20px;display:grid;gap:12px">
      <a href="register.html"
         style="background:#147b59;color:white;padding:16px;
         text-align:center;border-radius:12px;
         text-decoration:none;font-weight:bold">
        Join Enterprise360
      </a>
      <a href="login.html"
         style="background:#14283b;color:white;padding:16px;
         text-align:center;border-radius:12px;
         text-decoration:none;font-weight:bold">
        Member Login
      </a>
    </div>
  `;

  document.body.appendChild(buttons);
});
