const detailsForm = document.querySelector("#details-form");
const paymentForm = document.querySelector("#payment-form");
const calculateButton = document.querySelector("#calculate-button");
const payButton = document.querySelector("#pay-button");
const detailsMessage = document.querySelector("#details-message");
const paymentMessage = document.querySelector("#payment-message");

let stripe;
let elements;
let paymentElement;

function setBusy(button, busy, busyLabel, readyLabel) {
  button.disabled = busy;
  button.textContent = busy ? busyLabel : readyLabel;
}

function setMessage(element, message, isError = false) {
  element.textContent = message;
  element.classList.toggle("error", isError);
}

function money(currency, amount) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(Number(amount));
}

async function readJson(response) {
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "The request failed.");
  return body;
}

async function initializeStripe() {
  const config = await readJson(await fetch("/api/config"));
  stripe = Stripe(config.publishableKey);

  const returnedSecret = new URLSearchParams(window.location.search).get("payment_intent_client_secret");
  if (returnedSecret) {
    const { paymentIntent } = await stripe.retrievePaymentIntent(returnedSecret);
    setMessage(paymentMessage, paymentIntent?.status === "succeeded" ? "Payment complete. Your order is confirmed." : `Payment status: ${paymentIntent?.status ?? "unknown"}.`);
    paymentForm.hidden = false;
  }
}

detailsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setBusy(calculateButton, true, "Calculating…", "Calculate tax & continue");
  setMessage(detailsMessage, "");

  try {
    const data = await readJson(await fetch("/api/payment-intents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: document.querySelector("#product-id").value,
        quantity: Number(document.querySelector("#quantity").value),
        address: {
          country: "CA",
          state: document.querySelector("#state").value,
          postalCode: document.querySelector("#postal-code").value,
        },
      }),
    }));

    document.querySelector("#subtotal").textContent = money(data.calculation.currency, data.calculation.subtotal);
    document.querySelector("#tax").textContent = money(data.calculation.currency, data.calculation.tax);
    document.querySelector("#total").textContent = money(data.calculation.currency, data.calculation.total);
    document.querySelector("#calculation-reference").textContent = `Calculation ${data.calculation.id}`;

    paymentElement?.unmount();
    elements = stripe.elements({
      clientSecret: data.clientSecret,
      appearance: {
        theme: "stripe",
        variables: { colorPrimary: "#ff5a36", borderRadius: "10px", fontFamily: "Inter, system-ui, sans-serif" },
      },
    });
    paymentElement = elements.create("payment", { layout: "accordion" });
    paymentElement.mount("#payment-element");
    paymentForm.hidden = false;
    paymentForm.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    setMessage(detailsMessage, error instanceof Error ? error.message : "Checkout could not be created.", true);
    paymentForm.hidden = true;
  } finally {
    setBusy(calculateButton, false, "Calculating…", "Calculate tax & continue");
  }
});

paymentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!stripe || !elements) return;

  setBusy(payButton, true, "Processing…", "Pay securely");
  setMessage(paymentMessage, "");

  const { error, paymentIntent } = await stripe.confirmPayment({
    elements,
    confirmParams: { return_url: window.location.origin },
    redirect: "if_required",
  });

  if (error) {
    setMessage(paymentMessage, error.message ?? "Payment could not be completed.", true);
  } else if (paymentIntent?.status === "succeeded") {
    setMessage(paymentMessage, "Payment complete. Your order is confirmed.");
  } else {
    setMessage(paymentMessage, `Payment status: ${paymentIntent?.status ?? "pending"}.`);
  }

  setBusy(payButton, false, "Processing…", "Pay securely");
});

initializeStripe().catch((error) => {
  setMessage(detailsMessage, error instanceof Error ? error.message : "Stripe could not be initialized.", true);
  calculateButton.disabled = true;
});

