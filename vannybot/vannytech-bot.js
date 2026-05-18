const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

// ── keep-alive server for Render ───────────────────────────────
const app = express();
app.get('/', (req, res) => res.send('✅ Vanny Tech Bot is running!'));
app.listen(3000, () => console.log('Keep-alive server running on port 3000'));

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        executablePath: '/opt/render/.cache/puppeteer/chrome/linux-146.0.7680.31/chrome-linux64/chrome',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

// ── session store ──────────────────────────────────────────────
const sessions = {};

function getSession(id) {
    if (!sessions[id]) sessions[id] = { step: 'main' };
    return sessions[id];
}

// ── menus ──────────────────────────────────────────────────────
const MAIN_MENU = `🌟 *Welcome to VANNY TECH* 🌟

What would you like today?

1️⃣  Data Bundles
2️⃣  Social Media Followers / Boost
3️⃣  Talk to an Agent

Reply: *1* | *2* | *3*`;

const BUNDLES_MENU = `📦 *Data Bundles – Select Network*

1️⃣  Safaricom
2️⃣  Airtel
3️⃣  Telkom

Reply: *1* | *2* | *3*  or  *0* to go back`;

const SAFARICOM_BUNDLES = `📶 *Safaricom Bundles*

1️⃣  1 GB  –  KES 99   (1 day)
2️⃣  2 GB  –  KES 149  (7 days)
3️⃣  5 GB  –  KES 299  (30 days)
4️⃣ 10 GB  –  KES 499  (30 days)

Reply with the *number* to order, or *0* to go back`;

const AIRTEL_BUNDLES = `📶 *Airtel Bundles*

1️⃣  1 GB  –  KES 89   (1 day)
2️⃣  2 GB  –  KES 139  (7 days)
3️⃣  5 GB  –  KES 279  (30 days)
4️⃣ 10 GB  –  KES 479  (30 days)

Reply with the *number* to order, or *0* to go back`;

const TELKOM_BUNDLES = `📶 *Telkom Bundles*

1️⃣  1 GB  –  KES 79   (1 day)
2️⃣  2 GB  –  KES 129  (7 days)
3️⃣  5 GB  –  KES 259  (30 days)

Reply with the *number* to order, or *0* to go back`;

const SOCIAL_MENU = `📱 *Social Media Boost – Select Platform*

1️⃣  Instagram
2️⃣  TikTok
3️⃣  Facebook
4️⃣  YouTube
5️⃣  Twitter / X

Reply: *1* | *2* | *3* | *4* | *5*  or  *0* to go back`;

function socialPackages(platform) {
    return `🚀 *${platform} Boost Packages*

1️⃣    500 Followers  –  KES 200
2️⃣  1,000 Followers  –  KES 350
3️⃣  5,000 Followers  –  KES 1,200
4️⃣ 10,000 Followers  –  KES 2,000

Reply with the *number* to order, or *0* to go back`;
}

const PAYMENT_MSG = (item, price) =>
`✅ *Order Confirmed!*

🛒 Item  : ${item}
💰 Price : KES ${price}

💳 *Pay via M-Pesa:*
Payline  : 0702028681
Account name  : Opiyo Eugene

After paying send: *PAID [your phone number]*
e.g. _PAID 0702028681_

⏱ Delivery within 5 minutes after payment confirmation.
Thank you for choosing *VANNY TECH!* 🙏`;

// ── bundle order tables ────────────────────────────────────────
const bundleDetails = {
    safaricom: [
        { name: 'Safaricom 1 GB (1 day)',   price: 99  },
        { name: 'Safaricom 2 GB (7 days)',  price: 149 },
        { name: 'Safaricom 5 GB (30 days)', price: 299 },
        { name: 'Safaricom 10 GB (30 days)',price: 499 },
    ],
    airtel: [
        { name: 'Airtel 1 GB (1 day)',   price: 89  },
        { name: 'Airtel 2 GB (7 days)', price: 139 },
        { name: 'Airtel 5 GB (30 days)',price: 279 },
        { name: 'Airtel 10 GB (30 days)',price: 479 },
    ],
    telkom: [
        { name: 'Telkom 1 GB (1 day)',   price: 79  },
        { name: 'Telkom 2 GB (7 days)', price: 129 },
        { name: 'Telkom 5 GB (30 days)',price: 259 },
    ],
};

