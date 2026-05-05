// Environment setting: Automatically detect 'sandbox' for testing or 'production' for live
const ENV = {
    // Midtrans API keys for payment gateway integration
    Midtrans_ClientKey: 'Mid-client-XXXXXXXXXXXXXXXXXXXX', // Client Key from Midtrans Dashboard *Required
    Midtrans_ServerKey: 'Mid-server-XXXXXXXXXXXXXXXXXXXX', // Server Key from Midtrans Dashboard *Required

    reCAPTCHA_SiteKey: '', // Site Key from Google reCAPTCHA (Leave blank if not using reCAPTCHA)
    reCAPTCHA_SecretKey: '', // Secret Key from Google reCAPTCHA (Leave blank if not using reCAPTCHA)
    reCAPTCHA_Score: '', // Minimum score for reCAPTCHA verification (Leave blank to use default 0.5)

    // Firebase Realtime Database to store donation information
    Firebase_DatabaseURL: '', // The URL endpoint of your Firebase Realtime Database (Leave blank if not using Firebase)
    Firebase_DatabaseSecret: '', // A legacy secret key used to authenticate server-side requests to the database (Leave blank if not using Firebase)

    // Website metadata for SEO and social media sharing
    SEO_Favicon: '', // Favicon for the website
    SEO_Title: '', // Title of the website
    SEO_Description: '', // Short description of the website's purpose
    SEO_Thumbnail: '', // Thumbnail image used in social media previews
    SEO_TwitterCard: '', // Image used for Twitter card sharing
    SEO_Author: '', // Website author name
    SEO_Keywords: '', // Keywords for SEO optimization
    SEO_URL: '', // Full URL of the website
    SEO_Color: '', // Theme color for browsers and social media previews

    // CSS Style for the donation page
    Style_BackgroundImage: '', // URL for the background image

    // Donation form settings
    Donation_Name: '', // Title or name of the donation campaign
    Donation_ItemName: '', // Name of the donation item or reward
    Donation_ItemThumbnail: '', // Thumbnail image for the donation item
    Donation_Currency: '', // Currency symbol (e.g., $ for Dollar, Rp for Rupiah)
    Donation_CurrencySymbol: '', // FontAwesome icon for the currency
    Donation_MinAmount: '', // Minimum donation amount in currency units (Decimals)
    Donation_MaxAmount: '', // Maximum donation amount in currency units (Decimals)
    Donation_StepAmount: '', // Step amount for increasing/decreasing donation using keyboard arrows (Decimals)
    Donation_CountryVAT: '', // VAT percentage applicable to donations (Decimals)

    // Custom message and media to show after a successful donation
    PaymentSuccess_Text: "", // Text shown after a successful donation
    PaymentSuccess_Image: '', // Image shown on the success page (Leave blank if not using Image)
    PaymentSuccess_ConfettiTime: '', // Confetti time displayed on donation success (Leave blank if not using Confetti)
    PaymentSuccess_Audio: '', // Audio played on donation success (Leave blank if not using Audio played)
    PaymentSuccess_Video: '', // Video shown on donation success (Leave blank if not using Video played)
};

// Layout configuration: Toggle features without comment-based switching
const LAYOUT_CONFIG = {
    // Page 3 behavior after successful payment
    // Options: 'thank_you_page' | 'modal_popup'
    successDisplay: 'thank_you_page',

    // Donation preset template style
    // Options: 'box' | 'slider'
    presetStyle: 'box',

    // Show video after payment success
    showSuccessVideo: true,

    // Enable confetti on payment success
    enableConfetti: true,

    // Enable audio on payment success
    enableAudio: true,

    // Video exit transition effect
    // Options: 'glare' | 'sweep' | 'none'
    videoTransition: 'glare',

    // Theme Colors (leave blank for defaults)
    colorPrimary: '',    // Default: '#0091FF'
    colorSecondary: '',  // Default: '#00C6FF'
    colorAccent: '',     // Default: '#7DD3E8'
    colorGlow: '',       // Default: '#BCEEFF'
    colorShadow: '',     // Default: '#4CA8C4'

    // Loading screen text (leave blank for no text)
    loadingText: '',
};

// Main event listener for handling HTTP requests
addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

// Calculate fees from the list of available payment methods
function calculateFee(amount, paymentMethod) {
    let fee = 0;

    // List of payment methods subject to Fee
    switch (paymentMethod) {
        case 'gopay':
            fee = amount * 0.02;
            break;
        case 'shopeepay':
            fee = amount * 0.02;
            break;
        case 'other_qris':
            fee = amount * 0.007;
            break;
        case 'credit_card':
            fee = amount * 0.029 + 2000;
            break;
        case 'echannel': // Bank Transfer (Mandiri)
        case 'bri_va': // BRI
        case 'cimb_va': // CIMB Niaga
        case 'bni_va': // BNI
        case 'permata_va': // Permata Bank
        case 'other_va': // Other banks
            fee = 4000;
            break;
        case 'indomaret':
        case 'alfamart':
        case 'alfamidi':
        case 'dan_dan':
            fee = 5000;
            break;
        case 'akulaku':
        case 'kredivo':
            fee = amount * 0.02;
            break;
        default:
            throw new Error(`Unsupported payment method: ${paymentMethod}`);
    }

    return fee;
}

// Calculate VAT from the list of available payment methods
function calculateVAT(amount, paymentMethod) {
    let vat = 0;

    // List of payment methods subject to VAT
    const vatApplicableMethods = [
        'credit_card', // Credit Card
        'akulaku',     // Akulaku PayLater
        'kredivo',     // Kredivo
        'echannel',    // Mandiri
        'bri_va',      // BRI
        'cimb_va',     // CIMB Niaga
        'bni_va',      // BNI
        'permata_va',  // Permata Bank
        'other_va'     // Other banks
    ];

    if (vatApplicableMethods.includes(paymentMethod)) {
        const CountryVAT = parseFloat(ENV.Donation_CountryVAT) || 0;
        vat = amount * (CountryVAT / 100);
    }

    return vat;
}

// Handle incoming requests and return appropriate responses
async function handleRequest(request) {
    const url = new URL(request.url);

    // Ensures the logic only runs for POST requests to save donations to Firebase
    if (url.pathname === '/save-donation' && request.method === 'POST') {
        const contentType = request.headers.get('content-type') || '';

        let data;

        if (contentType.includes('application/json')) {
            data = await request.json(); // for JSON
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
            const form = await request.formData(); // for FormData
            data = Object.fromEntries(form.entries());
        } else {
            return new Response('Unsupported Content-Type', { status: 415 });
        }

        // Continue saving data to Firebase
        const donationRecord = {
            name: data.name || "Anonymous",
            email: data.email || "-",
            amount: parseFloat(data.amount) || 0,
            paymentMethod: data.paymentMethod || "unknown",
            orderId: data.orderId || null,
            status: data.status || "unknown",
            timestamp: Date.now()
        };

        await saveDonationToFirebase(donationRecord);

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Displays the donation form on GET and protects against bots using Google reCAPTCHA verification.
    if (request.method === 'GET') {
        return new Response(donationFormHTML(), {
            headers: { 'content-type': 'text/html' }
        });
    } else if (request.method === 'POST') {
        const formData = await request.formData();
        const recaptchaToken = formData.get('recaptchaToken');

        // Verify reCAPTCHA if enabled
        if (ENV.reCAPTCHA_SiteKey && ENV.reCAPTCHA_SecretKey) {
            // Perform reCAPTCHA verification
            const recaptchaResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `secret=${ENV.reCAPTCHA_SecretKey}&response=${recaptchaToken}`
            });
            const recaptchaResult = await recaptchaResponse.json();

            if (!recaptchaResult.success || recaptchaResult.score < (ENV.reCAPTCHA_Score || 0.5)) {
                return new Response('reCAPTCHA verification score too low', { status: 403 });
            }
        }

        // Process HTML form data
        const name = formData.get('name');
        const email = formData.get('email');
        const amount = parseFloat(formData.get('amount'));
        const paymentMethod = formData.get('paymentMethod');

        // Calculate the transaction fee
        const fee = calculateFee(amount, paymentMethod);

        // Calculate the VAT
        const vat = calculateVAT(amount, paymentMethod);

        // Calculate total amount including transaction fee and VAT
        const totalAmount = amount + fee + vat;

        // Translate the list of available payment methods to be displayed in item details
        function translatedPaymentMethod(paymentMethod) {
            const translations = {
                'gopay': 'Gopay',
                'shopeepay': 'ShopeePay',
                'other_qris': 'QRIS Lainnya',
                'credit_card': 'Credit Card',
                'echannel': 'Bank Transfer (Mandiri)',
                'bri_va': 'BRI',
                'cimb_va': 'CIMB Niaga',
                'bni_va': 'BNI',
                'permata_va': 'Permata Bank',
                'other_va': 'Bank Lain',
                'indomaret': 'Indomaret',
                'alfamart': 'Alfamart',
                'alfamidi': 'Alfamidi',
                'dan_dan': 'Dan Dan',
                'akulaku': 'Akulaku',
                'kredivo': 'Kredivo'
            };
            return translations[paymentMethod] || paymentMethod;
        }

        // Create an item details array for the transaction
        const SettlementFee = `${translatedPaymentMethod(paymentMethod)} Payment Fee`;
        const VATpercent = `VAT ${ENV.Donation_CountryVAT}%`;
        const item_details = [
            {
                id: "donation",
                price: amount,
                quantity: 1,
                name: "Donation Amount"
            },
            {
                id: "fee",
                price: fee,
                quantity: 1,
                name: SettlementFee
            },
            {
                id: "vat",
                price: vat,
                quantity: 1,
                name: VATpercent
            }
        ];

        const transactionToken = await getMidTransToken(name, email, totalAmount, paymentMethod, item_details);

        // Optional: Save donation data to Firebase
        const donationRecord = {
            name,
            email,
            amount,
            paymentMethod: translatedPaymentMethod(paymentMethod),
            fee,
            vat,
            totalAmount,
            currency: ENV.Donation_Currency,
            item: ENV.Donation_ItemName,
            timestamp: Date.now()
        };
        saveDonationToFirebase(donationRecord); // Does not interrupt the process despite errors

        return new Response(JSON.stringify({ token: transactionToken }), {
            headers: { 'content-type': 'application/json' }
        });
    }
}

