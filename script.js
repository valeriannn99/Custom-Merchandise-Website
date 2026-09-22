const ORDERS_HISTORY_KEY = "clubhouseMyOrders";

document.addEventListener("DOMContentLoaded", function () {
  const cards = document.querySelectorAll(".card");

  cards.forEach(function (card) {
    card.addEventListener("mouseenter", function () {
      card.style.transform = "translateY(-6px)";
    });

    card.addEventListener("mouseleave", function () {
      card.style.transform = "";
    });
  });

  initOrderForm();
  renderOrders();
});

function orderNow(productName) {
  const selected = productName || "Custom Order";
  window.location.href = "order.html?product=" + encodeURIComponent(selected);
}

function initOrderForm() {
  const form = document.getElementById("orderForm");
  if (!form) return;

  const params = new URLSearchParams(window.location.search);
  const product = params.get("product") || "Custom Order";
  const productField = document.getElementById("product");
  if (productField) productField.value = product;

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const order = {
      id: Date.now(),
      submittedAt: new Date().toLocaleString(),
      product: document.getElementById("product").value.trim(),
      name: document.getElementById("name").value.trim(),
      email: document.getElementById("email").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      quantity: document.getElementById("quantity").value.trim(),
      message: document.getElementById("message").value.trim()
    };

    const submitButton = form.querySelector("button[type=submit]");
    if (submitButton) submitButton.disabled = true;

    try {
      const sentRemotely = await submitOrderToGoogleSheet(order);
      saveLocalOrder(order);
      setMessage(
        "orderStatus",
        sentRemotely
          ? "Order submitted successfully."
          : "Order saved successfully on this device.",
        false
      );
      form.reset();
      if (productField) productField.value = product;
    } catch (error) {
      setMessage("orderStatus", "The order could not be saved. Please try again.", true);
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

async function submitOrderToGoogleSheet(order) {
  if (!window.SHEETS_CONFIG || !window.SHEETS_CONFIG.webAppUrl) {
    return false;
  }

  const payload = {
    token: window.SHEETS_CONFIG.submitToken || "",
    submittedAt: order.submittedAt,
    product: order.product,
    name: order.name,
    email: order.email,
    phone: order.phone,
    quantity: order.quantity,
    message: order.message
  };

  const response = await fetch(window.SHEETS_CONFIG.webAppUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Sheet API request failed");
  }

  const result = (await response.text()).trim().toLowerCase();
  if (result !== "ok") {
    throw new Error("Sheet API response: " + result);
  }

  return true;
}

function saveLocalOrder(order) {
  const existing = readOrders();
  existing.unshift(order);
  localStorage.setItem(ORDERS_HISTORY_KEY, JSON.stringify(existing));
}

function renderOrders() {
  const container = document.getElementById("ordersTableBody");
  if (!container) return;

  const orders = readOrders();
  if (orders.length === 0) {
    container.innerHTML = '<tr><td colspan="4">No local order history yet.</td></tr>';
    return;
  }

  container.innerHTML = orders
    .map(function (order) {
      return (
        "<tr>" +
        "<td>" + escapeHtml(order.submittedAt || "") + "</td>" +
        "<td>" + escapeHtml(order.product || "") + "</td>" +
        "<td>" + escapeHtml(order.quantity || "") + "</td>" +
        "<td><button class=\"small-btn\" onclick=\"deleteOrder(" + order.id + ")\">Delete</button></td>" +
        "</tr>"
      );
    })
    .join("");
}

function deleteOrder(orderId) {
  const orders = readOrders();
  const updated = orders.filter(function (order) {
    return order.id !== orderId;
  });
  localStorage.setItem(ORDERS_HISTORY_KEY, JSON.stringify(updated));
  renderOrders();
}

function clearOrders() {
  localStorage.removeItem(ORDERS_HISTORY_KEY);
  renderOrders();
}

function readOrders() {
  try {
    const stored = JSON.parse(localStorage.getItem(ORDERS_HISTORY_KEY) || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch (error) {
    return [];
  }
}

function setMessage(elementId, text, isError) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = text;
  el.style.color = isError ? "#b91c1c" : "#15803d";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}



