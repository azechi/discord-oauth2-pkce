const DISCORD_CLIENT_ID = "984687289764556820";

const STORAGE_KEY = "code_verifier";
const storage = window.sessionStorage;
const { searchParams: params, origin, pathname } = new URL(window.location);

const loaded = new Promise((result) => {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", result, { once: true });
  } else {
    result();
  }
});

if (params.has("code")) {
  const tokens = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      redirect_uri: `${origin}${pathname}`,
      grant_type: "authorization_code",
      scope: "identify",
      code_verifier: storage.getItem(STORAGE_KEY),
      code: params.get("code"),
    }),
  }).then((res) => res.json());

  const user = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  }).then((res) => res.json());

  const url = new URL(window.location);
  url.searchParams.delete("code");
  window.history.replaceState({}, document.title, url.href);

  console.log(user);
  await loaded;
  const img = document.createElement("img");
  img.src = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.jpeg`;
  document.body.appendChild(img);
} else {
  await loaded;
  const button = document.getElementById("button");
  button.addEventListener("click", async () => {
    await loginWithRedirect();
  });
  button.disabled = false;
}

async function loginWithRedirect() {
  const code_verifier = btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))
  ).replace(/\/|\+|=/g, (x) => ({ "/": "_", "+": "-", "=": "" }[x]));

  storage.setItem(STORAGE_KEY, code_verifier);

  const hash = await crypto.subtle.digest(
    "SHA-256",
    new Uint8Array([...code_verifier].map((e) => e.charCodeAt(0)))
  );

  const code_challenge = btoa(
    String.fromCharCode(...new Uint8Array(hash))
  ).replace(/\/|\+|=/g, (x) => ({ "/": "_", "+": "-", "=": "" }[x]));

  const p = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: `${origin}${pathname}`,
    response_type: "code",
    scope: "identify",
    code_challenge: code_challenge,
    code_challenge_method: "S256",
  });

  self.location.assign(`https://discord.com/api/oauth2/authorize?${p}`);
}