const socialPlatforms = ['Instagram','TikTok','Facebook','YouTube','Twitter/X'];
const socialPrices = [
    { followers: '500 Followers',    price: 200  },
    { followers: '1,000 Followers',  price: 350  },
    { followers: '5,000 Followers',  price: 1200 },
    { followers: '10,000 Followers', price: 2000 },
];

// ── message handler ────────────────────────────────────────────
client.on('message', async msg => {
    const body = msg.body.trim();
    const id   = msg.from;
    const sess = getSession(id);

    // restart keywords
    if (['hi','hello','hallo','start','menu','0'].includes(body.toLowerCase()) && sess.step === 'main') {
        await msg.reply(MAIN_MENU);
        return;
    }
    if (body === '0') {
        sess.step = 'main';
        await msg.reply(MAIN_MENU);
        return;
    }

    // ── MAIN MENU ──
    if (sess.step === 'main') {
        if (body === '1') { sess.step = 'bundles';        await msg.reply(BUNDLES_MENU); }
        else if (body === '2') { sess.step = 'social';   await msg.reply(SOCIAL_MENU); }
        else if (body === '3') { await msg.reply('👤 An agent will reach you shortly. Thank you for your patience!'); }
        else { await msg.reply(MAIN_MENU); }
        return;
    }

    // ── BUNDLES: choose network ──
    if (sess.step === 'bundles') {
        const map = { '1': 'safaricom', '2': 'airtel', '3': 'telkom' };
        if (map[body]) {
            sess.network = map[body];
            sess.step = `bundles_${map[body]}`;
            const menus = { safaricom: SAFARICOM_BUNDLES, airtel: AIRTEL_BUNDLES, telkom: TELKOM_BUNDLES };
            await msg.reply(menus[map[body]]);
        } else {
            await msg.reply(BUNDLES_MENU);
        }
        return;
    }

    // ── BUNDLES: choose package ──
    if (sess.step && sess.step.startsWith('bundles_')) {
        const net  = sess.network;
        const pkgs = bundleDetails[net];
        const idx  = parseInt(body) - 1;
        if (pkgs && idx >= 0 && idx < pkgs.length) {
            const pkg = pkgs[idx];
            sess.step = 'main';
            await msg.reply(PAYMENT_MSG(pkg.name, pkg.price));
        } else {
            const menus = { safaricom: SAFARICOM_BUNDLES, airtel: AIRTEL_BUNDLES, telkom: TELKOM_BUNDLES };
            await msg.reply(menus[net]);
        }
        return;
    }

    // ── SOCIAL: choose platform ──
    if (sess.step === 'social') {
        const idx = parseInt(body) - 1;
        if (idx >= 0 && idx < socialPlatforms.length) {
            sess.platform = socialPlatforms[idx];
            sess.step = 'social_package';
            await msg.reply(socialPackages(sess.platform));
        } else {
            await msg.reply(SOCIAL_MENU);
        }
        return;
    }

    // ── SOCIAL: choose package ──
    if (sess.step === 'social_package') {
        const idx = parseInt(body) - 1;
        if (idx >= 0 && idx < socialPrices.length) {
            const pkg  = socialPrices[idx];
            const item = `${sess.platform} – ${pkg.followers}`;
            sess.step  = 'main';
            await msg.reply(PAYMENT_MSG(item, pkg.price));
        } else {
            await msg.reply(socialPackages(sess.platform));
        }
        return;
    }

    // ── PAYMENT CONFIRMATION ──
    if (body.toUpperCase().startsWith('PAID')) {
        const phone = body.split(' ')[1] || 'your number';
        await msg.reply(`✅ Thank you! We have received your payment for *${phone}*.\n\nYour order is being processed ⚙️\nDelivery in *5 minutes*.\n\nFor help reply *3* to talk to an agent. 😊`);
        sess.step = 'main';
        return;
    }

    // fallback
    await msg.reply(MAIN_MENU);
});

// ── startup ────────────────────────────────────────────────────
client.on('qr', qr => {
    console.log('Scan this QR code with your WhatsApp:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ VANNY TECH WhatsApp bot is live!');
});

client.initialize();
