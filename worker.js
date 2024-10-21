// Environment setting: Automatically detect 'sandbox' for testing or 'production' for live
const ENV = {
    // Midtrans API keys for payment gateway integration
    Midtrans_ClientKey: 'Mid-client-XXXXXXXXXXXXXXXXXXXX', // Client Key from Midtrans Dashboard *Required
    Midtrans_ServerKey : 'Mid-server-XXXXXXXXXXXXXXXXXXXX', // Server Key from Midtrans Dashboard *Required

    reCAPTCHA_SiteKey: '', // Site Key from Google reCAPTCHA (Leave blank if not using reCAPTCHA)
    reCAPTCHA_SecretKey: '', // Secret Key from Google reCAPTCHA (Leave blank if not using reCAPTCHA)
    reCAPTCHA_Score: '', // Minimum score for reCAPTCHA verification (Leave blank to use default 0.5)
    
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
                'other_va': 'Others Bank',
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
        <title>${ENV.SEO_Title || "Yuuki0 Support Platform"}</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="description" content="${ENV.SEO_Description}">
        <meta name="keywords" content="${ENV.SEO_Keywords || "donation, support, payment, payment gateway, serverless"}">
        <meta name="author" content="${ENV.SEO_Author || "Yuukio Fuyu"}">
        <meta name="robots" content="index, follow">
        <link rel="icon" href="${ENV.SEO_Favicon || "https://yuuki0.net/assets/img/icon.png"}" type="image/x-icon">

        <!-- Open Graph meta tags for social media sharing -->
        <meta property="og:title" content="${ENV.SEO_Title || "Yuuki0 Support Platform"}">
        <meta property="og:description" content="${ENV.SEO_Description}">
        <meta property="og:image" content="${ENV.SEO_Thumbnail}">
        <meta property="og:url" content="${ENV.SEO_URL}">
        <meta property="og:type" content="website">

        <!-- Twitter Card meta tags for Twitter sharing -->
        <meta name="twitter:card" content="${ENV.SEO_TwitterCard}">
        <meta name="twitter:title" content="${ENV.SEO_Title || "Yuuki0 Support Platform"}">
        <meta name="twitter:description" content="${ENV.SEO_Description}">
        <meta name="twitter:image" content="${ENV.SEO_Thumbnail}">

        <!-- SEO-friendly and responsive layout -->
        <link rel="canonical" href="${ENV.SEO_URL}">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="theme-color" content="${ENV.SEO_Color || "#0091ff"}">

        <!-- Importing fonts and necessary libraries -->
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <script src="https://www.google.com/recaptcha/api.js?render=${ENV.reCAPTCHA_SiteKey}"></script>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap" rel="stylesheet">
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/@tsparticles/confetti@3.0.3/tsparticles.confetti.bundle.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/tsparticles@2.3.3/tsparticles.bundle.min.js"></script>
        <link rel="stylesheet" href="https://atugatran.github.io/FontAwesome6Pro/css/all.min.css">
        <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
        <script src="${SnapEnvironment}" data-client-key="${ENV.Midtrans_ClientKey}"></script>

        <!-- Custom styling for the donation form -->
        <style>
            .grecaptcha-badge {
                visibility: hidden;
            }

            #backgroundVideo {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                object-fit: cover;
                z-index: -1;
                opacity: 0.4;
                display: none;
            }

            body {
                background-image: url(${ENV.Style_BackgroundImage});
                background-size: cover;
                background-repeat: no-repeat;
                background-position: right top;
                font-family: "Poppins", sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100dvh;
                margin: 0;
                z-index: 1;
            }

            h3 {
                color: #0091ff;
                font-weight: bold;
            }

            input[type="name"], 
            input[type="email"], 
            input[type="number"], 

            textarea {
                background: rgba(255, 255, 255, 0.4);
                border: 1px solid rgba(255, 255, 255, 0.5);
                border-radius: 8px;
                padding: 10px;
                width: 100%;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                transition: border-color 0.3s;
            }

            input[type="name"]:focus, 
            input[type="email"]:focus, 
            input[type="number"]:focus, 

            textarea:focus {
                border-color: rgba(255, 255, 255, 0.5);
                outline: none; 
            }
            
            .form-group {
                position: relative;
                z-index: 2;
            }

            .form-group i {
                position: absolute;
                top: 50%;
                transform: translateY(-50%);
                left: 10px;
            }

            .form-group u {
                font-size: 10px;
                position: absolute;
                top: 50%;
                transform: translateY(40%);
                right: 10px;
            }

            .form-group small {
                position: absolute;
                display: block;
                color: red;
                font-size: 12px;
                margin-top: 5px;
            }

            .form-group input {
                padding-left: 30px;
            }

            .error-message {
                color: red;
                font-size: 12px;
                margin-top: 5px;
                display: none;
            }

            .donation-form {
                background: rgba(255, 255, 255, 0.20);
                border-radius: 16px;
                box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 1);
                width: 100%;
                height: 820px;
                margin: 0 auto;
                max-width: 400px;
                overflow: hidden;
                position: relative;
                display: flex;
                flex-direction: column;
                justify-content: center;
                overflow: hidden;
                animation: fadeIn 1s;
            }

            .page {
                padding: 10px;
                box-sizing: border-box;
                transition: transform 0.5s ease-in-out;
            }

            .page-1, .page-2, .page-3 {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                padding: 20px;
                transition: transform 0.5s ease-in-out;
            }

            /* Default positions */
            .page-1 {
                transform: translateX(0); /* Page 1 starts on screen */
            }

            .page-2,
            .page-3 {
                transform: translateX(100%); /* Page 2 and 3 start off-screen to the right */
            }

            /* Show active pages */
            .page-1.show,
            .page-2.show,
            .page-3.show {
                transform: translateX(0); /* Show active page */
            }

            /* Hide pages when moving forward (Next) */
            .page-1.hide,
            .page-2.hide {
                transform: translateX(-100%); /* Move pages to the left when moving forward */
            }

            /* Hide pages when moving backward (Previous) */
            .page-2.hide-back,
            .page-3.hide-back {
                transform: translateX(100%); /* Move pages to the right when going back */
            }

            [class*='btn-next'] {
                background-color: #33aaff;
                color: white;
                position: absolute;
                width: auto;
                max-width: 100%;
                font-size: 16px;
                border-radius: 100px;
                transition: all 0.3s ease;
            }
            [class*='btn-next']:hover {
                background-color: #0091ff;
                color: white;
                transform: scale(1.05);
            }

            [class*='btn-prev'] {
                background-color: #33aaff;
                color: white;
                position: absolute;
                width: auto;
                max-width: 100%;
                font-size: 16px;
                border-radius: 100px;
                transition: all 0.3s ease;
            }
            [class*='btn-prev']:hover {
                background-color: #0091ff;
                color: white;
                transform: scale(1.05);
            }

            .payment-methods {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                gap: 10px;
            }

            .payment-box {
                flex: 1 1 calc(33% - 10px);
                max-width: calc(33% - 10px);
                border: 1px solid #ccc;
                border-radius: 10px;
                padding: 10px;
                text-align: center;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 80px;
            }

            .payment-box.selected {
                border-color: #0dcaf0;
                background-color: #e8f0f5;
            }

            .payment-box img {
                width: 100%;
                height: 92%;
                max-width: 86px;
                max-height: 80px;
                object-fit: contain;
                margin: 10px;
            }

            .donation-presets {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                gap: 10px;
            }

            .donation-box {
                flex: 1 1 calc(18% - 10px);
                max-width: calc(33% - 10px);
                border: 1px solid #ccc;
                border-radius: 10px;
                padding: 5px;
                text-align: center;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 80px;
            }

            .donation-box small {
                font-size: 12px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .donation-box img {
                width: 100%;
                height: 100%;
                max-width: 62px;
                height: 40px;
                object-fit: contain;
            }

            .donation-box.selected {
                border-color: #0dcaf0;
                background-color: #e8f0f5;
            }

            .btn-donate {
                background-color: #33aaff;
                color: white;
                position: absolute;
                width: 90%;
                font-size: 18px;
                bottom: 30px;
                transition: all 0.3s ease;
            }
            .btn-donate:hover {
                background-color: #0091ff;
                color: white;
                transform: scale(1.05);
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            /* Modal Popup Styling */
            .modal-status {
                text-align: center;
                padding: 30px;
            }
            .modal-status i {
                font-size: 50px;
                margin-bottom: 20px;
            }
            .modal-success i {
                color: #28a745;
            }
            .modal-pending i {
                color: #ffc107;
            }
            .modal-error i {
                color: #dc3545;
            }
            .confetti-container {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 3;
                pointer-events: none;
            }
            
            .quote-card {
                font: 16px Comic Neue, cursive;
                background: rgba(255, 255, 255, 0.8);
                border-radius: 10px;
                padding: 18px;
                box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
            }

            /* CSS Responsif */
            @media only screen and (min-width: 1200px) {

                img {
                    width: 60%;
                    height: auto;
                }

                .donation-form {
                    height: 90vh;
                }

                .donation-box {
                    flex: 1 1 calc(33% - 10px);
                    max-width: calc(33% - 10px);
                    padding: 5px;
                    height: 80px;
                }

                .donation-box img {
                    width: 60px;
                    height: auto;
                }
            }

            @media only screen and (max-height: 992px) {
                img {
                    width: 42%;
                    height: auto;
                }

                .donation-form {
                    height: 90vh;
                }

                .donation-box {
                    flex: 1 1 calc(33% - 10px);
                    max-width: calc(33% - 10px);
                    padding: 5px;
                    height: 80px;
                }

                .donation-box img {
                    width: 48px;
                    height: auto;
                }

                .donation-box small {
                    font-size: 80%;
                }

                .payment-box {
                    flex: 1 1 calc(33% - 10px);
                    max-width: calc(33% - 10px);
                    padding: 10px;
                    height: 80px;
                }
                
                .payment-box img {
                    width: auto;
                    height: 80%;
                }

                .quotes {
                    font-size: 80%;
                }
            }

            @media only screen and (max-height: 768px) {
                img {
                    width: 32%;
                    height: auto;
                }

                .donation-form {
                    height: 600px;
                }

                .donation-box {
                    flex: 1 1 calc(22% - 10px);
                    max-width: calc(33% - 10px);
                    padding: 5px;
                    height: 60px;
                }

                .donation-box img {
                    width: 36px;
                    height: auto;
                }

                .donation-box small {
                    font-size: 72%;
                }

                .payment-box {
                    flex: 1 1 calc(33% - 10px);
                    max-width: calc(33% - 10px);
                    padding: 5px;
                    height: 64px;
                }
                
                .payment-box img {
                    width: auto;
                    height: 72%;
                }

                .quotes {
                    font-size: 72%;
                }
            }

            @media only screen and (max-width: 576px) {
                img {
                    width: 30%;
                    height: auto;
                }

                .donation-form {
                    height: 100dvh;
                }

                .donation-box {
                    flex: 1 1 calc(33% - 10px);
                    max-width: calc(33% - 10px);
                    padding: 5px;
                    height: 64px;
                }

                .donation-box img {
                    width: 36px;
                    height: auto;
                }

                .donation-box small {
                    font-size: 72%;
                }

                .payment-box {
                    flex: 1 1 calc(33% - 10px);
                    max-width: calc(33% - 10px);
                    padding: 5px;
                    height: 78px;
                }
                
                .payment-box img {
                    width: auto;
                    height: 64%;
                }

                .quotes {
                    font-size: 72%;
                }
            }
        </style>
    </head>
    <body>
        <div class="donation-form">
            <form id="donationForm">
                <!-- Page 1: Donation amount selection -->
                <div class="page-1">
                    <h3 class="text-center mb-5">${ENV.Donation_Name || "Support Us"}</h3>
                    <div class="d-flex justify-content-center">
                        <img src="${ENV.Donation_ItemThumbnail}" width="120px">
                    </div>
                    <div class="my-2">
                        <small class="d-flex justify-content-center">${ENV.Donation_Currency}. ${ENV.Donation_MinAmount} / 1 ${ENV.Donation_ItemName}</small>
                    </div>

                    <!-- Input field for donation amount -->
                    <div class="form-group mb-5 position-relative">
                        <i class="${ENV.Donation_CurrencySymbol}"></i>
                        <u>Not Including Fees + ${ENV.Donation_CountryVAT}% VAT</u>
                        <input type="number" class="form-control" id="amount" name="amount" min="${ENV.Donation_MinAmount}" step="${ENV.Donation_StepAmount}" required>
                        <small class="position-absolute text-danger" id="amountError"></small>
                    </div>
        
                    <!-- Preset template donation amounts -->
                    <!-- Template Slider -->
                    <!--
                    <input type="range" id="amountSlider" min="0" max="10" value="0" step="1" class="form-range" style="width: 100%;">
                    <div class="d-flex justify-content-between">
                        <span><i class="fa-duotone fa-solid fa-money-bill-wave"></i></span>
                        <span><i class="fa-duotone fa-solid fa-wallet"></i></span>
                    </div>
                    -->

                    <!-- Template Box -->
                    <div class="d-flex donation-presets">
                        <!-- Quick option item 1 -->
                        <div class="donation-box d-flex flex-column align-items-center" data-amount="5000">
                            <img src="${ENV.Donation_ItemThumbnail}" alt="">
                            <small class="justify-content-center">5 ${ENV.Donation_ItemName}</small>
                        </div>
                        <!-- Quick option item 2 -->
                        <div class="donation-box d-flex flex-column align-items-center" data-amount="10000">
                            <img src="${ENV.Donation_ItemThumbnail}" alt="">
                            <small class="justify-content-center">10 ${ENV.Donation_ItemName}</small>
                        </div>
                        <!-- Quick option item 3 -->
                        <div class="donation-box d-flex flex-column align-items-center" data-amount="20000">
                            <img src="${ENV.Donation_ItemThumbnail}" alt="">
                            <small class="justify-content-center">20 ${ENV.Donation_ItemName}</small>
                        </div>
                        <!-- Quick option item 4 -->
                        <div class="donation-box d-flex flex-column align-items-center" data-amount="30000">
                            <img src="${ENV.Donation_ItemThumbnail}" alt="">
                            <small class="justify-content-center">30 ${ENV.Donation_ItemName}</small>
                        </div>
                        <!-- Quick option item 5 -->
                        <div class="donation-box d-flex flex-column align-items-center" data-amount="50000">
                            <img src="${ENV.Donation_ItemThumbnail}" alt="">
                            <small class="justify-content-center">50 ${ENV.Donation_ItemName}</small>
                        </div>
                        <!-- Quick option item 6 -->
                        <div class="donation-box d-flex flex-column align-items-center" data-amount="100000">
                            <img src="${ENV.Donation_ItemThumbnail}" alt="">
                            <small class="justify-content-center">100 ${ENV.Donation_ItemName}</small>
                        </div>
                        <!-- Quick option item 7 -->
                        <div class="donation-box d-flex flex-column align-items-center" data-amount="200000">
                            <img src="${ENV.Donation_ItemThumbnail}" alt="">
                            <small class="justify-content-center">200 ${ENV.Donation_ItemName}</small>
                        </div>
                        <!-- Quick option item 8 -->
                        <div class="donation-box d-flex flex-column align-items-center" data-amount="300000">
                            <img src="${ENV.Donation_ItemThumbnail}" alt="">
                            <small class="justify-content-center">300 ${ENV.Donation_ItemName}</small>
                        </div>
                        <!-- Quick option item 9 -->
                        <div class="donation-box d-flex flex-column align-items-center" data-amount="500000">
                            <img src="${ENV.Donation_ItemThumbnail}" alt="">
                            <small class="justify-content-center">500 ${ENV.Donation_ItemName}</small>
                        </div>
                        <!-- Quick option item 10 -->
                        <div class="donation-box d-flex flex-column align-items-center" data-amount="1000000">
                            <img src="${ENV.Donation_ItemThumbnail}" alt="">
                            <small class="justify-content-center">1000 ${ENV.Donation_ItemName}</small>
                        </div>
                    </div>

                    <!-- Hidden input to capture preset selections -->
                    <input type="hidden" id="itemAmount" name="itemAmount" required>
                    
                    <!-- Navigation button to move to the next page (user details) -->
                    <button type="button" class="btn btn-next-p2 start-50 bottom-0 translate-middle">Next <i class="fad fa-arrow-right"></i></button>
                </div>

                <!-- Page 2: User details and payment method -->
                <div class="page-2">
                    <!-- User's full name and email -->
                    <h3 class="text-center mb-5">Payments</h3>
                    <div class="form-group mb-3 position-relative">
                        <i class="fa-duotone fa-solid fa-user-large"></i>
                        <input type="name" class="form-control" id="name" name="name" placeholder="Your Full Name" required>
                        <small class="position-absolute text-danger" id="nameError"></small>
                    </div>
                    <div class="form-group mb-5 position-relative">
                        <i class="fa-duotone fa-solid fa-envelope"></i>
                        <input type="email" class="form-control" id="email" name="email" placeholder="Your Email Address" required>
                        <small class="position-absolute text-danger" id="emailError"></small>
                    </div>

                    <!-- Payment method selection -->
                    <div class="payment-methods">
                        <!-- Quick option payment method 1 -->
                        <div class="payment-box align-middle align-items-center" data-method="gopay">
                            <img src="https://d2f3dnusg0rbp7.cloudfront.net/snap/v4/assets/gopay-54a920655c809232af3d38437181f5aa1e439186b6630aa5fe585862aba0a726.svg" alt="GoPay">
                        </div>
                        <!-- Quick option payment method 2 -->
                        <div class="payment-box align-middle align-items-center" data-method="shopeepay">
                            <img src="https://d2f3dnusg0rbp7.cloudfront.net/snap/v4/assets/shopeepay-befa05d168fe30229a3a68f8520595ceee165df888500c15502eb6f6ff26301c.svg" alt="ShopeePay">
                        </div>
                        <!-- Quick option payment method 3 -->
                        <div class="payment-box align-middle align-items-center" data-method="other_qris">
                            <img src="https://d2f3dnusg0rbp7.cloudfront.net/snap/v4/assets/qris-5ab65ea8ea12e00daee664042ed976a75c574fcd2fb1acd04e6cfc773d9bda54.svg" slt="QRIS Lainnya">
                        </div>
                        <!-- Quick option payment method 4 -->
                        <div class="payment-box align-middle align-items-center" data-method="echannel">
                            <img src="https://d2f3dnusg0rbp7.cloudfront.net/snap/v4/assets/mandiri-23c931af42c624b4533ed48ac3020f2b820f20c7ad08fb9cf764140e5edbe496.svg" alt="Mandiri">
                        </div>
                        <!-- Quick option payment method 5 -->
                        <div class="payment-box align-middle align-items-center" data-method="bri_va">
                            <img src="https://d2f3dnusg0rbp7.cloudfront.net/snap/v4/assets/bri-39f5d44b1c42e70ad089fc52b909ef410d708d563119eb0da3a6abd49c4a595c.svg" alt="BRI">
                        </div>
                        <!-- Quick option payment method 6 -->
                        <div class="payment-box align-middle align-items-center" data-method="cimb_va">
                            <img src="https://d2f3dnusg0rbp7.cloudfront.net/snap/v4/assets/cimb-8cdeff8bcc97c201e04191ecea910962456380170f49405183916ac3baa0aa4a.svg" alt="CIMB Niaga">
                        </div>
                        <!-- Quick option payment method 7 -->
                        <div class="payment-box align-middle align-items-center" data-method="bni_va">
                            <img src="https://d2f3dnusg0rbp7.cloudfront.net/snap/v4/assets/bni-163d98085f5fe9df4068b91d64c50f5e5b347ca2ee306d27954e37b424ec4863.svg" alt="BNI">
                        </div>
                        <!-- Quick option payment method 8 -->
                        <div class="payment-box align-middle align-items-center" data-method="permata_va">
                            <img src="https://d2f3dnusg0rbp7.cloudfront.net/snap/v4/assets/permata-77d3668acb7e446acc1baf2175c8f661b53724693ac0bbd9437f7c965ca31063.svg" alt="Permata Bank">
                        </div>
                        <!-- Quick option payment method 9 -->
                        <div class="payment-box align-middle align-items-center" data-method="other_va">
                            <b>Others Bank</b>
                        </div>
                    </div>
            
                    <!-- Hidden input to capture method selections -->
                    <input type="hidden" id="paymentMethod" name="paymentMethod" required>
        
                    <!-- Navigation button to continued payment -->
                    <button type="submit" class="btn btn-donate">Give Support <i class="fa-duotone fa-solid fa-heart"></i></button>
                    <!-- Navigation button to move to the previous page (donation amount) -->
                    <button type="button" style="left:15px;top:15px;background-color:#00000000;color:#000;font-size:large;" class="btn btn-prev-p1"><i class="fad fa-arrow-left"></i></button>
                </div>

                <!-- Page 3: Thank you message after successful payment -->
                <div class="page-3">
                    <h3 class="text-center mb-5">
                        <i class="fa-duotone fa-solid fa-heart"></i>&ensp; Thank you &ensp;<i class="fa-duotone fa-solid fa-heart"></i>
                    </h3>
                    <div class="form-group mb-3 position-relative">
                        <div class="text-center mb-4">
                            <img src="${ENV.PaymentSuccess_Image}" alt="Thank You">
                        </div>
                        <div class="quote-card text-start">
                            <blockquote class="blockquote">
                                <p class="pb-3">
                                    <span class="lead font-italic quotes">${ENV.PaymentSuccess_Text}</span>
                                </p>
                            </blockquote>
                            <figcaption class="blockquote-footer text-end mb-0">${ENV.SEO_Author || "Yuukio Fuyu"}</figcaption>
                        </div>
                    </div>
                </div>
            </form>
        </div>

        <!-- Modal for confirming cancellation -->
        <div class="modal fade" id="cancelPaymentModal" tabindex="-1" aria-labelledby="cancelPaymentModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-body text-center">
                        <h4>Are You Sure to Cancel this Payment?</h4>
                    </div>
                    <div class="modal-footer">
                        <button type="button" id="confirmCancelBtn" class="btn btn-danger">Yes</button>
                        <button type="button" id="disprovePaymentBtn" class="btn btn-secondary" data-bs-dismiss="modal">No</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal for displaying transaction result -->
        <div class="modal fade" id="paymentStatusModal" tabindex="-1" aria-labelledby="paymentStatusModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-body modal-status">
                        <i id="modalStatusIcon"></i>
                        <h4 id="modalStatusMessage"></h4>
                    </div>
                    <div class="modal-footer">
                        <button type="button" id="continuePaymentBtn" class="btn btn-primary">Continue</button>
                        <button type="button" id="closePaymentBtn" class="btn btn-secondary">Close</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Fireworks and confetti effects containers for successful donations -->
        <div id="confetti-container" class="confetti-container"></div>
        <audio id="successAudio" src="${ENV.PaymentSuccess_Audio}"></audio>
        <video id="backgroundVideo" loop muted>
            <source src="${ENV.PaymentSuccess_Video}" type="video/mp4">
        </video>

        <!-- Javascript functions for the donation form -->
        <script>
            const page1 = document.querySelector('.page-1');
            const page2 = document.querySelector('.page-2');
            // const page3 = document.querySelector('.page-3');
            const btnNext2 = document.querySelector('.btn-next-p2');
            // const btnNext3 = document.querySelector('.btn-next-p3');
            const btnPrev1 = document.querySelector('.btn-prev-p1');
            // const btnPrev2 = document.querySelector('.btn-prev-p2');

            const amountInput = document.getElementById('amount');
            const itemBoxes = document.querySelectorAll('.donation-box');
            const errorMessage = document.getElementById('amountError');
            const nameInput = document.getElementById('name');
            const emailInput = document.getElementById('email');
            const paymentMethodInput = document.getElementById('paymentMethod');

            // Error message elements
            const amountError = document.createElement('small');
            const nameError = document.createElement('small');
            const emailError = document.createElement('small');

            // Styling for error messages
            amountError.classList.add('text-danger');
            amountError.style.display = 'none';
            nameError.classList.add('text-danger');
            nameError.style.display = 'none';
            emailError.classList.add('text-danger');
            emailError.style.display = 'none';

            // Add error message elements to DOM under each input
            amountInput.parentNode.appendChild(amountError);
            nameInput.parentNode.appendChild(nameError);
            emailInput.parentNode.appendChild(emailError);

            // Navigate from page 1 to page 2
            btnNext2.addEventListener('click', () => {
                let isValid = true;

                // Validate amount
                if (!amountInput.value) {
                    amountError.textContent = 'Whoops, no need to rush!';
                    amountError.style.display = 'block';
                    amountError.classList.add('fw-bold');
                    isValid = false;
                }
                else if (!amountInput.value || parseFloat(amountInput.value) < ${ENV.Donation_MinAmount}) {
                    amountError.style.display = 'none';
                    isValid = false;
                } else {
                    amountError.style.display = 'none';
                }
                
                // If valid, move to the second page
                if (isValid) {
                    page1.classList.add('hide');
                    page2.classList.remove('hide-back');
                    page2.classList.add('show');
                }
            });

            // Navigate from page 2 to page 3 (only if using page 3 as payment method)
            // btnNext3.addEventListener('click', () => {
            //     let isValid = true;
            //     // Validate name
            //     if (!nameInput.value) {
            //         nameError.textContent = 'Seriously, I'd like to get to know you';
            //         nameError.style.display = 'block';
            //          amountError.classList.add('fw-bold');
            //         isValid = false;
            //     } else {
            //         nameError.style.display = 'none';
            //     }
            //     // Validate email
            //     if (!emailInput.value || !validateEmail(emailInput.value)) {
            //         emailError.textContent = 'Seriously, I want to thank you';
            //         emailError.style.display = 'block';
            //         amountError.classList.add('fw-bold');
            //         isValid = false;
            //     } else {
            //         emailError.style.display = 'none';
            //     }
            //     // Validate payment method
            //     if (!paymentMethodInput.value) {
            //         alert('Running too fast and forgetting to pay');
            //         isValid = false;
            //     }
            //     // If valid, move to the next page
            //     if (isValid) {
            //         page2.classList.add('hide');
            //         page3.classList.remove('hide-back');
            //         page3.classList.add('show');
            //     }
            // });

            // Navigate back from page 2 to page 1
            btnPrev1.addEventListener('click', () => {
                page2.classList.add('hide-back');
                page1.classList.remove('hide');
                page1.classList.add('show');
            });

            // Navigate back from page 3 to page 2 (only if using page 3 as payment method)
            // btnPrev2.addEventListener('click', () => {
            //     page3.classList.add('hide-back');
            //     page2.classList.remove('hide');
            //     page2.classList.add('show');
            // });

            // Function to validate email format
            function validateEmail(email) {
                const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return re.test(String(email).toLowerCase());
            }

            // Function to update input amount when a donation box is selected
            itemBoxes.forEach(box => {
                box.addEventListener('click', () => {
                    itemBoxes.forEach(b => b.classList.remove('selected'));
                    box.classList.add('selected');

                    // Get the value from data-amount and set it to the amount input
                    const selectedAmount = parseInt(box.getAttribute('data-amount'));
                    amountInput.value = selectedAmount;
                });
            });

            // Function to synchronize input amount with selected donation box
            amountInput.addEventListener('input', () => {
                const currentAmount = parseInt(amountInput.value);
                
                // Highlight the selected box if the input amount matches
                itemBoxes.forEach(box => {
                    const boxAmount = parseInt(box.getAttribute('data-amount'));
                    if (boxAmount === currentAmount) {
                        box.classList.add('selected');
                    } else {
                        box.classList.remove('selected');
                    }
                });
            });

            // Event listener for amount input using up and down arrows
            amountInput.addEventListener('keydown', (event) => {
                if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                    event.preventDefault();
                    let currentValue = parseInt(amountInput.value) || 0;
                    if (event.key === 'ArrowUp') {
                        currentValue += ${ENV.Donation_StepAmount}; // Increase
                    } else {
                        currentValue -= ${ENV.Donation_StepAmount}; // Decrease
                    }

                    // Ensure the value does not go below Minimum Amount
                    if (currentValue < ${ENV.Donation_MinAmount}) {
                        currentValue = ${ENV.Donation_MinAmount};
                    }
                    amountInput.value = currentValue;
                }
            });

            // Function to round the value to the nearest step amount
            function roundToNearest(value) {
                if (value % ${ENV.Donation_MinAmount} === 0) {
                    return value; // If already a multiple of step amount, no rounding needed
                }
                return Math.ceil(value / ${ENV.Donation_StepAmount}) * ${ENV.Donation_StepAmount}; // Round up to the nearest step amount
            }

            // Blurring and validation on amount input
            amountInput.addEventListener('blur', () => {
                let value = parseInt(amountInput.value) || 0;

                // Round the value to the nearest step amount
                value = roundToNearest(value);

                // Reset error message
                amountError.style.display = 'none';

                // Show error message if the value is invalid
                if (value < ${ENV.Donation_MinAmount}) {
                    errorMessage.textContent = 'Seriously? 🙄';
                    errorMessage.style.display = 'block';
                } else if (value > ${ENV.Donation_MaxAmount}) {
                    errorMessage.textContent = 'Chill out mate, thats a lot of money 😱';
                    errorMessage.style.display = 'block';
                } else {
                    errorMessage.style.display = 'none';
                }

                // Set the input value with the rounded value
                amountInput.value = value;
            });

            // Variable to store the last transaction token
            let lastTransactionToken = null;

            // Variable to track if payment is pending
            let isPaymentPending = false;

            // Handle payment method selection (only if using a template box)
            // When a user clicks on a payment method box, this function will highlight the selected box and update the selected payment method
            $('.payment-box').on('click', function() {
                $('.payment-box').removeClass('selected');
                $(this).addClass('selected');
                $('#paymentMethod').val($(this).data('method'));
            });

            // Initialize variables for amount input, slider, error message, and donation boxes
            $(document).ready(function() {
                const amountInput = $('#amount');
                const amountSlider = $('#amountSlider');
                const errorMessage = $('#amountError');
                const itemBoxes = $('.donation-box');
                errorMessage.hide();

                // Map preset donation amounts to slider steps (only if using a template slider)
                const amountMap = [2000, 5000, 10000, 20000, 30000, 50000, 100000, 200000, 300000, 500000, 1000000];

                // Function to validate the entered donation amount
                function validateAmount(amount) {
                    if (amount < ${ENV.Donation_MinAmount}) {
                        amountError.style.display = 'none';
                        errorMessage.text("The minimum value is ${ENV.Donation_Currency}. ${ENV.Donation_MinAmount}").show();
                    } else if (amount > ${ENV.Donation_MaxAmount}) {
                        amountError.style.display = 'none';
                        errorMessage.text("The maximum value is ${ENV.Donation_Currency}. ${ENV.Donation_MaxAmount}").show();
                    } else {
                        errorMessage.hide();
                    }
                }

                // Event listener for amount slider input
                // When users move the slider, the selected amount is updated
                amountSlider.on('input', function() {
                    const value = $(this).val();
                    const amountValue = amountMap[value];
                    amountInput.val(amountValue);
                    validateAmount(amountValue);
                    highlightItemBox(amountValue);
                });

                // Event listener for manually entering a donation amount
                // Synchronizes manual input with the slider and validates the amount
                amountInput.on('input', function() {
                    const amountValue = parseInt($(this).val());
                    const sliderValue = amountMap.indexOf(amountValue);
                    if (sliderValue >= 0) {
                        amountSlider.val(sliderValue);
                    }
                    validateAmount(amountValue);
                    highlightItemBox(amountValue);
                });

                // Handle selection of preset donation boxes
                // When a user clicks a donation box, this function highlights it and updates the amount input
                itemBoxes.on('click', function() {
                    amountError.style.display = 'none'; // Reset error message
                    itemBoxes.removeClass('selected'); // Hilangkan sorotan dari semua box
                    $(this).addClass('selected'); // Sorot box yang dipilih
                    const selectedAmount = parseInt($(this).attr('data-amount')); // Ambil nilai dari data-amount
                    amountInput.val(selectedAmount); // Set nilai amount input
                    validateAmount(selectedAmount);
                });

                // Function to highlight the donation box based on the amount entered in the input field
                function highlightItemBox(amount) {
                    itemBoxes.each(function() {
                        const boxAmount = parseInt($(this).attr('data-amount'));
                        if (boxAmount === amount) {
                            $(this).addClass('selected');
                        } else {
                            $(this).removeClass('selected');
                        }
                    });
                }

                // Handle form submission
                $('#donationForm').on('submit', function(event) {
                    event.preventDefault();

                    const amountValue = parseInt(amountInput.val());
                    if (amountValue < ${ENV.Donation_MinAmount} || amountValue > ${ENV.Donation_MaxAmount}) {
                        return; // Don't proceed if the amount is invalid
                    }

                    // Check if reCAPTCHA is enabled and verify the token
                    if ('${ENV.reCAPTCHA_SiteKey}' && '${ENV.reCAPTCHA_SecretKey}' && 
                        '${ENV.reCAPTCHA_SiteKey}'.trim() !== '' && '${ENV.reCAPTCHA_SecretKey}'.trim() !== '') {
                        grecaptcha.ready(function() {
                            grecaptcha.execute('${ENV.reCAPTCHA_SiteKey}', {action: 'submit'}).then(function(token) {
                                const formData = $('#donationForm').serialize() + '&recaptchaToken=' + token;

                                $.ajax({
                                    url: '/',
                                    type: 'POST',
                                    data: formData,
                                    success: function(response) {
                                        console.log("Response:", response);
                                        lastTransactionToken = response.token;
                                        initiatePayment(lastTransactionToken);
                                    },
                                    error: function(error) {
                                        console.error(error);
                                        alert("reCAPTCHA verification failed");
                                    }
                                });
                            });
                        });
                    } else {
                        // If reCAPTCHA is not enabled, proceed with form submission directly
                        const formData = $('#donationForm').serialize();

                        // Send form data via AJAX to the server
                        $.ajax({
                            url: '/',
                            type: 'POST',
                            data: formData,
                            success: function(response) {
                                console.log("Response:", response);
                                lastTransactionToken = response.token;
                                initiatePayment(lastTransactionToken);
                            },
                            error: function(error) {
                                console.error(error);
                                alert("Form submission failed");
                            }
                        });
                    }
                });
            });

            // Function to initiate the payment using the MidTrans Snap token
            // This function is called once the server responds with the payment token
            function initiatePayment(token) {
                snap.pay(token, {
                    // Show Display Modal if Payment Success (only if displaying a successful payment with displaying modal pop up)
                    // Callback if payment is successful
                    // onSuccess: function(result) {
                    //     displayModal('success', 'Thank you for your support');
                    //     isPaymentPending = false; // Reset status pending
                    // },

                    // Re-Direct to Page 3 if Payment Success (only if displaying a successful payment with displaying page 3)
                    // Callback if payment is successful
                    onSuccess: function(result) {
                        // Redirect to Page 3 after successful payment
                        page2.classList.add('hide');
                        const page3 = document.querySelector('.page-3');
                        page3.classList.remove('hide-back');
                        page3.classList.add('show');
                        const audioElement = document.getElementById('successAudio');
                        audioElement.play();
                        showVideoBackground();
                        runConfetti();
                        runNewConfetti();
                    },
                    // Callback if payment is pending
                    onPending: function(result) {
                        displayModal('pending', 'The payment code is still active');
                        isPaymentPending = true;
                    },
                    // Callback if payment is failed
                    onError: function(result) {
                        displayModal('error', 'Payment failed');
                        isPaymentPending = false;
                    }
                });
            }

            // Event listener for "No" button in the cancel payment confirmation modal
            $('#disprovePaymentBtn').on('click', function() {
                $('#paymentStatusModal').modal('hide');
                if (isPaymentPending && lastTransactionToken) {
                    initiatePayment(lastTransactionToken);
                }
            });

            // Menangani klik tombol "Continue" untuk melanjutkan pembayaran
            $('#continuePaymentBtn').on('click', function() {
                $('#paymentStatusModal').modal('hide');
                if (isPaymentPending && lastTransactionToken) {
                    initiatePayment(lastTransactionToken);
                }
            });

            // Event listener for "Close" button in the payment modal
            $('#closePaymentBtn').on('click', function() {
                // If the payment is pending, show a cancel confirmation modal
                if (isPaymentPending) {
                    $('#paymentStatusModal').modal('hide'); 
                    $('#cancelPaymentModal').modal('show');
                } else {
                    $('#paymentStatusModal').modal('hide');
                }
            });

            // Handle payment cancellation when "Yes" is clicked in the confirmation modal
            $('#confirmCancelBtn').on('click', function() {
                isPaymentPending = false;
                $('#cancelPaymentModal').modal('hide');
                displayModal('error', 'Payment has been canceled.');
                $('#paymentStatusModal').modal('hide');
            });

            // Function to reset the body's overflow property
            function resetBodyOverflow() {
                document.body.style.overflow = '';
            }

            // Event listener for payment status modal
            $('#paymentStatusModal').on('hidden.bs.modal', function () {
                resetBodyOverflow();
            });

            // Event listener for cancel payment modal
            $('#cancelPaymentModal').on('hidden.bs.modal', function () {
                resetBodyOverflow();
            });

            // Function to display a status modal (success, pending, or error) with dynamic content
            function displayModal(status, message) {
                let iconClass;
                if (status === 'success') {
                    iconClass = 'fa-duotone fa-solid fa-heart modal-success';
                    // Plays media if the payment is successful
                    const audioElement = document.getElementById('successAudio');
                    audioElement.play();
                    showVideoBackground();
                } else if (status === 'pending') {
                    iconClass = 'fa-duotone fa-solid fa-hourglass-start modal-pending';
                } else {
                    iconClass = 'fa-duotone fa-solid fa-circle-xmark modal-error';
                }

                // Update the display status in the modal
                $('#modalStatusIcon').attr('class', iconClass);
                $('#modalStatusMessage').text(message);
                $('#paymentStatusModal').modal('show');

                // Run confetti animation if the payment is successful
                if (status === 'success') {
                    runConfetti();
                    runNewConfetti();
                }
            }

            // Function to run a basic confetti animation
            function runConfetti() {
                confetti({
                    particleCount: 100,
                    spread: 160,
                    origin: { y: 0.6 },
                    zIndex: 5
                });
            }

            // Function to run an additional confetti animation with custom options
            function runNewConfetti() {
                const confettiContainer = document.getElementById('confetti-container');
                const confettiOptions = {
                    particles: {
                        number: {
                            value: 50,
                        },
                        color: {
                            value: ['#ff69b4', '#ffa07a', '#ffff00'],
                        },
                        shape: {
                            type: 'star',
                        },
                        opacity: {
                            value: 0.8,
                        },
                        size: {
                            value: 10,
                            random: true,
                        },
                        move: {
                            enable: true,
                            speed: 10,
                            direction: 'bottom',
                            straight: false,
                        },
                    },
                    interactivity: {
                        events: {
                            onhover: {
                                enable: false,
                            },
                            onclick: {
                                enable: false,
                            },
                        },
                    },
                    retina_detect: true,
                };

                // Load confetti animation in the container
                tsParticles.load(confettiContainer, confettiOptions);

                // Stop the confetti animation
                setTimeout(() => {
                    tsParticles.domItem(0).destroy();
                }, ${ENV.PaymentSuccess_ConfettiTime || 0});
            }

            // Function to show a background video during payment success
            function showVideoBackground() {
                const videoElement = document.getElementById('backgroundVideo');
                videoElement.style.display = 'block';
                videoElement.play();

                // Hide the video and reset it to the beginning
                setTimeout(() => {
                    videoElement.style.display = 'none';
                    videoElement.pause();
                    videoElement.currentTime = 0;
                }, ${ENV.PaymentSuccess_ConfettiTime || 0});
            }  
        </script>
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
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
