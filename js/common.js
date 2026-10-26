const CART_KEY = "summerplate-cart";
const CLEAR_LABEL = "Kosongkan keranjang";
const CLEAR_CONFIRM_LABEL = "Yakin? Klik lagi untuk hapus semua";

let cart = [];
let clearTimer = null;

const siteHeader = document.getElementById("site-header");
const menuToggle = document.getElementById("menu-toggle");
const cartCountText = document.getElementById("cart-count");
const cartPanel = document.getElementById("cart-panel");
const cartList = document.getElementById("cart-list");
const cartTotalText = document.getElementById("cart-total");
const backdrop = document.getElementById("backdrop");
const summaryList = document.getElementById("summary-list");
const summaryTotalText = document.getElementById("summary-total");

const TRASH_ICON_HTML = `
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M6 6l1 14h10l1-14" />
    <path d="M10 10v6M14 10v6" />
  </svg>
`;

const TONE_NAMES = {
  orange: "maincolor-1",
  yellow: "maincolor-2",
  navy: "maincolor-3",
  forest: "secondarycolor-1",
  pool: "secondarycolor-2",
};

function getToneName(tone) {
  return TONE_NAMES[tone] || tone;
}

const DEFAULT_VARIANT_LABEL = "Standar";

function prepareProduct(product) {
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    return;
  }

  const price = Number(product.price);
  if (product.price === undefined || !isFinite(price)) {
    console.warn(
      'Produk "' +
        product.id +
        '" tidak punya variasi dan tidak punya harga (price).',
    );
  }

  product.variants = [
    {
      key: "default",
      label: DEFAULT_VARIANT_LABEL,
      price: isFinite(price) ? price : 0,
      originalPrice: product.originalPrice,
      isDefault: true,
    },
  ];
}

function prepareAllProducts() {
  for (let i = 0; i < products.length; i++) {
    prepareProduct(products[i]);
  }
}

function hasOnlyDefaultVariant(product) {
  return (
    product.variants.length === 1 && product.variants[0].isDefault === true
  );
}

prepareAllProducts();

function setText(id, text) {
  document.getElementById(id).textContent = text;
}

function fillText(text) {
  return text
    .replaceAll("{toko}", STORE_NAME)
    .replaceAll("{tahun}", new Date().getFullYear());
}

function fillStoreInfo() {
  document.title = STORE_NAME;
  document.getElementById("logo-img").alt = STORE_NAME;

  setText(
    "footer-order-text",
    fillText(FOOTER_ORDER_TEXT) +
      " " +
      FOOTER_ORDER_NOTE.replaceAll("{hari}", MIN_DAYS_AHEAD),
  );
  setText("footer-hours", STORE_HOURS);
  setText("footer-instagram", STORE_INSTAGRAM);
  setText("footer-city", STORE_CITY);
  setText("footer-copyright", fillText(FOOTER_COPYRIGHT));
}

function formatRupiah(number) {
  return "Rp " + number.toLocaleString("id-ID");
}

function findProduct(id) {
  for (let i = 0; i < products.length; i++) {
    if (products[i].id === id) {
      return products[i];
    }
  }
  return null;
}

function getCheapestVariant(product) {
  let cheapest = product.variants[0];
  for (let i = 1; i < product.variants.length; i++) {
    if (product.variants[i].price < cheapest.price) {
      cheapest = product.variants[i];
    }
  }
  return cheapest;
}

function getCategoryLabel(categoryId) {
  for (let i = 0; i < categories.length; i++) {
    if (categories[i].id === categoryId) {
      return categories[i].label;
    }
  }
  return ALL_CATEGORY_LABEL;
}

function cleanQty(value) {
  let number = Math.floor(Number(value));
  if (!isFinite(number) || number < 1) {
    return 0;
  }
  if (number > MAX_QTY) {
    number = MAX_QTY;
  }
  return number;
}