// Function to determine which MidTrans Snap environment to use (sandbox or production)
function getSnapEnvironment() {
    // Check if the keys start with 'SB-' to determine if it's sandbox
    const isSandbox = ENV.Midtrans_ClientKey.startsWith('SB-') && ENV.Midtrans_ServerKey.startsWith('SB-');
    let url;

    if (isSandbox) {
        url = 'https://app.sandbox.midtrans.com/snap/snap.js';
    } else {
        url = 'https://app.midtrans.com/snap/snap.js';
    }
    return url;
}

// Set the correct Snap environment URL for use in the donation form
const SnapEnvironment = getSnapEnvironment();

// Function to generate the HTML content for the donation form page
// This dynamically builds the page with information from the ENV object and includes payment methods, validation, and styling
function donationFormHTML() {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <title>${ENV.SEO_Title}</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <meta name="description" content="${ENV.SEO_Description}">
        <meta name="keywords" content="${ENV.SEO_Keywords}">
        <meta name="author" content="${ENV.SEO_Author}">
        <meta name="robots" content="index, follow">
        <link rel="icon" href="${ENV.SEO_Favicon}" type="image/x-icon">
        <meta property="og:title" content="${ENV.SEO_Title}">
        <meta property="og:description" content="${ENV.SEO_Description}">
        <meta property="og:image" content="${ENV.SEO_Thumbnail}">
        <meta property="og:url" content="${ENV.SEO_URL}">
        <meta property="og:type" content="website">
        <meta name="twitter:card" content="${ENV.SEO_TwitterCard}">
        <meta name="twitter:title" content="${ENV.SEO_Title}">
        <meta name="twitter:description" content="${ENV.SEO_Description}">
        <meta name="twitter:image" content="${ENV.SEO_Thumbnail}">
        <link rel="canonical" href="${ENV.SEO_URL}">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="theme-color" content="${ENV.SEO_Color}">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Comic+Neue:wght@700&family=Poppins:wght@300;400;500;600;700;800&family=Nothing+You+Could+Do&display=swap" rel="stylesheet">
        <script src="https://www.google.com/recaptcha/api.js?render=${ENV.reCAPTCHA_SiteKey}"><\/script>
        <script src="https://cdn.jsdelivr.net/npm/@tsparticles/confetti@3.0.3/tsparticles.confetti.bundle.min.js"><\/script>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/aquawolf04/font-awesome-pro@5cd1511/css/all.css">
        <script src="${SnapEnvironment}" data-client-key="${ENV.Midtrans_ClientKey}"><\/script>
        <style>
            :root {
    --color-primary: ${LAYOUT_CONFIG.colorPrimary || '#0091FF'};
    --color-secondary: ${LAYOUT_CONFIG.colorSecondary || '#00C6FF'};
    --color-accent: ${LAYOUT_CONFIG.colorAccent || '#7DD3E8'};
    --color-glow: ${LAYOUT_CONFIG.colorGlow || '#BCEEFF'};
    --color-shadow: ${LAYOUT_CONFIG.colorShadow || '#4CA8C4'};
    --text-dark: #1a2332;
    --text-muted: #6b8299;
    --bounce: cubic-bezier(0.175, 0.885, 0.32, 1.275);
    --smooth: cubic-bezier(0.25, 1, 0.5, 1);
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body, html {
    min-height: 100%; width: 100%;
    font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
    overflow-x: hidden; color: var(--text-dark);
}
.grecaptcha-badge { visibility: hidden; }

/* Background Layer */
.bg-layer {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background-size: cover !important;
    background-position: center !important;
    background-repeat: no-repeat !important;
    z-index: 1;
    animation: zoomLoop 25s linear infinite alternate;
    filter: brightness(0.85);
}
.bg-gradient {
    background: linear-gradient(135deg, #0a1628 0%, #0d2847 50%, #061a33 100%);
}
@keyframes zoomLoop {
    0% { transform: scale(1); }
    100% { transform: scale(1.08); }
}

/* Animated Background Orbs */
.bg-orb {
    position: fixed; border-radius: 50%;
    filter: blur(100px); opacity: 0.4;
    z-index: 2; pointer-events: none;
}
.bg-orb-1 {
    width: 500px; height: 500px; top: -150px; left: -150px;
    background: var(--color-primary);
    animation: orbFloat1 20s ease-in-out infinite alternate;
}
.bg-orb-2 {
    width: 400px; height: 400px; bottom: -120px; right: -120px;
    background: var(--color-secondary);
    animation: orbFloat2 18s ease-in-out infinite alternate;
}
.bg-orb-3 {
    width: 300px; height: 300px; top: 40%; left: 60%;
    background: var(--color-accent); opacity: 0.25;
    animation: orbFloat3 22s ease-in-out infinite alternate;
}
@keyframes orbFloat1 {
    0% { transform: translate(0, 0) scale(1); }
    100% { transform: translate(80px, 100px) scale(1.15); }
}
@keyframes orbFloat2 {
    0% { transform: translate(0, 0) scale(1); }
    100% { transform: translate(-60px, -80px) scale(1.1); }
}
@keyframes orbFloat3 {
    0% { transform: translate(0, 0) scale(1); }
    100% { transform: translate(-100px, 50px) scale(0.9); }
}

/* Body Wrapper */
.body-wrapper {
    position: relative; width: 100%;
    min-height: 100vh; min-height: 100dvh;
    display: flex; justify-content: center; align-items: center;
    padding: clamp(10px, 2vh, 20px) 15px;
    z-index: 10;
}

/* Loading Screen */
.item-loader {
    position: fixed; top: 0; left: 0;
    width: 100vw; height: 100vh;
    background: radial-gradient(ellipse at center, #0d2847 0%, #0a1628 60%, #060e1a 100%);
    z-index: 9999;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    transition: opacity 0.6s ease, visibility 0.6s ease;
}
.item-loader.fade-out {
    opacity: 0; visibility: hidden;
}

/* Energy Release Exit Animation */
.item-loader.releasing .item-loader-crystal {
    animation: crystalCharge 0.8s ease-out forwards;
}
.item-loader.releasing .energy-ring {
    animation: ringBurst 0.6s ease-out forwards;
}
.item-loader.releasing .energy-ring-2 { animation-delay: 0.1s; }
.item-loader.releasing .energy-ring-3 { animation-delay: 0.2s; }
.item-loader.releasing .energy-particle {
    animation: particleBurst 0.5s ease-out forwards;
}
.item-loader.releasing .loader-text {
    animation: textFadeUp 0.4s ease-out forwards;
}
@keyframes crystalCharge {
    0%   { transform: translateY(0) scale(1); filter: drop-shadow(0 0 15px rgba(0, 145, 255, 0.6)); }
    40%  { transform: translateY(-5px) scale(1.15); filter: drop-shadow(0 0 40px rgba(188, 238, 255, 1)) drop-shadow(0 0 80px rgba(0, 145, 255, 0.8)); }
    100% { transform: translateY(0) scale(1.3); filter: drop-shadow(0 0 60px rgba(255, 255, 255, 1)) drop-shadow(0 0 120px rgba(188, 238, 255, 0.9)); opacity: 0; }
}
@keyframes ringBurst {
    0%   { transform: scale(1); opacity: 1; }
    100% { transform: scale(2.5); opacity: 0; border-color: rgba(188, 238, 255, 0.6); }
}
@keyframes particleBurst {
    0%   { opacity: 1; }
    100% { transform: translate(0, -60px) scale(0); opacity: 0; }
}
@keyframes textFadeUp {
    0%   { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(-20px); }
}

/* White flash overlay inside loader */
.loader-flash {
    position: absolute; top: 0; left: 0;
    width: 100%; height: 100%;
    background: radial-gradient(circle at center, rgba(255,255,255,1) 0%, rgba(188,238,255,0.6) 40%, transparent 70%);
    opacity: 0; z-index: 10;
    pointer-events: none;
}
.item-loader.releasing .loader-flash {
    animation: flashBurst 0.8s 0.3s ease-out forwards;
}
@keyframes flashBurst {
    0%   { opacity: 0; transform: scale(0.3); }
    50%  { opacity: 1; transform: scale(1.2); }
    100% { opacity: 1; transform: scale(3); }
}
.item-loader-crystal {
    width: clamp(80px, 18vw, 140px); height: auto;
    animation: crystalFloat 3s ease-in-out infinite, crystalPulseGlow 4s ease-in-out infinite;
    position: relative; z-index: 2;
}

/* Energy Glow Rings */
.crystal-container {
    position: relative;
    display: flex; align-items: center; justify-content: center;
}
.energy-ring {
    position: absolute; border-radius: 50%;
    border: 2px solid transparent;
    animation: ringPulse 3s ease-in-out infinite;
}
.energy-ring-1 {
    width: clamp(120px, 28vw, 220px); height: clamp(120px, 28vw, 220px);
    border-color: rgba(0, 145, 255, 0.3);
    animation-delay: 0s;
    box-shadow: 0 0 20px rgba(0, 145, 255, 0.15), inset 0 0 20px rgba(0, 145, 255, 0.08);
}
.energy-ring-2 {
    width: clamp(160px, 36vw, 290px); height: clamp(160px, 36vw, 290px);
    border-color: rgba(125, 211, 232, 0.2);
    animation-delay: 0.5s;
    box-shadow: 0 0 30px rgba(125, 211, 232, 0.1), inset 0 0 30px rgba(125, 211, 232, 0.05);
}
.energy-ring-3 {
    width: clamp(200px, 44vw, 360px); height: clamp(200px, 44vw, 360px);
    border-color: rgba(188, 238, 255, 0.12);
    animation-delay: 1s;
    box-shadow: 0 0 40px rgba(188, 238, 255, 0.08);
}
@keyframes ringPulse {
    0%, 100% { transform: scale(1); opacity: 0.5; }
    50% { transform: scale(1.08); opacity: 1; }
}
@keyframes crystalFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-12px); }
}
@keyframes crystalPulseGlow {
    0%, 100% { filter: drop-shadow(0 0 15px rgba(0, 145, 255, 0.6)) drop-shadow(0 0 40px rgba(0, 145, 255, 0.3)); }
    33%  { filter: drop-shadow(0 0 25px rgba(125, 211, 232, 0.8)) drop-shadow(0 0 60px rgba(125, 211, 232, 0.4)); }
    66%  { filter: drop-shadow(0 0 20px rgba(188, 238, 255, 0.9)) drop-shadow(0 0 50px rgba(188, 238, 255, 0.4)); }
}

/* Loader energy particles */
.energy-particles {
    position: absolute; width: 100%; height: 100%;
}
.energy-particle {
    position: absolute; width: 3px; height: 3px;
    background: var(--color-glow); border-radius: 50%;
    box-shadow: 0 0 6px rgba(188, 238, 255, 0.8);
}
.energy-particle:nth-child(1) { top: 10%; left: 20%; animation: particleDrift 4s ease-in-out infinite; }
.energy-particle:nth-child(2) { top: 80%; left: 70%; animation: particleDrift 3.5s ease-in-out 0.5s infinite; }
.energy-particle:nth-child(3) { top: 30%; left: 85%; animation: particleDrift 4.5s ease-in-out 1s infinite; }
.energy-particle:nth-child(4) { top: 70%; left: 15%; animation: particleDrift 3.8s ease-in-out 1.5s infinite; }
.energy-particle:nth-child(5) { top: 50%; left: 50%; animation: particleDrift 4.2s ease-in-out 0.8s infinite; }
@keyframes particleDrift {
    0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.4; }
    25% { transform: translate(15px, -20px) scale(1.5); opacity: 1; }
    50% { transform: translate(-10px, -35px) scale(0.8); opacity: 0.6; }
    75% { transform: translate(20px, -15px) scale(1.3); opacity: 0.9; }
}

