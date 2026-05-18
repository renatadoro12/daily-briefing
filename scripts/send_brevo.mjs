// send_brevo.mjs — envia o Daily Briefing por email via Brevo
import { readFileSync, existsSync } from 'node:fs';

const MONTHS_PT = [
  'janeiro','fevereiro','março','abril','maio','junho',
  'julho','agosto','setembro','outubro','novembro','dezembro',
];

const TOPIC_NAMES = {
  geopolitica: 'Geopolítica',
  economia: 'Economia',
  ia: 'Inteligência Artificial',
  web3: 'Web3',
  crypto: 'Criptomoedas',
};

const TOPIC_ICONS = {
  geopolitica: '🌍',
  economia: '💰',
  ia: '🤖',
  web3: '🌐',
  crypto: '₿',
};

const TOPIC_ORDER = ['geopolitica', 'economia', 'ia', 'web3', 'crypto'];

function nowBR() { return new Date(Date.now() - 3 * 60 * 60 * 1000); }
function dateSlug(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}

const apiKey = process.env.BREVO_API_KEY;
if (!apiKey) {
  console.log('BREVO_API_KEY não definida — pulando envio de email.');
  process.exit(0);
}

const today = nowBR();
const slug = dateSlug(today);
const datePT = `${today.getUTCDate()} de ${MONTHS_PT[today.getUTCMonth()]} de ${today.getUTCFullYear()}`;
const dataPath = `docs/${slug}/data.json`;
const siteUrl = `https://renatadoro12.github.io/daily-briefing/${slug}/`;

if (!existsSync(dataPath)) {
  console.log(`Dados não encontrados: ${dataPath} — pulando envio.`);
  process.exit(0);
}

const { grouped, threadOfDay } = JSON.parse(readFileSync(dataPath, 'utf-8'));

// Monta seções do email com os títulos das notícias
let sectionsHtml = '';
for (const topic of TOPIC_ORDER) {
  if (!grouped[topic]?.length) continue;
  const items = grouped[topic]
    .map(item => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
          <p style="margin:0;font-size:13px;color:#94A3B8;line-height:1.5;">
            <span style="color:#475569;font-size:11px;">${item.published_time || ''} · ${item.source || ''}</span><br>
            <strong style="color:#F8FAFC;">${item.title}</strong>
          </p>
        </td>
      </tr>`)
    .join('');

  sectionsHtml += `
    <tr>
      <td style="padding:20px 24px 0;">
        <p style="margin:0 0 12px;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#475569;">
          ${TOPIC_ICONS[topic]} ${TOPIC_NAMES[topic]}
        </p>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${items}
        </table>
      </td>
    </tr>`;
}

const threadHtml = threadOfDay ? `
  <tr>
    <td style="padding:20px 24px;background:rgba(0,196,180,0.06);border-left:3px solid #00C4B4;margin:0 24px;">
      <p style="margin:0 0 6px;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#00C4B4;">Fio do Dia</p>
      <p style="margin:0;font-size:13px;color:#94A3B8;line-height:1.7;">${threadOfDay}</p>
    </td>
  </tr>` : '';

const emailHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Daily Briefing — ${datePT}</title>
</head>
<body style="margin:0;padding:0;background:#0F172A;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#0F172A">
  <tr>
    <td align="center" style="padding:24px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0F172A;border:1px solid rgba(255,255,255,0.08);border-radius:12px;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="padding:32px 24px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.08);">
            <div style="font-size:22px;font-weight:bold;color:#F8FAFC;">Daily Briefing</div>
            <div style="font-size:12px;color:#94A3B8;margin-top:4px;">Renata Doro IA &amp; Cripto</div>
            <div style="font-size:10px;color:#475569;margin-top:6px;letter-spacing:3px;text-transform:uppercase;">${datePT.toUpperCase()}</div>
          </td>
        </tr>

        ${threadHtml}

        ${sectionsHtml}

        <!-- CTA -->
        <tr>
          <td style="padding:28px 24px;text-align:center;border-top:1px solid rgba(255,255,255,0.08);">
            <a href="${siteUrl}" style="display:inline-block;background:linear-gradient(135deg,#00C4B4,#7C3AED);color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:bold;">
              Ler edição completa →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 24px;text-align:center;background:#0B1120;">
            <p style="margin:0;color:#334155;font-size:10px;letter-spacing:1px;">
              Daily Briefing · Renata Doro IA &amp; Cripto
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

// Cria campanha no Brevo
const campaignResp = await fetch('https://api.brevo.com/v3/emailCampaigns', {
  method: 'POST',
  headers: {
    'api-key': apiKey,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  body: JSON.stringify({
    name: `Daily Briefing ${slug}`,
    subject: `Daily Briefing — ${datePT}`,
    sender: { name: 'Renata Doro IA & Cripto', email: 'rgdoro123@gmail.com' },
    type: 'classic',
    htmlContent: emailHtml,
    recipients: { listIds: [2] },
  }),
});

if (!campaignResp.ok) {
  console.error(`Erro ao criar campanha: ${campaignResp.status} ${await campaignResp.text()}`);
  process.exit(1);
}

const { id: campaignId } = await campaignResp.json();
console.log(`Campanha criada: ID ${campaignId}`);

// Envia agora
const sendResp = await fetch(`https://api.brevo.com/v3/emailCampaigns/${campaignId}/sendNow`, {
  method: 'POST',
  headers: { 'api-key': apiKey, 'Accept': 'application/json' },
});

if (!sendResp.ok) {
  console.error(`Erro ao enviar: ${sendResp.status} ${await sendResp.text()}`);
  process.exit(1);
}

console.log(`✅ Email enviado para a lista Daily Briefing!`);