function readSavedCart() {
  try {
    const saved = localStorage.getItem(CART_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {}
  return [];
}

function cleanCartItems(items) {
  const cleaned = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (
      item &&
      typeof item.id === "string" &&
      isFinite(Number(item.price)) &&
      cleanQty(item.qty) > 0
    ) {
      item.price = Number(item.price);
      item.qty = cleanQty(item.qty);
      cleaned.push(item);
    }
  }
  return cleaned;
}

function loadCart() {
  cart = cleanCartItems(readSavedCart());
}

function saveCart() {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch (error) {}
}

function reloadCart() {
  loadCart();
  renderCart();
}

function findCartIndex(itemId) {
  for (let i = 0; i < cart.length; i++) {
    if (cart[i].id === itemId) {
      return i;
    }
  }
  return -1;
}

function getCartCount() {
  let count = 0;
  for (let i = 0; i < cart.length; i++) {
    count = count + cart[i].qty;
  }
  return count;
}

function getCartTotal() {
  let total = 0;
  for (let i = 0; i < cart.length; i++) {
    total = total + cart[i].price * cart[i].qty;
  }
  return total;
}

function getAddonsText(addons) {
  const labels = [];
  for (let i = 0; i < addons.length; i++) {
    labels.push(addons[i].label);
  }
  return labels.join(", ");
}

function addItemToCart(product, variant, qty, addons) {
  addons = addons || [];

  let itemId = product.id + "-" + variant.key;
  let variantText = variant.label;
  let price = variant.price;

  if (addons.length > 0) {
    const keys = [];
    for (let i = 0; i < addons.length; i++) {
      keys.push(addons[i].key);
      price = price + addons[i].price;
    }
    itemId = itemId + "+" + keys.sort().join("+");
    variantText = variantText + " + " + getAddonsText(addons);
  }

  const index = findCartIndex(itemId);

  if (index >= 0) {
    cart[index].qty = Math.min(cart[index].qty + qty, MAX_QTY);
  } else {
    cart.push({
      id: itemId,
      name: product.name,
      variant: variantText,
      price: price,
      qty: qty,
    });
  }

  saveCart();
  renderCart();
}

function changeQty(itemId, change) {
  const index = findCartIndex(itemId);
  if (index < 0) {
    return;
  }

  cart[index].qty = Math.min(cart[index].qty + change, MAX_QTY);
  if (cart[index].qty <= 0) {
    cart.splice(index, 1);
  }

  saveCart();
  renderCart();
}

function deleteCartItem(itemId) {
  const index = findCartIndex(itemId);
  if (index >= 0) {
    cart.splice(index, 1);
    saveCart();
    renderCart();
  }
}

function cleanQtyInput(input) {
  input.value = input.value.replace(/\D/g, "").slice(0, String(MAX_QTY).length);
}

function setQtyInput(itemId, input) {
  const index = findCartIndex(itemId);
  if (index < 0) {
    return;
  }

  const newQty = cleanQty(input.value);
  if (newQty === 0) {
    input.value = cart[index].qty;
    return;
  }

  cart[index].qty = newQty;
  input.value = newQty;
  saveCart();

  document.getElementById("cart-line-" + itemId).textContent = makeCartLine(
    cart[index],
    true,
  );
  updateCartSummary();
  renderSummaryList();
  notifyCartChanged();
}

function blurOnEnter(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    event.target.blur();
  }
}

function resetClearButton() {
  const button = document.querySelector(".cart-panel__clear");
  button.classList.remove("cart-panel__clear--confirm");
  button.textContent = CLEAR_LABEL;
}

function clearCart(button) {
  if (cart.length === 0) {
    return;
  }

  if (button.textContent !== CLEAR_CONFIRM_LABEL) {
    button.classList.add("cart-panel__clear--confirm");
    button.textContent = CLEAR_CONFIRM_LABEL;
    clearTimeout(clearTimer);
    clearTimer = setTimeout(resetClearButton, 3000);
    return;
  }

  clearTimeout(clearTimer);
  resetClearButton();
  cart = [];
  saveCart();
  renderCart();
}

function makeCartLine(item, isEditable) {
  const total = formatRupiah(item.qty * item.price);
  if (isEditable) {
    return item.name + " (" + item.variant + ") - " + total;
  }
  return item.qty + "x " + item.name + " (" + item.variant + ") - " + total;
}