/* Loader text */
.loader-text {
    margin-top: clamp(20px, 4vh, 35px);
    font-family: 'Nothing You Could Do', cursive;
    font-size: clamp(0.9rem, 3vw, 1.2rem);
    color: rgba(188, 238, 255, 0.7);
    letter-spacing: 2px;
    animation: textPulse 2s ease-in-out infinite;
    z-index: 2;
}
@keyframes textPulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
}

.splash-overlay {
    position: fixed; top: 50%; left: 50%;
    width: 10vw; height: 10vw;
    background: rgba(0, 145, 255, 0.4);
    border-radius: 50%;
    transform: translate(-50%, -50%) scale(0);
    z-index: 9998; pointer-events: none;
    opacity: 0;
}
.splash-overlay.active {
    animation: splashRipple 1.2s cubic-bezier(0.1, 0.8, 0.2, 1) forwards;
}
@keyframes splashRipple {
    0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
    100% { transform: translate(-50%, -50%) scale(35); opacity: 0; visibility: hidden; }
}

/* Glass Card */
.glass-card {
    backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.35);
    border-radius: 24px;
    padding: clamp(18px, 3vh, 30px);
    width: 100%; max-width: 440px;
    box-shadow:
        0 20px 40px rgba(0, 0, 0, 0.08),
        0 0 30px rgba(0, 145, 255, 0.12),
        inset 0 1px 0 rgba(255, 255, 255, 0.6);
    opacity: 0; transform: scale(0.85) translateY(40px);
    animation: gsapPop 1s var(--bounce) 0.5s forwards;
    z-index: 15;
    position: relative;
    scrollbar-width: thin;
    scrollbar-color: rgba(0,145,255,0.3) transparent;
}
.glass-card::-webkit-scrollbar { width: 5px; }
.glass-card::-webkit-scrollbar-track { background: transparent; }
.glass-card::-webkit-scrollbar-thumb { background: rgba(0,145,255,0.3); border-radius: 3px; }
@keyframes gsapPop {
    0% { opacity: 0; transform: scale(0.85) translateY(40px); }
    60% { opacity: 1; transform: scale(1.02) translateY(-5px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
}

/* Page System — Flow-based (no absolute positioning) */
.page-container { position: relative; overflow: hidden; }
.page { display: none; width: 100%; }
.page.active { display: block; animation: pageSlideIn 0.5s var(--smooth) forwards; }
.page-1.active { display: block; }
@keyframes pageSlideIn {
    0% { opacity: 0; transform: translateX(30px); }
    100% { opacity: 1; transform: translateX(0); }
}
@keyframes pageSlideInReverse {
    0% { opacity: 0; transform: translateX(-30px); }
    100% { opacity: 1; transform: translateX(0); }
}
.page.active.from-left { animation: pageSlideInReverse 0.5s var(--smooth) forwards; }

/* Stagger Animations */
.stagger-1 { opacity: 0; transform: translateY(20px); animation: slideUpFade 0.8s var(--bounce) 0.9s forwards; }
.stagger-2 { opacity: 0; transform: translateX(-20px); animation: slideSideFade 0.8s var(--smooth) 1.05s forwards; }
.stagger-3 { opacity: 0; transform: translateY(20px); animation: slideUpFade 0.8s var(--bounce) 1.2s forwards; }
.stagger-4 { opacity: 0; transform: translateY(20px); animation: slideUpFade 0.8s var(--bounce) 1.35s forwards; }
.stagger-5 { opacity: 0; transform: translateY(20px); animation: slideUpFade 0.8s var(--bounce) 1.5s forwards; }
.stagger-6 { opacity: 0; transform: translateY(10px); animation: slideFadeScale 0.8s var(--smooth) 1.65s forwards; }
@keyframes slideUpFade { to { opacity: 1; transform: translateY(0); } }
@keyframes slideSideFade { to { opacity: 1; transform: translateX(0); } }
@keyframes slideFadeScale { to { opacity: 1; transform: translateY(0) scale(1); } }

/* Typography */
.card-title {
    text-align: center;
    font-size: clamp(1.2rem, 4vw, 1.6rem);
    font-weight: 700; color: var(--color-primary);
    margin-bottom: 5px;
    text-shadow: 0 2px 8px rgba(0, 145, 255, 0.2);
}
.card-subtitle {
    text-align: center;
    font-size: clamp(0.8rem, 2.5vw, 0.9rem);
    color: var(--text-muted); font-weight: 500;
    margin-bottom: clamp(10px, 2vh, 18px);
}
.latin-text {
    font-family: 'Nothing You Could Do', cursive;
}

/* Item Showcase */
.item-showcase {
    text-align: center; margin-bottom: clamp(8px, 1.5vh, 12px);
}
.item-img {
    width: clamp(70px, 15vw, 110px); height: auto;
    animation: floatSway 4s ease-in-out infinite, itemGlow 6s ease-in-out infinite;
}
@keyframes floatSway {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    25% { transform: translateY(-8px) rotate(-2deg); }
    75% { transform: translateY(5px) rotate(2deg); }
}
@keyframes itemGlow {
    0%   { filter: drop-shadow(0 0 12px rgba(0, 145, 255, 0.7)); }
    25%  { filter: drop-shadow(0 0 18px rgba(125, 211, 232, 0.8)); }
    50%  { filter: drop-shadow(0 0 22px rgba(188, 238, 255, 0.9)); }
    75%  { filter: drop-shadow(0 0 18px rgba(76, 168, 196, 0.8)); }
    100% { filter: drop-shadow(0 0 12px rgba(0, 145, 255, 0.7)); }
}
.item-label {
    font-size: clamp(0.7rem, 2vw, 0.8rem);
    color: var(--text-muted); font-weight: 500;
    text-align: center; margin-bottom: clamp(6px, 1vh, 10px);
}

/* Form Inputs */
.form-group { position: relative; margin-bottom: clamp(12px, 2vh, 18px); padding-bottom: 16px; }
.form-group i.input-icon {
    position: absolute; top: calc(50% - 8px); transform: translateY(-50%);
    left: 14px; color: var(--color-primary); font-size: 0.9rem; z-index: 2;
}
.form-group .fee-label {
    font-size: clamp(0.55rem, 1.5vw, 0.65rem);
    position: absolute; top: calc(50% - 8px); transform: translateY(40%);
    right: 10px; color: var(--text-muted);
    text-decoration: underline;
}
.form-input {
    width: 100%;
    background: rgba(255, 255, 255, 0.45);
    border: 2px solid rgba(0, 145, 255, 0.15);
    border-radius: 14px;
    padding: 12px 14px 12px 40px;
    font-family: 'Poppins', sans-serif;
    font-size: clamp(0.85rem, 2.5vw, 0.95rem);
    color: var(--text-dark);
    transition: all 0.3s ease;
    backdrop-filter: blur(5px);
    outline: none;
}
.form-input:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(0, 145, 255, 0.12);
}
.form-error {
    display: none; color: #ff4757;
    font-size: clamp(0.65rem, 1.8vw, 0.75rem);
    font-weight: 600; padding-left: 5px;
    position: absolute; bottom: -2px; left: 0;
}

/* Donation Presets */
.donation-presets {
    display: flex; flex-wrap: wrap;
    justify-content: center;
    gap: 8px; margin-bottom: clamp(10px, 2vh, 16px);
}
.donation-box {
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    flex: 0 0 calc(33.333% - 6px);
    max-width: calc(33.333% - 6px);
    background: rgba(255, 255, 255, 0.3);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.4);
    border-radius: 14px; padding: 8px 4px;
    cursor: pointer; transition: all 0.35s var(--bounce);
    min-height: 70px;
}
.donation-box:hover {
    transform: translateY(-3px) scale(1.03);
    border-color: var(--color-accent);
    box-shadow: 0 6px 20px rgba(0, 145, 255, 0.15);
}
.donation-box.selected {
    border-color: var(--color-primary);
    background: rgba(0, 145, 255, 0.12);
    box-shadow: 0 0 15px rgba(0, 145, 255, 0.2);
}
.donation-box img {
    width: clamp(28px, 6vw, 42px); height: auto;
    margin-bottom: 3px;
    filter: drop-shadow(0 0 6px rgba(0, 145, 255, 0.3));
    transition: filter 0.3s ease;
}
.donation-box:hover img, .donation-box.selected img {
    filter: drop-shadow(0 0 10px rgba(0, 145, 255, 0.6));
}
.donation-box small {
    font-size: clamp(0.55rem, 1.6vw, 0.7rem);
    color: var(--text-dark); font-weight: 600;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    max-width: 100%;
}

