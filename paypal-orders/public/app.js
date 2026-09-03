const detailsForm = document.querySelector("#details-form");
const paypalButton = document.querySelector("#paypal-button");
const paymentMessage = document.querySelector("#payment-message");

function setMessage(message, isError = false) {
  paymentMessage.textContent = message;
  paymentMessage.classList.toggle("error", isError);
}

function money(currency, amount) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(Number(amount));
}

async function readJson(response) {
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "The request failed.");
  return body;
}

function loadPayPalSdk() {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://www.sandbox.paypal.com/web-sdk/v6/core";
    script.onload = resolve;
    script.onerror = () => reject(new Error("The PayPal JavaScript SDK could not be loaded."));
    document.head.append(script);
  });
}

function checkoutInput() {
  if (!detailsForm.reportValidity()) throw new Error("Complete the checkout details first.");
  return {
    productId: document.querySelector("#product-id").value,
    quantity: Number(document.querySelector("#quantity").value),
    address: {
      country: "CA",
      state: document.querySelector("#state").value,
      postalCode: document.querySelector("#postal-code").value,
    },
  };
}

async function createOrder() {
  setMessage("Calculating tax and creating your PayPal order…");
  const data = await readJson(await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(checkoutInput()),
  }));

  document.querySelector("#subtotal").textContent = money(data.calculation.currency, data.calculation.subtotal);
  document.querySelector("#tax").textContent = money(data.calculation.currency, data.calculation.tax);
  document.querySelector("#total").textContent = money(data.calculation.currency, data.calculation.total);
  document.querySelector("#calculation-reference").textContent = `Calculation ${data.calculation.id}`;
  setMessage("Continue in the secure PayPal window.");
  return { orderId: data.id };
}

async function initializePayPal() {
  const config = await readJson(await fetch("/api/config"));
  await loadPayPalSdk();

  const sdk = await window.paypal.createInstance({
    clientId: config.clientId,
    components: ["paypal-payments"],
    pageType: "checkout",
  });
  const methods = await sdk.findEligibleMethods({ currencyCode: config.currency });
  if (!methods.isEligible("paypal")) throw new Error("PayPal is not eligible for this sandbox checkout.");

  const paymentSession = sdk.createPayPalOneTimePaymentSession({
    async onApprove({ orderId }) {
      setMessage("Capturing your approved order…");
      const capture = await readJson(await fetch(`/api/orders/${encodeURIComponent(orderId)}/capture`, { method: "POST" }));
      setMessage(capture.status === "COMPLETED" ? "Payment complete. Your order is confirmed." : `PayPal status: ${capture.status}.`);
    },
    onCancel() {
      setMessage("Payment cancelled. Your order was not captured.");
    },
    onError(error) {
      setMessage(error?.message ?? "PayPal could not complete the payment.", true);
    },
  });

  paypalButton.hidden = false;
  setMessage("PayPal is ready.");
  paypalButton.addEventListener("click", async () => {
    try {
      await paymentSession.start({ presentationMode: "auto" }, createOrder());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "PayPal could not start.", true);
    }
  });
}

initializePayPal().catch((error) => {
  setMessage(error instanceof Error ? error.message : "PayPal could not be initialized.", true);
});
