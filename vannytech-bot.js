const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const puppeteer = require('puppeteer');

// ── keep-alive server ──
const app = express();
app.get('/', (req, res) => res.send('✅ Vanny Tech Bot is running!'));
app.listen(process.env.PORT || 3000, () => console.log('Keep-alive server on port 3000'));

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        executablePath: puppeteer.executablePath(),
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

const sessions = {};
function getSession(id) {
    if (!sessions[id]) sessions[id] = { step: 'main' };
    return sessions[id];
}

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
Paybill  : 123456
Account  : Your Phone Number

After paying send: *PAID [your phone number]*
e.g. _PAID 0712345678_

⏱ Delivery within 5 minutes after payment confirmation.
Thank you for choosing *VANNY TECH!* 🙏`;

const bundleDetails = {
    safaricom: [
        { name: 'Safaricom 1 GB (1 day)',    price: 99  },
        { name: 'Safaricom 2 GB (7 days)',   price: 149 },
        { name: 'Safaricom 5 GB (30 days)',  price: 299 },
        { name: 'Safaricom 10 GB (30 days)', price: 499 },
    ],
    airtel: [
        { name: 'Airtel 1 GB (1 day)',    price: 89  },
        { name: 'Airtel 2 GB (7 days)',   price: 139 },
        { name: 'Airtel 5 GB (30 days)',  price: 279 },
        { name: 'Airtel 10 GB (30 days)', price: 479 },
    ],
    telkom: [
        { name: 'Telkom 1 GB (1 day)',   price: 79  },
        { name: 'Telkom 2 GB (7 days)',  price: 129 },
        { name: 'Telkom 5 GB (30 days)', price: 259 },
    ],
};

const socialPlatforms = ['Instagram','TikTok','Facebook','YouTube','Twitter/X'];
const socialPrices = [
    { followers: '500 Followers',    price: 200  },
    { followers: '1,000 Followers',  price: 350  },
    { followers: '5,000 Followers',  price: 1200 },
    { followers: '10,000 Followers', price: 2000 },
];

client.on('message', async msg => {
    const body = msg.body.trim();
    const id   = msg.from;
    const sess = getSession(id);

    if (['hi','hello','hallo','start','menu'].includes(body.toLowerCase()) && sess.step === 'main') {
        await msg.reply(MAIN_MENU); return;
    }
    if (body === '0') { sess.step = 'main'; await msg.reply(MAIN_MENU); return; }

    if (sess.step === 'main') {
        if (body === '1')      { sess.step = 'bundles'; await msg.reply(BUNDLES_MENU); }
        else if (body === '2') { sess.step = 'social';  await msg.reply(SOCIAL_MENU); }
        else if (body === '3') { await msg.reply('👤 An agent will reach you shortly!'); }
        else { await msg.reply(MAIN_MENU); }
        return;
    }

    if (sess.step === 'bundles') {
        const map = { '1': 'safaricom', '2': 'airtel', '3': 'telkom' };
        if (map[body]) {
            sess.network = map[body]; sess.step = `bundles_${map[body]}`;
            const menus = { safaricom: SAFARICOM_BUNDLES, airtel: AIRTEL_BUNDLES, telkom: TELKOM_BUNDLES };
            await msg.reply(menus[map[body]]);
        } else { await msg.reply(BUNDLES_MENU); }
        return;
    }

    if (sess.step && sess.step.startsWith('bundles_')) {
        const pkgs = bundleDetails[sess.network];
        const idx  = parseInt(body) - 1;
        if (pkgs && idx >= 0 && idx < pkgs.length) {
            sess.step = 'main';
            await msg.reply(PAYMENT_MSG(pkgs[idx].name, pkgs[idx].price));
        } else {
            const menus = { safaricom: SAFARICOM_BUNDLES, airtel: AIRTEL_BUNDLES, telkom: TELKOM_BUNDLES };
            await msg.reply(menus[sess.network]);
        }
        return;
    }

    if (sess.step === 'social') {
        const idx = parseInt(body) - 1;
        if (idx >= 0 && idx < socialPlatforms.length) {
            sess.platform = socialPlatforms[idx]; sess.step = 'social_package';
            await msg.reply(socialPackages(sess.platform));
        } else { await msg.reply(SOCIAL_MENU); }
        return;
    }

    if (sess.step === 'social_package') {
        const idx = parseInt(body) - 1;
        if (idx >= 0 && idx < socialPrices.length) {
            const pkg = socialPrices[idx]; sess.step = 'main';
            await msg.reply(PAYMENT_MSG(`${sess.platform} – ${pkg.followers}`, pkg.price));
        } else { await msg.reply(socialPackages(sess.platform)); }
        return;
    }

    if (body.toUpperCase().startsWith('PAID')) {
        const phone = body.split(' ')[1] || 'your number';
        await msg.reply(`✅ Payment received for *${phone}*.\n\nProcessing ⚙️ Delivery in *5 minutes*.\n\nFor help reply *3* 😊`);
        sess.step = 'main'; return;
    }

    await msg.reply(MAIN_MENU);
});

client.on('qr', qr => {
    console.log('Scan this QR code with your WhatsApp:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => console.log('✅ VANNY TECH Bot is live!'));

client.initialize();