/* Payment Methods */
.payment-methods {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px; margin-bottom: clamp(10px, 2vh, 16px);
}
.payment-box {
    display: flex; align-items: center; justify-content: center;
    background: rgba(255, 255, 255, 0.4);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.4);
    border-radius: 14px; padding: 10px 6px;
    cursor: pointer; transition: all 0.35s var(--bounce);
    min-height: 65px;
}
.payment-box:hover {
    transform: translateY(-3px) scale(1.03);
    border-color: var(--color-accent);
    box-shadow: 0 6px 20px rgba(0, 145, 255, 0.15);
}
.payment-box.selected {
    border-color: var(--color-primary);
    background: rgba(0, 145, 255, 0.12);
    box-shadow: 0 0 15px rgba(0, 145, 255, 0.2);
}
.payment-box img {
    width: 100%; max-width: 72px; max-height: 50px;
    object-fit: contain;
}
.payment-box b { font-size: 0.75rem; color: var(--text-dark); }

/* Buttons */
.btn-gradient {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    width: 100%; padding: clamp(12px, 2vh, 16px) 24px;
    background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
    border: none; border-radius: 16px;
    color: #fff; font-size: clamp(0.9rem, 3vw, 1.05rem);
    font-weight: 700; font-family: 'Poppins', sans-serif;
    cursor: pointer; text-decoration: none;
    transition: all 0.4s var(--bounce);
    box-shadow: 0 4px 18px rgba(0, 145, 255, 0.35);
    text-transform: uppercase; letter-spacing: 0.5px;
}
.btn-gradient:hover {
    transform: translateY(-4px) scale(1.03);
    box-shadow: 0 12px 30px rgba(0, 145, 255, 0.45);
    background: linear-gradient(135deg, var(--color-secondary), var(--color-accent));
}
.btn-gradient:active { transform: translateY(2px) scale(0.98); }

.btn-donate {
    animation: pulseGlow 2s ease-in-out infinite;
}
@keyframes pulseGlow {
    0%, 100% { box-shadow: 0 4px 18px rgba(0, 145, 255, 0.35); }
    50% { box-shadow: 0 4px 30px rgba(0, 145, 255, 0.55), 0 0 40px rgba(0, 145, 255, 0.15); }
}

.btn-back {
    position: absolute; top: 10px; left: 10px;
    background: none; border: none; color: rgba(255,255,255,0.8);
    font-size: 1.2rem; cursor: pointer;
    transition: all 0.3s ease; z-index: 5;
    width: 36px; height: 36px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(5px);
    background: rgba(255,255,255,0.15);
}
.btn-back:hover { background: rgba(255,255,255,0.3); transform: scale(1.1); }

.btn-nav {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    padding: 10px 28px;
    background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
    border: none; border-radius: 50px;
    color: #fff; font-size: clamp(0.85rem, 2.5vw, 0.95rem);
    font-weight: 600; font-family: 'Poppins', sans-serif;
    cursor: pointer; transition: all 0.3s var(--bounce);
    box-shadow: 0 4px 15px rgba(0, 145, 255, 0.3);
}
.btn-nav:hover {
    transform: translateY(-3px) scale(1.05);
    box-shadow: 0 8px 25px rgba(0, 145, 255, 0.4);
}