function createQtyHtml(item) {
  return `
    <span class="qty">
      <button
        class="qty__button qty__button--minus"
        onclick="changeQty('${item.id}', -1)"
        aria-label="Kurangi"
      ></button>
      <input
        class="qty__input"
        type="text"
        inputmode="numeric"
        pattern="[0-9]*"
        autocomplete="off"
        aria-label="Jumlah"
        value="${item.qty}"
        onfocus="this.select()"
        oninput="cleanQtyInput(this)"
        onchange="setQtyInput('${item.id}', this)"
        onkeydown="blurOnEnter(event)"
      />
      <button
        class="qty__button qty__button--plus"
        onclick="changeQty('${item.id}', 1)"
        aria-label="Tambah"
      ></button>
      <button
        class="qty__button qty__button--remove"
        onclick="deleteCartItem('${item.id}')"
        aria-label="Hapus dari keranjang"
      >
        ${TRASH_ICON_HTML}
      </button>
    </span>
  `;
}

function createCartItemHtml(item) {
  return `
    <li class="cart-list__item">
      <span class="cart-list__line" id="cart-line-${item.id}">${makeCartLine(item, true)}</span>
      ${createQtyHtml(item)}
    </li>
  `;
}

function createSummaryItemHtml(item) {
  return `
    <li class="cart-list__item">
      <span class="cart-list__line">${makeCartLine(item, false)}</span>
    </li>
  `;
}

function updateCartSummary() {
  cartCountText.textContent = getCartCount();
  cartTotalText.textContent = formatRupiah(getCartTotal());
  if (summaryTotalText) {
    summaryTotalText.textContent = formatRupiah(getCartTotal());
  }
}

function renderSummaryList() {
  if (!summaryList) {
    return;
  }
  let html = "";
  for (let i = 0; i < cart.length; i++) {
    html = html + createSummaryItemHtml(cart[i]);
  }
  summaryList.innerHTML = html;
}

function notifyCartChanged() {
  if (typeof onCartRendered === "function") {
    onCartRendered();
  }
}

function renderCart() {
  updateCartSummary();

  let html = "";
  for (let i = 0; i < cart.length; i++) {
    html = html + createCartItemHtml(cart[i]);
  }
  cartList.innerHTML = html;

  renderSummaryList();

  if (cart.length === 0) {
    cartPanel.classList.add("cart-panel--empty");
  } else {
    cartPanel.classList.remove("cart-panel--empty");
  }

  notifyCartChanged();
}

function openCart() {
  closeMenu();
  cartPanel.classList.add("cart-panel--open");
  backdrop.classList.add("backdrop--visible");
  document.body.classList.add("site--locked");
}

function closeCart() {
  cartPanel.classList.remove("cart-panel--open");
  backdrop.classList.remove("backdrop--visible");
  document.body.classList.remove("site--locked");
}

function goToPreview() {
  if (cart.length === 0) {
    return;
  }
  window.location.href = "preview.html";
}

function updateHeaderState() {
  if (window.scrollY > 40) {
    siteHeader.classList.add("site-header--scrolled");
  } else {
    siteHeader.classList.remove("site-header--scrolled");
  }
}

function openMenu() {
  siteHeader.classList.add("site-header--menu-open");
  menuToggle.setAttribute("aria-expanded", "true");
  menuToggle.setAttribute("aria-label", "Tutup menu");
}

function closeMenu() {
  siteHeader.classList.remove("site-header--menu-open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Buka menu");
}

function toggleMenu() {
  if (siteHeader.classList.contains("site-header--menu-open")) {
    closeMenu();
  } else {
    openMenu();
  }
}

function closeAll() {
  closeMenu();
  closeCart();
}

function onDocumentClick(event) {
  if (!siteHeader.contains(event.target)) {
    closeMenu();
  }
}

function onWindowResize() {
  if (window.innerWidth >= 768) {
    closeMenu();
  }
}

function onDocumentKeydown(event) {
  if (event.key === "Escape") {
    closeAll();
  }
}

function onPageShow(event) {
  if (event.persisted) {
    reloadCart();
  }
}

function onStorageChange(event) {
  if (event.key === CART_KEY) {
    reloadCart();
  }
}

window.addEventListener("scroll", updateHeaderState);
window.addEventListener("resize", onWindowResize);
window.addEventListener("pageshow", onPageShow);
window.addEventListener("storage", onStorageChange);
document.addEventListener("click", onDocumentClick);
document.addEventListener("keydown", onDocumentKeydown);

updateHeaderState();
