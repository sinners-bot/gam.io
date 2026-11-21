// Game Night — Terms of Service and Privacy Policy pages
const APP = "Game Night";
const OPERATOR = Bun.env.OPERATOR_NAME || "the Game Night team";
const EMAIL = Bun.env.CONTACT_EMAIL || "";
const COUNTRY = Bun.env.GOVERNING_COUNTRY || "";
const UPDATED = "20 November 2026";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const contact = EMAIL ? `<a href="mailto:${esc(EMAIL)}">${esc(EMAIL)}</a>` : "the contact details listed on our Discord application page";

function page(title: string, body: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · ${APP}</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;max-width:760px;margin:0 auto;padding:40px 22px 80px;line-height:1.65;color:#1d1f2b;background:#fbfbfd}
h1{font-size:30px;margin-bottom:4px}h2{font-size:19px;margin-top:32px}.muted{color:#666;font-size:14px}nav a{margin-right:16px;color:#5865f2;font-weight:600;text-decoration:none}
a{color:#5865f2}ul{padding-left:22px}li{margin:4px 0}table{border-collapse:collapse;width:100%;font-size:15px}td,th{border:1px solid #ddd;padding:8px 10px;text-align:left;vertical-align:top}th{background:#f0f1f7}</style></head>
<body><nav><a href="/">🎲 ${APP}</a><a href="/terms">Terms</a><a href="/privacy">Privacy</a></nav><h1>${title}</h1><p class="muted">Last updated: ${UPDATED}</p>${body}</body></html>`;
}

const TERMS = page("Terms of Service", `
<p>These Terms of Service ("Terms") govern your use of ${APP}, a Discord Activity and related services operated by ${esc(OPERATOR)} ("we", "us"). By launching or using ${APP}, you agree to these Terms. If you do not agree, do not use ${APP}.</p>

<h2>1. The service</h2>
<p>${APP} is a collection of casual multiplayer games (such as Connect 4 and Crazy 8s) that you can play with others inside Discord voice channels. We may add, change or remove games and features at any time.</p>

<h2>2. Eligibility and Discord</h2>
<p>${APP} runs on Discord. You must meet Discord's minimum age requirement in your country and comply with <a href="https://discord.com/terms">Discord's Terms of Service</a> and <a href="https://discord.com/guidelines">Community Guidelines</a> while using ${APP}. Your use of Discord itself is governed by Discord, not by us.</p>

<h2>3. Acceptable use</h2>
<p>You agree not to:</p>
<ul>
<li>cheat, exploit bugs, or use automated tools, scripts or modified clients to gain an advantage or manipulate the leaderboard;</li>
<li>interfere with, overload or disrupt the service or its servers, or try to access data or systems you are not authorised to access;</li>
<li>harass, threaten or abuse other players, or use display names that are offensive or impersonate others;</li>
<li>use ${APP} for any unlawful purpose.</li>
</ul>
<p>We may reset statistics, remove leaderboard entries, or block access for anyone who breaks these rules.</p>

<h2>4. Game statistics</h2>
<p>Wins, games played and leaderboard positions are for fun only. They have no monetary value, cannot be exchanged or transferred, and may be reset or removed at any time.</p>

<h2>5. Intellectual property</h2>
<p>${APP}, including its code, design and artwork, is owned by us or our licensors. You may use it only as offered through Discord, for personal, non-commercial play. Discord and its logos are trademarks of Discord Inc.; ${APP} is not made, endorsed or sponsored by Discord.</p>

<h2>6. Availability and changes</h2>
<p>${APP} is provided free of charge. We do not guarantee that it will always be available, uninterrupted or error-free, and we may suspend or discontinue it at any time without notice. Games in progress may be lost if the service restarts.</p>

<h2>7. Disclaimer</h2>
<p>${APP} is provided "as is" and "as available", without warranties of any kind, express or implied, to the extent permitted by law.</p>

<h2>8. Limitation of liability</h2>
<p>To the extent permitted by law, we are not liable for any indirect, incidental or consequential damages, or for any loss of data or statistics, arising from your use of ${APP}. Nothing in these Terms limits liability that cannot be limited under applicable law, including liability for intent or gross negligence, or your statutory rights as a consumer.</p>

<h2>9. Termination</h2>
<p>You may stop using ${APP} at any time. We may suspend or end your access if you breach these Terms.</p>

<h2>10. Changes to these Terms</h2>
<p>We may update these Terms from time to time. We will change the "Last updated" date above, and continued use after an update means you accept the new Terms.</p>

<h2>11. Governing law</h2>
<p>${COUNTRY ? `These Terms are governed by the laws of ${esc(COUNTRY)}, without prejudice to any mandatory consumer protection rules of the country where you live.` : "These Terms are governed by the laws of the country where the operator is established, without prejudice to any mandatory consumer protection rules of the country where you live."}</p>

<h2>12. Contact</h2>
<p>Questions about these Terms: ${contact}.</p>
`);

const PRIVACY = page("Privacy Policy", `
<p>This Privacy Policy explains what personal data ${APP} collects, why, and what rights you have. ${APP} is operated by ${esc(OPERATOR)} ("we", "us"), who is the controller of the data described here. Contact: ${contact}.</p>

<h2>1. What we collect</h2>
<p>When you launch ${APP} in Discord, you authorise it through Discord with the <code>identify</code> permission only. We receive and use:</p>
<table>
<tr><th>Data</th><th>Why we use it</th><th>How long we keep it</th></tr>
<tr><td>Discord user ID, username / display name and avatar</td><td>To show who is playing, seat you in games and display your name and picture to other players</td><td>Held in memory only while you are in a session; not written to disk, except as listed below</td></tr>
<tr><td>Discord access token</td><td>To confirm your identity with Discord when you connect</td><td>Kept in server memory for up to 10 minutes; never stored in a database</td></tr>
<tr><td>Game statistics: your Discord user ID, display name, and number of games played and won per game</td><td>To show the leaderboard and your record</td><td>Until you ask us to delete it, or until ${APP} is shut down</td></tr>
<tr><td>Live game state (moves, cards, the voice-channel Activity instance you are in)</td><td>To run the game</td><td>In memory only; discarded when everyone leaves</td></tr>
<tr><td>Technical server logs (e.g. errors, timestamps; our hosting provider may also log IP addresses of requests)</td><td>To keep the service running and secure</td><td>Limited period, per our hosting provider's log retention</td></tr>
</table>
<p>We do <strong>not</strong> receive your email address, messages, server lists, voice audio or payment information. We do not use cookies or tracking, show ads, or build advertising profiles. If you use the browser test mode outside Discord, the name you type is stored only in your own browser and is not saved to the leaderboard.</p>

<h2>2. Legal basis</h2>
<p>Where the EU/UK GDPR applies, we process this data because it is necessary to provide the service you asked to use (Art. 6(1)(b) GDPR) and, for logs and security, based on our legitimate interest in running a secure, working service (Art. 6(1)(f) GDPR).</p>

<h2>3. Who we share it with</h2>
<ul>
<li><strong>Other players</strong> in your Activity can see your display name, avatar and moves, and anyone using ${APP} can see leaderboard names and win counts.</li>
<li><strong>Discord</strong>, which handles sign-in and runs the Activity inside its app under <a href="https://discord.com/privacy">Discord's Privacy Policy</a>.</li>
<li><strong>Railway</strong> (Railway Corporation), our hosting and database provider, which processes data on our behalf. Data may be processed in the United States; where required, transfers rely on appropriate safeguards such as Standard Contractual Clauses.</li>
</ul>
<p>We do not sell or rent personal data. We may disclose data if required by law.</p>

<h2>4. Your rights</h2>
<p>Depending on where you live, you may have the right to access, correct, delete, restrict or object to our processing of your data, and to data portability. To exercise any of these, including removing yourself from the leaderboard, contact us at ${contact} and include your Discord username. You can also stop all further collection by no longer launching ${APP}, and you can revoke its access at any time in Discord under User Settings → Authorized Apps.</p>
<p>If you are in the EU/EEA, you also have the right to lodge a complaint with your local data protection authority.</p>

<h2>5. Children</h2>
<p>${APP} is intended only for people who meet Discord's minimum age requirement in their country. We do not knowingly collect data from children below that age; if you believe we have, contact us and we will delete it.</p>

<h2>6. Security</h2>
<p>Data is sent over encrypted connections (HTTPS/WSS), access tokens are never stored permanently, and access to our hosting account and database is restricted. No system is perfectly secure, but we take reasonable measures to protect your data.</p>

<h2>7. Changes</h2>
<p>We may update this policy from time to time and will change the "Last updated" date above. For significant changes we will make reasonable efforts to let users know.</p>

<h2>8. Contact</h2>
<p>For any privacy question or request: ${contact}.</p>
`);

const HOME = page(APP, `<p>${APP} is a collection of casual multiplayer games you play together inside Discord voice channels. Launch it from the Activities menu in any voice call.</p><ul><li><a href="/terms">Terms of Service</a></li><li><a href="/privacy">Privacy Policy</a></li></ul>`);

const html = (s: string) => new Response(s, { headers: { "Content-Type": "text/html; charset=utf-8" } });
Bun.serve({
  port: Number(Bun.env.PORT || 3000),
  fetch(req) {
    const p = new URL(req.url).pathname.replace(/\/+$/, "") || "/";
    if (p === "/terms" || p === "/tos") return html(TERMS);
    if (p === "/privacy" || p === "/privacy-policy") return html(PRIVACY);
    if (p === "/") return html(HOME);
    return new Response("Not found", { status: 404 });
  },
});
console.log("legal pages up");