/* Glass Modal */
.glass-modal-overlay {
    position: fixed; top: 0; left: 0;
    width: 100vw; height: 100vh;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
    z-index: 1000;
    display: none; align-items: center; justify-content: center;
    opacity: 0; transition: opacity 0.3s ease;
}
.glass-modal-overlay.active { display: flex; opacity: 1; }
.glass-modal {
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.5);
    border-radius: 24px; padding: clamp(20px, 4vh, 35px);
    max-width: 380px; width: 90%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
    text-align: center;
    animation: gsapPop 0.5s var(--bounce) forwards;
}
.modal-icon { font-size: 3rem; margin-bottom: 12px; }
.modal-icon.success { color: #00c853; }
.modal-icon.pending { color: #ffb300; }
.modal-icon.error { color: #ff4757; }
.modal-title { font-size: 1.1rem; font-weight: 700; color: var(--text-dark); margin-bottom: 16px; }
.modal-actions { display: flex; gap: 8px; justify-content: center; }
.modal-btn {
    padding: 10px 24px; border: none; border-radius: 12px;
    font-family: 'Poppins', sans-serif; font-weight: 600;
    font-size: 0.85rem; cursor: pointer; transition: all 0.3s ease;
}
.modal-btn-primary {
    background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
    color: white; box-shadow: 0 4px 15px rgba(0,145,255,0.3);
}
.modal-btn-primary:hover { transform: translateY(-2px); }
.modal-btn-secondary {
    background: rgba(0,0,0,0.08); color: var(--text-dark);
}
.modal-btn-secondary:hover { background: rgba(0,0,0,0.15); }
.modal-btn-danger {
    background: linear-gradient(135deg, #ff4757, #ff6b81);
    color: white;
}
.modal-btn-danger:hover { transform: translateY(-2px); }

/* Celebration Video */
.celebration-video {
    position: fixed; top: 0; left: 0;
    width: 100vw; height: 100vh;
    object-fit: cover; z-index: 4;
    display: none;
}
.celebration-video.active {
    display: block;
    animation: videoReveal 1.5s ease forwards;
}
.celebration-video.hiding {
    animation: videoFadeOut 1.5s ease forwards;
}
@keyframes videoReveal {
    0% { opacity: 0; transform: scale(1.1); filter: brightness(0); }
    30% { opacity: 0.5; filter: brightness(0.8); }
    100% { opacity: 0.55; transform: scale(1); filter: brightness(1); }
}
@keyframes videoFadeOut {
    0% { opacity: 0.55; }
    100% { opacity: 0; visibility: hidden; }
}

/* Confetti Container */
.confetti-container {
    position: fixed; top: 0; left: 0;
    width: 100%; height: 100%;
    z-index: 6; pointer-events: none;
}

/* Stage Dimming — concert lights off while media loads */
.stage-dimming {
    position: fixed; top: 0; left: 0;
    width: 100vw; height: 100vh;
    background: rgba(0, 0, 0, 0.7);
    z-index: 9000; pointer-events: none;
    opacity: 0;
    transition: opacity 0.5s ease;
}
.stage-dimming.active { opacity: 1; }
.stage-dimming.lifting {
    opacity: 0;
    transition: opacity 0.8s ease;
}

/* Light Trail Sweep — concert spotlight beam */
.light-trail {
    position: fixed; top: 0; left: 0;
    width: 100vw; height: 100vh;
    z-index: 8; pointer-events: none;
    opacity: 0; overflow: hidden;
}
.light-trail.active { opacity: 1; }
.light-trail-beam {
    position: absolute;
    top: -20%; left: -60%;
    width: 40%; height: 140%;
    background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(188, 238, 255, 0.05) 20%,
        rgba(0, 145, 255, 0.15) 35%,
        rgba(255, 255, 255, 0.6) 48%,
        rgba(255, 255, 255, 0.9) 50%,
        rgba(255, 255, 255, 0.6) 52%,
        rgba(0, 145, 255, 0.15) 65%,
        rgba(188, 238, 255, 0.05) 80%,
        transparent 100%
    );
    transform: rotate(15deg);
    filter: blur(2px);
}
.light-trail.active .light-trail-beam {
    animation: lightSweep 1s cubic-bezier(0.25, 0.1, 0.25, 1) forwards;
}
@keyframes lightSweep {
    0%   { left: -60%; opacity: 0; }
    10%  { opacity: 1; }
    90%  { opacity: 1; }
    100% { left: 120%; opacity: 0; }
}

/* Glare Effect — sun reflection bloom */
.glare-overlay {
    position: fixed; top: 0; left: 0;
    width: 100vw; height: 100vh;
    z-index: 8; pointer-events: none;
    display: flex; align-items: center; justify-content: center;
    opacity: 0;
}
.glare-overlay.active { opacity: 1; }
.glare-core {
    width: 4px; height: 4px;
    border-radius: 50%;
    background: #fff;
    box-shadow:
        0 0 20px 10px rgba(255, 255, 255, 0.8),
        0 0 60px 30px rgba(188, 238, 255, 0.5),
        0 0 120px 60px rgba(0, 145, 255, 0.3);
}
.glare-overlay.active .glare-core {
    animation: glareBloom 1s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
}
@keyframes glareBloom {
    0%   { transform: scale(1); opacity: 0.6; }
    20%  { transform: scale(3); opacity: 1; }
    50%  { transform: scale(15); opacity: 1;
           box-shadow: 0 0 80px 40px rgba(255,255,255,0.9), 0 0 200px 100px rgba(188,238,255,0.6), 0 0 400px 200px rgba(0,145,255,0.3); }
    80%  { transform: scale(80); opacity: 1;
           box-shadow: 0 0 200px 100px rgba(255,255,255,1), 0 0 500px 250px rgba(255,255,255,0.8); }
    100% { transform: scale(200); opacity: 0;
           box-shadow: 0 0 0 0 transparent; }
}

/* Thank You Page (Page 3) */
.thankyou-img {
    width: clamp(40%, 50vw, 55%); height: auto;
    margin-bottom: 12px;
    filter: drop-shadow(0 6px 16px rgba(0, 0, 0, 0.15));
}
.quote-card {
    font-family: 'Nothing You Could Do', cursive;
    font-size: clamp(0.8rem, 2.5vw, 0.95rem);
    background: rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(10px);
    border-radius: 14px; padding: 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
    border: 1px solid rgba(255,255,255,0.4);
    line-height: 1.6;
}
.quote-author {
    text-align: right; font-size: 0.8rem;
    color: var(--text-muted); font-weight: 700;
    margin-top: 8px; font-family: 'Comic Neue', cursive;
}

/* Footer */
.footer-text {
    text-align: center; font-size: 0.75rem;
    color: var(--text-muted); margin-top: clamp(8px, 1.5vh, 14px);
    font-weight: 500;
}

/* Range Slider (for slider preset option) */
.form-range {
    width: 100%; height: 6px; appearance: none;
    background: rgba(0,145,255,0.15); border-radius: 3px; outline: none;
}
.form-range::-webkit-slider-thumb {
    appearance: none; width: 20px; height: 20px;
    background: var(--color-primary); border-radius: 50%;
    cursor: pointer; box-shadow: 0 2px 8px rgba(0,145,255,0.4);
}

/* Scrollbar */
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(0,145,255,0.3); border-radius: 3px; }

/* Responsive */
@media (max-width: 400px) {
    .donation-presets { grid-template-columns: repeat(3, 1fr); }
    .payment-methods { grid-template-columns: repeat(3, 1fr); }
    .payment-box { min-height: 55px; padding: 8px 4px; }
    .payment-box img { max-width: 60px; max-height: 40px; }
}
@media (min-width: 768px) {
    .glass-card { max-width: 460px; }
}
@media (max-height: 650px) {
    .glass-card { padding: clamp(10px, 2vh, 18px); }
    .item-img { width: clamp(50px, 10vw, 70px); }
    .donation-box { min-height: 55px; }
}
        </style>
    </head>
    <body>
            <!-- Loading Screen -->
    <div class="item-loader" id="itemLoader">
        <div class="loader-flash"></div>
        <div class="crystal-container">
            <div class="energy-ring energy-ring-1"></div>
            <div class="energy-ring energy-ring-2"></div>
            <div class="energy-ring energy-ring-3"></div>
            <div class="energy-particles">
                <div class="energy-particle"></div>
                <div class="energy-particle"></div>
                <div class="energy-particle"></div>
                <div class="energy-particle"></div>
                <div class="energy-particle"></div>
            </div>
            <img src="${ENV.Donation_ItemThumbnail}" alt="${ENV.Donation_ItemName}" class="item-loader-crystal">
        </div>
        <p class="loader-text">${LAYOUT_CONFIG.loadingText || ''}</p>
    </div>
    <div class="splash-overlay" id="splashOverlay"></div>

    <!-- Background -->
    <div class="bg-layer" style="background-image:url(${ENV.Style_BackgroundImage})"></div>
    <div class="bg-orb bg-orb-1"></div>
    <div class="bg-orb bg-orb-2"></div>
    <div class="bg-orb bg-orb-3"></div>

    <!-- Celebration Video (preload on page load) -->
    <video id="celebrationVideo" class="celebration-video" loop muted preload="auto">
        <source src="${ENV.PaymentSuccess_Video}" type="video/mp4">
    </video>
    <audio id="successAudio" src="${ENV.PaymentSuccess_Audio}" preload="auto"></audio>

    <!-- Stage Dimming Overlay -->
    <div id="stageDimming" class="stage-dimming"></div>

    <!-- Light Trail Sweep -->
    <div id="lightTrail" class="light-trail">
        <div class="light-trail-beam"></div>
    </div>

    <!-- Glare Bloom -->
    <div id="glareOverlay" class="glare-overlay">
        <div class="glare-core"></div>
    </div>

    <!-- Confetti -->
    <div id="confetti-container" class="confetti-container"></div>

    <div class="body-wrapper">
        <div class="glass-card">
            <form id="donationForm">
                <div class="page-container" id="pageContainer">

                    <!-- PAGE 1: Donation Amount -->
                    <div class="page page-1 active" id="page1">
                        <h1 class="card-title stagger-1 latin-text">${ENV.Donation_Name}</h1>

                        <div class="item-showcase stagger-2">
                            <img src="${ENV.Donation_ItemThumbnail}" alt="${ENV.Donation_ItemName}" class="item-img">
                        </div>
                        <p class="item-label stagger-2">${ENV.Donation_Currency}. ${ENV.Donation_MinAmount} / 1 ${ENV.Donation_ItemName}</p>

                        <div class="form-group stagger-3">
                            <i class="${ENV.Donation_CurrencySymbol} input-icon"></i>
                            <span class="fee-label">Not Including Fees + ${ENV.Donation_CountryVAT}% VAT</span>
                            <input type="number" class="form-input" id="amount" name="amount" min="${ENV.Donation_MinAmount}" step="${ENV.Donation_StepAmount}" placeholder="Enter amount" required>
                            <div class="form-error" id="amountError"></div>
                        </div>

                        ${LAYOUT_CONFIG.presetStyle === 'slider' ? `
                        <div class="stagger-4" style="margin-bottom:12px;">
                            <input type="range" id="amountSlider" min="0" max="10" value="0" step="1" class="form-range">
                            <div style="display:flex;justify-content:space-between;padding:0 4px;">
                                <span style="font-size:0.7rem;color:var(--text-muted)"><i class="fa-duotone fa-solid fa-money-bill-wave"></i></span>
                                <span style="font-size:0.7rem;color:var(--text-muted)"><i class="fa-duotone fa-solid fa-wallet"></i></span>
                            </div>
                        </div>
                        ` : `
                        <div class="donation-presets stagger-4">
                            <div class="donation-box" data-amount="5000">
                                <img src="${ENV.Donation_ItemThumbnail}" alt="">
                                <small>5 ${ENV.Donation_ItemName}</small>
                            </div>
                            <div class="donation-box" data-amount="10000">
                                <img src="${ENV.Donation_ItemThumbnail}" alt="">
                                <small>10 ${ENV.Donation_ItemName}</small>
                            </div>
                            <div class="donation-box" data-amount="20000">
                                <img src="${ENV.Donation_ItemThumbnail}" alt="">
                                <small>20 ${ENV.Donation_ItemName}</small>
                            </div>
                            <div class="donation-box" data-amount="30000">
                                <img src="${ENV.Donation_ItemThumbnail}" alt="">
                                <small>30 ${ENV.Donation_ItemName}</small>
                            </div>
                            <div class="donation-box" data-amount="50000">
                                <img src="${ENV.Donation_ItemThumbnail}" alt="">
                                <small>50 ${ENV.Donation_ItemName}</small>
                            </div>
                            <div class="donation-box" data-amount="100000">
                                <img src="${ENV.Donation_ItemThumbnail}" alt="">
                                <small>100 ${ENV.Donation_ItemName}</small>
                            </div>
                            <div class="donation-box" data-amount="200000">
                                <img src="${ENV.Donation_ItemThumbnail}" alt="">
                                <small>200 ${ENV.Donation_ItemName}</small>
                            </div>
                            <div class="donation-box" data-amount="300000">
                                <img src="${ENV.Donation_ItemThumbnail}" alt="">
                                <small>300 ${ENV.Donation_ItemName}</small>
                            </div>
                            <div class="donation-box" data-amount="500000">
                                <img src="${ENV.Donation_ItemThumbnail}" alt="">
                                <small>500 ${ENV.Donation_ItemName}</small>
                            </div>
                            <div class="donation-box" data-amount="1000000">
                                <img src="${ENV.Donation_ItemThumbnail}" alt="">
                                <small>1000 ${ENV.Donation_ItemName}</small>
                            </div>
                        </div>
                        `}

                        <input type="hidden" id="itemAmount" name="itemAmount">

                        <div class="stagger-5" style="text-align:center;margin-top:clamp(8px,1.5vh,14px);">
                            <button type="button" class="btn-nav" id="btnNextP2">Next <i class="fad fa-arrow-right"></i></button>
                        </div>

                        <p class="footer-text stagger-6">Donation Organized with ♥ by ${ENV.SEO_Author}</p>
                    </div>

                    <!-- PAGE 2: User Details & Payment -->
                    <div class="page page-2" id="page2">
                        <button type="button" class="btn-back" id="btnPrevP1"><i class="fad fa-arrow-left"></i></button>

                        <h1 class="card-title" style="margin-top:8px;">Payments</h1>
                        <p class="card-subtitle">Complete your support</p>

                        <div class="form-group">
                            <i class="fa-duotone fa-solid fa-user-large input-icon"></i>
                            <input type="text" class="form-input" id="name" name="name" placeholder="Your Full Name" required>
                            <div class="form-error" id="nameError"></div>
                        </div>
                        <div class="form-group">
                            <i class="fa-duotone fa-solid fa-envelope input-icon"></i>
                            <input type="email" class="form-input" id="email" name="email" placeholder="Your Email Address" required>
                            <div class="form-error" id="emailError"></div>
                        </div>

                        <div class="payment-methods">
                            <div class="payment-box" data-method="gopay">
                                <img src="https://d2f3dnusg0rbp7.cloudfront.net/snap/v4/assets/gopay-54a920655c809232af3d38437181f5aa1e439186b6630aa5fe585862aba0a726.svg" alt="GoPay">
                            </div>
                            <div class="payment-box" data-method="shopeepay">
                                <img src="https://d2f3dnusg0rbp7.cloudfront.net/snap/v4/assets/shopeepay-befa05d168fe30229a3a68f8520595ceee165df888500c15502eb6f6ff26301c.svg" alt="ShopeePay">
                            </div>
                            <div class="payment-box" data-method="other_qris">
                                <img src="https://d2f3dnusg0rbp7.cloudfront.net/snap/v4/assets/qris-5ab65ea8ea12e00daee664042ed976a75c574fcd2fb1acd04e6cfc773d9bda54.svg" alt="QRIS">
                            </div>
                            <div class="payment-box" data-method="echannel">
                                <img src="https://d2f3dnusg0rbp7.cloudfront.net/snap/v4/assets/mandiri-23c931af42c624b4533ed48ac3020f2b820f20c7ad08fb9cf764140e5edbe496.svg" alt="Mandiri">
                            </div>
                            <div class="payment-box" data-method="bri_va">
                                <img src="https://d2f3dnusg0rbp7.cloudfront.net/snap/v4/assets/bri-39f5d44b1c42e70ad089fc52b909ef410d708d563119eb0da3a6abd49c4a595c.svg" alt="BRI">
                            </div>
                            <div class="payment-box" data-method="cimb_va">
                                <img src="https://d2f3dnusg0rbp7.cloudfront.net/snap/v4/assets/cimb-8cdeff8bcc97c201e04191ecea910962456380170f49405183916ac3baa0aa4a.svg" alt="CIMB Niaga">
                            </div>
                            <div class="payment-box" data-method="bni_va">
                                <img src="https://d2f3dnusg0rbp7.cloudfront.net/snap/v4/assets/bni-163d98085f5fe9df4068b91d64c50f5e5b347ca2ee306d27954e37b424ec4863.svg" alt="BNI">
                            </div>
                            <div class="payment-box" data-method="permata_va">
                                <img src="https://d2f3dnusg0rbp7.cloudfront.net/snap/v4/assets/permata-77d3668acb7e446acc1baf2175c8f661b53724693ac0bbd9437f7c965ca31063.svg" alt="Permata">
                            </div>
                            <div class="payment-box" data-method="other_va">
                                <b>Others Bank</b>
                            </div>
                        </div>

                        <input type="hidden" id="paymentMethod" name="paymentMethod" required>

                        <button type="submit" class="btn-gradient btn-donate">
                            Give Support <i class="fa-duotone fa-solid fa-heart"></i>
                        </button>
                    </div>

                    <!-- PAGE 3: Thank You -->
                    <div class="page page-3" id="page3">
                        <h1 class="card-title latin-text" style="margin-bottom:12px;">
                            <i class="fa-duotone fa-solid fa-heart"></i>&ensp; Thank you &ensp;<i class="fa-duotone fa-solid fa-heart"></i>
                        </h1>
                        <div style="text-align:center;">
                            <img src="${ENV.PaymentSuccess_Image}" alt="Thank You" class="thankyou-img">
                        </div>
                        <div class="quote-card">
                            <p>${ENV.PaymentSuccess_Text}</p>
                            <p class="quote-author">&mdash; ${ENV.SEO_Author}</p>
                        </div>
                    </div>

                </div>
            </form>
        </div>
    </div>

    <!-- Glass Modals -->
    <div class="glass-modal-overlay" id="paymentStatusOverlay">
        <div class="glass-modal">
            <div class="modal-icon" id="modalIcon"></div>
            <h3 class="modal-title" id="modalMessage"></h3>
            <div class="modal-actions">
                <button class="modal-btn modal-btn-primary" id="modalContinueBtn">Continue</button>
                <button class="modal-btn modal-btn-secondary" id="modalCloseBtn">Close</button>
            </div>
        </div>
    </div>
    <div class="glass-modal-overlay" id="cancelOverlay">
        <div class="glass-modal">
            <div class="modal-icon"><i class="fa-duotone fa-solid fa-circle-question" style="color:var(--color-primary)"></i></div>
            <h3 class="modal-title">Are you sure to cancel this payment?</h3>
            <div class="modal-actions">
                <button class="modal-btn modal-btn-danger" id="confirmCancelBtn">Yes, Cancel</button>
                <button class="modal-btn modal-btn-secondary" id="keepPaymentBtn">No, Keep</button>
            </div>
        </div>
    </div>
        <script>
                    // Config reference
        const CONFIG = {
            successDisplay: '${LAYOUT_CONFIG.successDisplay}',
            presetStyle: '${LAYOUT_CONFIG.presetStyle}',
            showVideo: ${LAYOUT_CONFIG.showSuccessVideo},
            enableConfetti: ${LAYOUT_CONFIG.enableConfetti},
            enableAudio: ${LAYOUT_CONFIG.enableAudio},
            videoTransition: '${LAYOUT_CONFIG.videoTransition}',
            confettiTime: ${ENV.PaymentSuccess_ConfettiTime || 21000},
            minAmount: ${ENV.Donation_MinAmount},
            maxAmount: ${ENV.Donation_MaxAmount},
            stepAmount: ${ENV.Donation_StepAmount},
        };

        // DOM Elements
        const page1 = document.getElementById('page1');
        const page2 = document.getElementById('page2');
        const page3 = document.getElementById('page3');
        const pageContainer = document.getElementById('pageContainer');
        const amountInput = document.getElementById('amount');
        const nameInput = document.getElementById('name');
        const emailInput = document.getElementById('email');
        const paymentMethodInput = document.getElementById('paymentMethod');
        const amountError = document.getElementById('amountError');
        const nameError = document.getElementById('nameError');
        const emailError = document.getElementById('emailError');

        // Dynamic page container height
        // Not needed — flow-based pages auto-size

        // Item Loader — dismiss with energy release when page is fully loaded
        const loader = document.getElementById('itemLoader');
        const splash = document.getElementById('splashOverlay');
        window.addEventListener('load', () => {
            // Minimum display time 1.5s to let the idle animation be seen
            setTimeout(() => {
                if (!loader) return;

                // Phase 1: Energy release (crystal charges + rings burst + flash)
                loader.classList.add('releasing');

                // Phase 2: After flash peaks, fade out the entire loader
                setTimeout(() => {
                    loader.classList.add('fade-out');
                    if (splash) splash.classList.add('active');
                }, 900);

                // Phase 3: Clean up DOM
                setTimeout(() => {
                    loader.style.display = 'none';
                }, 1700);
            }, 1500);
        });

        // Navigation
        function showPage(from, to, direction) {
            from.classList.remove('active', 'from-left');
            to.classList.remove('from-left');
            if (direction === 'backward') to.classList.add('from-left');
            to.classList.add('active');
        }

        // Page 1 -> 2
        document.getElementById('btnNextP2').addEventListener('click', () => {
            let valid = true;
            if (!amountInput.value || parseFloat(amountInput.value) < CONFIG.minAmount) {
                amountError.innerHTML = amountInput.value ? 'Seriously? &#128580;' : 'Whoops, no need to rush!';
                amountError.style.display = 'block';
                valid = false;
            } else {
                amountError.style.display = 'none';
            }
            if (valid) showPage(page1, page2, 'forward');
        });

        // Page 2 -> 1
        document.getElementById('btnPrevP1').addEventListener('click', () => {
            showPage(page2, page1, 'backward');
        });

        // Email validation
        function validateEmail(email) {
            return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(String(email).toLowerCase());
        }

        // Donation box selection
        document.querySelectorAll('.donation-box').forEach(box => {
            box.addEventListener('click', () => {
                amountError.style.display = 'none';
                document.querySelectorAll('.donation-box').forEach(b => b.classList.remove('selected'));
                box.classList.add('selected');
                amountInput.value = parseInt(box.getAttribute('data-amount'));
            });
        });

        // Sync input with boxes
        amountInput.addEventListener('input', () => {
            const val = parseInt(amountInput.value);
            document.querySelectorAll('.donation-box').forEach(box => {
                const boxVal = parseInt(box.getAttribute('data-amount'));
                box.classList.toggle('selected', boxVal === val);
            });
        });

        // Arrow key step
        amountInput.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                let val = parseInt(amountInput.value) || 0;
                val += e.key === 'ArrowUp' ? CONFIG.stepAmount : -CONFIG.stepAmount;
                if (val < CONFIG.minAmount) val = CONFIG.minAmount;
                amountInput.value = val;
                amountInput.dispatchEvent(new Event('input'));
            }
        });

        // Round on blur
        amountInput.addEventListener('blur', () => {
            let val = parseInt(amountInput.value) || 0;
            if (val % CONFIG.minAmount !== 0) val = Math.ceil(val / CONFIG.stepAmount) * CONFIG.stepAmount;
            amountInput.value = val;
            if (val < CONFIG.minAmount) {
                amountError.innerHTML = 'Seriously? &#128580;';
                amountError.style.display = 'block';
            } else if (val > CONFIG.maxAmount) {
                amountError.innerHTML = 'Chill out mate, that&#39;s a lot of money &#128561;';
                amountError.style.display = 'block';
            } else {
                amountError.style.display = 'none';
            }
        });

        // Slider sync (if slider mode)
        if (CONFIG.presetStyle === 'slider') {
            const slider = document.getElementById('amountSlider');
            const amountMap = [2000, 5000, 10000, 20000, 30000, 50000, 100000, 200000, 300000, 500000, 1000000];
            if (slider) {
                slider.addEventListener('input', () => {
                    amountInput.value = amountMap[slider.value];
                    amountInput.dispatchEvent(new Event('input'));
                });
            }
        }

        // Payment method selection
        document.querySelectorAll('.payment-box').forEach(box => {
            box.addEventListener('click', () => {
                document.querySelectorAll('.payment-box').forEach(b => b.classList.remove('selected'));
                box.classList.add('selected');
                paymentMethodInput.value = box.getAttribute('data-method');
            });
        });

        // Payment state
        let lastTransactionToken = null;
        let isPaymentPending = false;

        // Form submit
        document.getElementById('donationForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const amount = parseInt(amountInput.value);
            if (amount < CONFIG.minAmount || amount > CONFIG.maxAmount) return;

            const formData = new URLSearchParams(new FormData(document.getElementById('donationForm')));

            function processPayment(data) {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', '/');
                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                xhr.onload = function() {
                    if (xhr.status === 200) {
                        const resp = JSON.parse(xhr.responseText);
                        lastTransactionToken = resp.token;
                        initiatePayment(lastTransactionToken);
                    }
                };
                xhr.send(data);
            }

            if ('${ENV.reCAPTCHA_SiteKey}'.trim() && '${ENV.reCAPTCHA_SecretKey}'.trim()) {
                grecaptcha.ready(function() {
                    grecaptcha.execute('${ENV.reCAPTCHA_SiteKey}', {action: 'submit'}).then(function(token) {
                        processPayment(formData.toString() + '&recaptchaToken=' + token);
                    });
                });
            } else {
                processPayment(formData.toString());
            }
        });

        // Initiate payment
        function initiatePayment(token) {
            snap.pay(token, {
                onSuccess: function(result) {
                    // Save donation to Firebase
                    const payload = JSON.stringify({
                        name: nameInput.value, email: emailInput.value,
                        amount: amountInput.value, paymentMethod: paymentMethodInput.value,
                        orderId: result.order_id, status: result.transaction_status
                    });
                    fetch('/save-donation', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: payload
                    });

                    if (CONFIG.successDisplay === 'thank_you_page') {
                        showPage(page2, page3, 'forward');
                        triggerCelebration();
                    } else {
                        displayModal('success', 'Thank you for your support');
                        triggerCelebration();
                    }
                    isPaymentPending = false;
                },
                onPending: function(result) {
                    displayModal('pending', 'The payment code is still active');
                    isPaymentPending = true;
                },
                onError: function(result) {
                    displayModal('error', 'Payment failed');
                    isPaymentPending = false;
                }
            });
        }

        // Glass Modal System
        function displayModal(status, message) {
            const overlay = document.getElementById('paymentStatusOverlay');
            const icon = document.getElementById('modalIcon');
            const msg = document.getElementById('modalMessage');
            const continueBtn = document.getElementById('modalContinueBtn');
            const closeBtn = document.getElementById('modalCloseBtn');

            const icons = {
                success: '<i class="fa-duotone fa-solid fa-heart modal-icon success"></i>',
                pending: '<i class="fa-duotone fa-solid fa-hourglass-start modal-icon pending"></i>',
                error: '<i class="fa-duotone fa-solid fa-circle-xmark modal-icon error"></i>'
            };
            icon.innerHTML = icons[status] || icons.error;
            msg.textContent = message;
            continueBtn.style.display = (status === 'pending') ? 'inline-block' : 'none';
            overlay.classList.add('active');
        }

        function closeModal(id) {
            document.getElementById(id).classList.remove('active');
        }

        // Modal buttons
        document.getElementById('modalContinueBtn').addEventListener('click', () => {
            closeModal('paymentStatusOverlay');
            if (isPaymentPending && lastTransactionToken) initiatePayment(lastTransactionToken);
        });

        document.getElementById('modalCloseBtn').addEventListener('click', () => {
            if (isPaymentPending) {
                closeModal('paymentStatusOverlay');
                document.getElementById('cancelOverlay').classList.add('active');
            } else {
                closeModal('paymentStatusOverlay');
            }
        });

        document.getElementById('confirmCancelBtn').addEventListener('click', () => {
            isPaymentPending = false;
            closeModal('cancelOverlay');
            displayModal('error', 'Payment has been canceled.');
            setTimeout(() => closeModal('paymentStatusOverlay'), 2000);
        });

        document.getElementById('keepPaymentBtn').addEventListener('click', () => {
            closeModal('cancelOverlay');
            if (isPaymentPending && lastTransactionToken) initiatePayment(lastTransactionToken);
        });

        // Preload celebration media on page load for instant playback
        const celebrationAudio = document.getElementById('successAudio');
        const celebrationVideo = document.getElementById('celebrationVideo');
        let mediaReady = false;

        function preloadCelebrationMedia() {
            const checks = [];
            if (CONFIG.enableAudio && celebrationAudio) {
                celebrationAudio.load();
                checks.push(new Promise(r => {
                    if (celebrationAudio.readyState >= 3) return r();
                    celebrationAudio.addEventListener('canplaythrough', r, { once: true });
                }));
            }
            if (CONFIG.showVideo && celebrationVideo) {
                celebrationVideo.load();
                checks.push(new Promise(r => {
                    if (celebrationVideo.readyState >= 3) return r();
                    celebrationVideo.addEventListener('canplaythrough', r, { once: true });
                }));
            }
            Promise.all(checks).then(() => { mediaReady = true; });
        }
        preloadCelebrationMedia();

        // Celebration: Confetti + Video + Audio — Synchronized
        function triggerCelebration() {
            const dimming = document.getElementById('stageDimming');

            function fireCelebration() {
                // Lift the stage lights
                if (dimming) {
                    dimming.classList.remove('active');
                    dimming.classList.add('lifting');
                    setTimeout(() => dimming.classList.remove('lifting'), 800);
                }

                // Fire audio
                if (CONFIG.enableAudio && celebrationAudio) {
                    celebrationAudio.currentTime = 0;
                    celebrationAudio.play().catch(() => {});
                }

                // Fire video
                if (CONFIG.showVideo && celebrationVideo) {
                    celebrationVideo.currentTime = 0;
                    celebrationVideo.classList.add('active');
                    celebrationVideo.play().catch(() => {});

                    // Video exit transition → then video fade-out
                    const transitionDelay = CONFIG.videoTransition === 'none' ? 0 : 500;
                    setTimeout(() => {
                        // Fire the chosen transition effect
                        if (CONFIG.videoTransition === 'sweep') {
                            const trail = document.getElementById('lightTrail');
                            if (trail) {
                                trail.classList.add('active');
                                setTimeout(() => trail.classList.remove('active'), 1200);
                            }
                        } else if (CONFIG.videoTransition === 'glare') {
                            const glare = document.getElementById('glareOverlay');
                            if (glare) {
                                glare.classList.add('active');
                                setTimeout(() => glare.classList.remove('active'), 1200);
                            }
                        }

                        // Video hides behind the transition effect
                        setTimeout(() => {
                            celebrationVideo.classList.remove('active');
                            celebrationVideo.classList.add('hiding');
                            setTimeout(() => {
                                celebrationVideo.classList.remove('hiding');
                                celebrationVideo.pause();
                                celebrationVideo.currentTime = 0;
                            }, 1500);
                        }, CONFIG.videoTransition === 'none' ? 0 : 300);
                    }, CONFIG.confettiTime - transitionDelay);
                }

                // Fire confetti
                if (CONFIG.enableConfetti) runCelebrationConfetti();
            }

            if (mediaReady) {
                // Media already buffered — instant fire! No delay.
                fireCelebration();
            } else {
                // Media not ready — dim the stage lights while waiting
                if (dimming) dimming.classList.add('active');
                const fallback = setTimeout(() => { fireCelebration(); }, 4000);
                const checks = [];
                if (CONFIG.enableAudio && celebrationAudio && celebrationAudio.readyState < 3) {
                    checks.push(new Promise(r => {
                        celebrationAudio.addEventListener('canplaythrough', r, { once: true });
                    }));
                }
                if (CONFIG.showVideo && celebrationVideo && celebrationVideo.readyState < 3) {
                    checks.push(new Promise(r => {
                        celebrationVideo.addEventListener('canplaythrough', r, { once: true });
                    }));
                }
                Promise.all(checks).then(() => {
                    clearTimeout(fallback);
                    mediaReady = true;
                    fireCelebration();
                });
            }
        }

        // 3-Phase Confetti System (GPU-resilient: works on software rendering too)
        function runCelebrationConfetti() {
            const colors = ['#0091FF', '#00C6FF', '#7DD3E8', '#BCEEFF', '#FFD700', '#FF69B4'];
            const useGpu = typeof OffscreenCanvas !== 'undefined';

            // Phase 1: Initial burst — staggered to avoid first-frame CPU overload
            setTimeout(() => {
                confetti({ particleCount: 80, angle: 60, spread: 70, startVelocity: 55, gravity: 0.7, ticks: 250, origin: { x: 0, y: 0.7 }, zIndex: 7, colors: colors, disableForReducedMotion: false });
            }, 50);
            setTimeout(() => {
                confetti({ particleCount: 80, angle: 120, spread: 70, startVelocity: 55, gravity: 0.7, ticks: 250, origin: { x: 1, y: 0.7 }, zIndex: 7, colors: colors, disableForReducedMotion: false });
            }, 120);
            setTimeout(() => {
                confetti({ particleCount: 60, angle: 90, spread: 120, startVelocity: 50, gravity: 0.6, ticks: 300, origin: { x: 0.5, y: 0.8 }, zIndex: 7, colors: colors, disableForReducedMotion: false });
            }, 500);

            // Phase 2: Sustained shimmer rain (1s - end-3s)
            const shimmerInterval = setInterval(() => {
                confetti({
                    particleCount: 3,
                    angle: 260 + Math.random() * 20,
                    spread: 20,
                    origin: { x: Math.random(), y: -0.1 },
                    colors: ['#FFD700', '#BCEEFF', '#0091FF'],
                    shapes: ['circle', 'square'],
                    gravity: 0.6, scalar: 0.8,
                    drift: -0.5 + Math.random(),
                    ticks: 300, zIndex: 7,
                    disableForReducedMotion: false
                });
            }, 200);

            // Phase 3: Grand finale (last 3s)
            const finaleTime = Math.max(CONFIG.confettiTime - 3000, 5000);
            setTimeout(() => {
                confetti({ particleCount: 100, spread: 360, startVelocity: 50, origin: { x: 0.5, y: 0.4 }, gravity: 0.6, ticks: 350, zIndex: 7, colors: colors, disableForReducedMotion: false });
                setTimeout(() => {
                    confetti({ particleCount: 60, spread: 180, startVelocity: 45, origin: { x: 0.3, y: 0.5 }, gravity: 0.7, ticks: 300, zIndex: 7, colors: colors, disableForReducedMotion: false });
                    confetti({ particleCount: 60, spread: 180, startVelocity: 45, origin: { x: 0.7, y: 0.5 }, gravity: 0.7, ticks: 300, zIndex: 7, colors: colors, disableForReducedMotion: false });
                }, 500);
            }, finaleTime);

            // Stop shimmer
            setTimeout(() => clearInterval(shimmerInterval), CONFIG.confettiTime);
        }
        <\/script>
    </body>
    </html>
    `;
}


// Function to generate the MidTrans transaction token
async function getMidTransToken(name, email, amount, paymentMethod, item_details) {
    const authHeader = 'Basic ' + btoa(ENV.Midtrans_ServerKey + ':');

    // Build the transaction data object to be sent to MidTrans
    const transactionData = {
        transaction_details: {
            order_id: 'support-' + Date.now(),
            gross_amount: amount,
        },
        customer_details: {
            first_name: name,
            email: email,
        },
        enabled_payments: [paymentMethod],
        item_details: item_details
    };

    // Function to determine which MidTrans Transactions environment to use (sandbox or production)
    async function getTransactionEnvironment() {
        // Check if the keys start with 'SB-' to determine if it's sandbox
        const isSandbox = ENV.Midtrans_ClientKey.startsWith('SB-') && ENV.Midtrans_ServerKey.startsWith('SB-');
        let url;

        if (isSandbox) {
            url = 'https://app.sandbox.midtrans.com/snap/v1/transactions';
        } else {
            url = 'https://app.midtrans.com/snap/v1/transactions';
        }
        return url;
    }

    // Set the correct Transactions environment URL for use in the donation form
    const TransactionEnvironment = await getTransactionEnvironment();

    // Send the transaction data to MidTrans via a POST request
    const response = await fetch(TransactionEnvironment, {
        method: 'POST',
        headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionData),
    });

    // Parse the JSON response to retrieve the transaction token
    const result = await response.json();
    return result.token;
}

// Optional: save donation information to Firebase
async function saveDonationToFirebase(donationData) {
    const { Firebase_DatabaseURL, Firebase_DatabaseSecret } = ENV;

    // If one is blank, do not save to Firebase
    if (!Firebase_DatabaseURL || !Firebase_DatabaseSecret) {
        console.log("Firebase not configured. Skipping donation storage.");
        return;
    }

    try {
        const firebaseUrl = `${Firebase_DatabaseURL}/donations.json?auth=${Firebase_DatabaseSecret}`;

        const response = await fetch(firebaseUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(donationData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.warn("Firebase save failed:", errorText);
        } else {
            console.log("Donation saved to Firebase.");
        }
    } catch (err) {
        console.error("Error saving to Firebase:", err.message);
    }
}  