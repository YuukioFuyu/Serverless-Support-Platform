<h2 align="center">The 22/22/22 Project</h2>
<p align="center" valign="top">
  <img src="https://github.com/user-attachments/assets/e57deb73-426d-4ca4-a8f6-13b37e320efb" width="22%" alt="22nd Birthday Celebration"/>
</p>
<h4 align="center">This project is quite special to me. It was developed as part of my 22nd birthday celebrations and is designed to simplify the donation process at a lower cost. The funny fact is that this project was completed at 22:00, which is why I named it 22/22/22<br>(October 22, Age 22 and Completed at 22 Jakarta Time).</h4>
<hr />

# Serverless Support Platform using Cloudflare Worker and Midtrans API
**Empowering Support dan Simplifying Donations**

Explore a new way to receive support with the Serverless Support Platform. Built on a serverless architecture using Cloudflare Workers and integrated with Midtrans, this platform revolutionizes how donations are handled—transparent, low-cost and highly customizable. Free from the burdens of high deductions and unnecessary complexities, this solution is designed for creators who value simplicity and efficiency. Enjoy reduced fees and automatic VAT handling. Transform your support experience today with a modern, optimized, and user-friendly platform.

## Technology Stack
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=Cloudflare&logoColor=white)](#)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6-F7DF1E?logo=javascript&logoColor=000)](#)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-v5.3.0-7952B3?logo=bootstrap&logoColor=fff)](#)
[![jQuery](https://img.shields.io/badge/jQuery-v3.6.0-0769AD?logo=jquery&logoColor=fff)](#)

- Cloudflare Workers: Serverless function hosting for handling donations.
- Midtrans Snap API: Payment gateway integration.
- JavaScript (ES6): For form validation, payment calculations and API interactions.
- Bootstrap: Responsive design and user interface elements.
- tsParticles: Confetti animation for successful donations.
- reCAPTCHA: Optional Google reCAPTCHA integration for additional security.

## Screenshots
![image](https://github.com/user-attachments/assets/6f175985-42bf-49cb-a100-75f4d5ea5160)
![image](https://github.com/user-attachments/assets/cd54f65f-ca89-4530-aef4-8a5f103a61f4)
![image](https://github.com/user-attachments/assets/bbf013e5-f13b-4b05-a86d-36ca6f67c068)
![image](https://github.com/user-attachments/assets/1d65ccef-6696-4f05-9e9c-18d9eb169739)


<hr>

# Getting Started
## Deploying `worker.js` from GitHub to Cloudflare Worker with Free Plan
[![Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/YuukioFuyu/Serverless-Support-Platform)

## Basic Configuration of the Environment Variables Object in `worker.js`
The `ENV` object in `worker.js` contains important settings that define how your donation platform behaves. Let's break down the configuration into stages, so you can easily set up the platform.

1. **Midtrans Payment Gateway Integration:**
   This stage is critical to set up the payment system for donations.
   ```javascript
   Midtrans_ClientKey: 'Your-Midtrans-Client-Key',
   Midtrans_ServerKey: 'Your-Midtrans-Server-Key',
   ```

   **How to get these keys:**
   - Sign up or log in to [Midtrans Dashboard](https://dashboard.midtrans.com).
   - Set the environment to Sandbox or Production based on your use case.
   - Navigate to Settings > Access Keys.
   - Copy the Client Key and Server Key.
   - Paste them into the appropriate fields

2. **Optional reCAPTCHA Integration (Security):**
   If you want to add extra security to prevent spam donations, you can integrate Google reCAPTCHA. If you don’t need it, leave the fields blank.
   ```javascript
   reCAPTCHA_SiteKey: 'YourreCAPTCHASiteKey',
   reCAPTCHA_SecretKey: 'YourreCAPTCHASecretKey',
   reCAPTCHA_Score: '0.5',
   ```

   **How to get these keys:**
   - Go to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin).
   - Create a new site and get your Site Key and Secret Key.
   - Add them to the respective fields.

3. **SEO and Social Media Sharing:**
   This section helps optimize how your donation page appears in search results and on social media platforms.
   ```javascript
   SEO_Favicon: 'https://example.com/favicon.ico',
   SEO_Title: 'Support Us',
   SEO_Description: 'Join us in supporting our cause',
   SEO_Thumbnail: 'https://example.com/thumbnail.jpg',
   SEO_TwitterCard: 'https://example.com/twitter-card.jpg',
   SEO_Author: 'Your Name',
   SEO_Keywords: 'donation, support, fundraiser',
   SEO_URL: 'https://yourwebsite.com',
   SEO_Color: '#0091ff',
   ```

4. **Donation Form Settings:**
   This section is where you configure how donations are processed and displayed to users.
   ```javascript
   Donation_Name: 'Send me coffee',
   Donation_ItemName: 'Coffe',
   Donation_ItemThumbnail: 'https://example.com/item-image.jpg',
   Donation_Currency: '$',
   Donation_CurrencySymbol: 'fa-dollar-sign',
   Donation_MinAmount: '1',
   Donation_MaxAmount: '1000',
   Donation_StepAmount: '1',
   Donation_CountryVAT: '10',
   ```

5. **Success Page Configuration:**
   These settings allow you to customize the experience after a successful donation, such as showing confetti, playing audio or displaying a thank you message.
   ```javascript
   PaymentSuccess_Text: 'Thank you for your support!',
   PaymentSuccess_Image: 'https://example.com/thank-you-image.jpg',
   PaymentSuccess_ConfettiTime: '5000',
   PaymentSuccess_Audio: 'https://example.com/success-sound.mp3',
   PaymentSuccess_Video: 'https://example.com/success-video.mp4',
   ```

## Advanced Configuration of Function Objects in `worker.js`
The Function object in `worker.js` contains advanced settings that determine how the logic of your donation platform runs. Let's break down the configuration into stages, so you can easily set up the platform. 

1. **Adjusting Fees for Payment Methods:**
   The donation platform calculates transaction fees based on the payment method selected by the user. These fees can be adjusted by modifying the `calculateFee()` function in `worker.js`.
   ##### The Fee options ensure that the supporter is only responsible for covering the transaction Fee charged by the Payment Gateway. If you choose to remove the Fee, you will be liable for the entire transaction Fee incurred by your supporter.
   ```javascript
   function calculateFee(amount, paymentMethod) {
     let fee = 0;
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
       case 'echannel':
       case 'bri_va':
       case 'cimb_va':
       case 'bni_va':
       case 'permata_va':
       case 'other_va':
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
   ```

   **How to Modify Fees:**
   - Locate the Payment Method: Inside the switch `(paymentMethod)` block, find the payment method (e.g., 'gopay', 'credit_card').
   - Change the Fee: Modify the percentage (e.g., 0.02 for 2%) or flat fee (e.g., 4000 for Rp4000).
     - For percentage-based fees: fee = amount * X, where X is the percentage (e.g., 0.02 for 2%).
     - For flat fees: Simply assign a value, such as fee = 4000 for Rp4000.
    
   *Example:*
   
   To change the GoPay fee from 2% to 1.5%, update:
   ```javascript
   fee = amount * 0.015;
   ```

2. **Adjusting VAT for Payment Methods:**
   VAT (Value-Added Tax) can be applied to certain payment methods based on the country’s tax laws. The `calculateVAT()` function calculates VAT based on the payment method and the VAT percentage set in `ENV.Donation_CountryVAT`.
   ##### The VAT options ensure that the supporter is only responsible for covering the transaction VAT charged by the bank. If you choose to remove the VAT, you will be liable for the entire transaction VAT incurred by your supporter. Additionally, you are not permitted to increase the VAT amount beyond what is specified by the bank. Violation of these terms may lead to consequences under the tax laws applicable in your country.
   ```javascript
   function calculateVAT(amount, paymentMethod) {
     let vat = 0;
     const vatApplicableMethods = [
       'credit_card',
       'akulaku',
       'kredivo',
       'echannel',
       'bri_va',
       'cimb_va',
       'bni_va',
       'permata_va',
       'other_va'
     ];
     if (vatApplicableMethods.includes(paymentMethod)) {
       const CountryVAT = parseFloat(ENV.Donation_CountryVAT) || 0;
       vat = amount * (CountryVAT / 100);
     }
     return vat;
   }
   ```

   **How to Modify VAT:**
   - Set the VAT Percentage: In the `ENV` section, find `Donation_CountryVAT` and update it with the VAT percentage (e.g., 10 for 10% VAT).
     ```javascript
     Donation_CountryVAT: '10',
     ```
   - Payment Methods Subject to VAT: To add or remove payment methods subject to VAT, update the `vatApplicableMethods` array.
   
     *Example:*
     
     To remove credit cards from VAT, remove 'credit_card' from the list:
     ```javascript
     const vatApplicableMethods = [
       'akulaku',
       'kredivo',
       'echannel',
       'bri_va',
       'cimb_va',
       'bni_va',
       'permata_va',
       'other_va'
     ];
     ```

3. **Adjusting Preset Template Donation Amounts:**
   The platform provides two ways for users to select preset donation amounts Template Box and Slider Template. By default, the Template Box mode is enabled. Follow the steps below to customize or switch between these modes.
   1. **Template Box Mode (Default)**
        In Template Box mode, supporters can choose from predefined donation amounts. You can modify these amounts by editing the HTML section labeled `<!-- Template Box -->`.
        ```html
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
          <!-- Quick option items continue... -->
        </div>
        ```
      
        **How to Modify the Presets:**
        - Change the Amounts: Update the value of data-amount for each item to adjust the donation options.
           
          *Example:*
           
          To change the first option from 5000 to 3000:
          ```html
          <div class="donation-box d-flex flex-column align-items-center" data-amount="3000">
          ```
        - To add more donation options, copy and paste the `<div class="donation-box">` block and adjust the data-amount. To remove an option, simply delete the corresponding block.
          
          *Example:*
           
          To add a new preset with a value of 1500000:
          ```html
          <div class="donation-box d-flex flex-column align-items-center" data-amount="1500000">
            <img src="${ENV.Donation_ItemThumbnail}" alt="">
            <small class="justify-content-center">1500 ${ENV.Donation_ItemName}</small>
          </div>
          ```
   
   2. **Switching to Slider Template Mode**
        If you prefer using a slider instead of boxes for preset donation amounts, follow these steps:
        - Uncomment the Slider Template: Locate the `<!-- Template Slider -->` section and uncomment it by removing the `<!-- and -->` tags.
          ```html
          <input type="range" id="amountSlider" min="0" max="10" value="0" step="1" class="form-range" style="width: 100%;">
          <div class="d-flex justify-content-between">
            <span><i class="fa-duotone fa-solid fa-money-bill-wave"></i></span>
            <span><i class="fa-duotone fa-solid fa-wallet"></i></span>
          </div>
          ```
          
        - Comment the Template Box: Comment out the entire `<!-- Template Box -->` section by adding `<!-- and -->` around it.
          ```html
          <!--
          <div class="d-flex donation-presets">
            <div class="donation-box d-flex flex-column align-items-center" data-amount="2000">
              <img src="${ENV.Donation_ItemThumbnail}" alt="">
              <small class="justify-content-center">5 ${ENV.Donation_ItemName}</small>
            </div>
            <!-- More boxes -->
          </div>
          -->
          ```
          
        - Edit Slider Preset Values: The values for the slider are stored in the `amountMap` array in the JavaScript section. Modify the amounts in the `amountMap` array to add, remove, or change preset values.
          ```javascript
          const amountMap = [2000, 5000, 10000, 20000, 30000, 50000, 100000, 200000, 300000, 500000, 1000000];
          ```
      
        **How to Modify the Presets:**
        - To add or remove preset amounts, simply adjust the values in the `amountMap` array.
           
          *Example:*
           
          To add a value of 1500000, update the array as follows:
          ```javascript
          const amountMap = [2000, 5000, 10000, 20000, 30000, 50000, 100000, 200000, 300000, 500000, 1000000, 1500000];
          ```
        - Each value in the amountMap corresponds to a step on the slider. The `min="0"` and `max="10"` in the slider represent the index of the amount in the array (e.g., 2000 is at index 0, 5000 is at index 1, and so on).

4. **Deploy and Test:**
   - Click the "Save and Deploy" button to deploy the worker.
   - Once the deployment is successful, you'll receive a worker URL.

5. **Configure Routes:**
   - To route incoming requests to your Cloudflare Worker, configure the routes.
   - Go to the "Routes" section in the Cloudflare Workers dashboard.
   - Add a new route (e.g., `https://your-subdomain.your-domain.com/*`) and associate it with the deployed worker.

6. **Testing:**
   - Access the URL of your worker (e.g., `https://your-subdomain.your-domain.com/`) to test the deployed script.

<hr>

<h1 align="center">Special Thanks</h1>

> #### Thank you for taking the time to explore my GitHub! Today is a special day for me, it's my birthday! I am incredibly grateful to everyone who has supported me along the way. I created this project as a small gift to all of you. While it may not be much due to my limited free time, also also thanks for your feedback and contributions on this GitHub account have made this journey much more meaningful.
> #### I hope some of the projects I've created here will be useful to you. If you have any questions or suggestions, please feel free to reach out, or you can [open issues](https://github.com/YuukioFuyu/Serverless-Support-Platform/issues) if you encounter any problems with the Serverless Support Platform project. Let's continue to improve this together!
> <h4 align="right">「ユウキオ フユ」</h4>
