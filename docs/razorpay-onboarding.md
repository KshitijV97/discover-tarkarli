# Razorpay onboarding (TODO)

> **Status: not started.** The site runs without Razorpay: bookings confirm immediately and staff collect the deposit offline. Online deposits switch on automatically once the keys below are set. Technical details of the integration: [payments.md](payments.md).

## Checklist
- [ ] 1. Create a Razorpay account
- [ ] 2. Generate **Test** API keys
- [ ] 3. Add the keys to the app (local + Vercel)
- [ ] 4. Add the webhook
- [ ] 5. Make a test booking and pay
- [ ] 6. Complete KYC / activation
- [ ] 7. Switch to **Live** keys

## 1. Create an account
Sign up at https://razorpay.com with email + phone. **Test mode works immediately**, with no documents and no real money.

## 2. Generate test keys
1. In the dashboard, make sure the toggle at the top says **Test Mode**.
2. **Account & Settings → API Keys → Generate Key**.
3. Copy the **Key ID** (`rzp_test_…`) and the **Key Secret**. The secret is shown only once; regenerate it if lost.

## 3. Add keys to the app
Local / production env file (`.env.production.local`, never committed):
```
RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxx
```
Vercel:
```bash
npx vercel env add RAZORPAY_KEY_ID production
npx vercel env add RAZORPAY_KEY_SECRET production
npx vercel --prod
```
`settings.booking.paymentsEnabled` is already `true`, so payments activate as soon as the keys exist.

## 4. Webhook
Lets Razorpay confirm a payment even if the guest closes the browser.
1. Generate a secret: `openssl rand -hex 32`.
2. Dashboard → **Account & Settings → Webhooks → Add New Webhook**:
   - URL: `https://<your-domain>/api/webhooks/razorpay`
   - Secret: the value from step 1
   - Active events: `payment.captured`, `payment.failed`, `order.paid`
3. `npx vercel env add RAZORPAY_WEBHOOK_SECRET production` (same secret), then redeploy.

## 5. Test
Make a booking on the live site → **Pay deposit** → pay with UPI id `success@razorpay` (or `failure@razorpay` to test a failure). Check:
- the booking page shows **Confirmed** and "Deposit · paid"
- `select status, provider_payment_id from payments order by created_at desc limit 1;` shows `paid`
- Razorpay dashboard → Webhooks shows a successful delivery

## 6. KYC / activation (needed for real money)
Dashboard → **Activate account**. Typically: business type, PAN (individual or business), bank account for settlements, address proof, website URL (the Vercel/own domain), and GSTIN if registered. Also add business policies (terms, refund/cancellation, privacy, contact). Razorpay checks the website has these pages; see roadmap.

## 7. Go live
Switch the dashboard to **Live Mode** → generate live keys → replace `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` in Vercel → create the webhook again in Live mode (webhooks are per mode) → redeploy → make one small real payment and refund it.
