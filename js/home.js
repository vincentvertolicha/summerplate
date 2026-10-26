let currentCategory = "semua";
let minPrice = null;
let maxPrice = null;

let draftCategory = "semua";
let draftMin = null;
let draftMax = null;
let lastFocused = null;
let pillTimer = null;

const MAX_PILL_ROWS = 2;
const MORE_LABEL = "more";

const productGrid = document.getElementById("product-grid");

const filterBadge = document.getElementById("filter-badge");
const filterResult = document.getElementById("filter-result");
const filterResetLink = document.getElementById("filter-reset");
const filterBackdrop = document.getElementById("filter-backdrop");
const filterPanel = document.getElementById("filter-panel");
const filterCategoryGroup = document.getElementById("filter-category-group");
const filterCategories = document.getElementById("filter-categories");
const filterMinInput = document.getElementById("filter-min");
const filterMaxInput = document.getElementById("filter-max");
const filterRange = document.getElementById("filter-range");
const filterError = document.getElementById("filter-error");
const filterApplyButton = document.getElementById("filter-apply");

function fillHomeText() {
  setText("hero-eyebrow", HERO_EYEBROW);
  setText("hero-title-line1", HERO_TITLE_LINE1);
  setText("hero-title-accent", HERO_TITLE_ACCENT);
  setText("hero-text", HERO_TEXT);
  setText("hero-button", HERO_BUTTON);
  setText("catalog-title", CATALOG_TITLE);
  setText("about-eyebrow", ABOUT_EYEBROW);
  setText("about-title-line1", ABOUT_TITLE_LINE1);
  setText("about-title-accent", ABOUT_TITLE_ACCENT);
  setText("about-text", fillText(ABOUT_TEXT));
}

function countProducts(categoryId) {
  let count = 0;
  for (let i = 0; i < products.length; i++) {
    if (products[i].category === categoryId) {
      count = count + 1;
    }
  }
  return count;
}

function parsePrice(text) {
  const digits = text.replace(/\D/g, "");
  if (digits === "") {
    return null;
  }
  return Number(digits);
}

function productMatches(product, category, min, max) {
  if (category !== "semua" && product.category !== category) {
    return false;
  }

  if (min === null && max === null) {
    return true;
  }

  for (let i = 0; i < product.variants.length; i++) {
    const price = product.variants[i].price;
    const okMin = min === null || price >= min;
    const okMax = max === null || price <= max;
    if (okMin && okMax) {
      return true;
    }
  }
  return false;
}

function countMatches(category, min, max) {
  let count = 0;
  for (let i = 0; i < products.length; i++) {
    if (productMatches(products[i], category, min, max)) {
      count = count + 1;
    }
  }
  return count;
}

function getPriceRangeText() {
  let lowest = null;
  let highest = null;

  for (let i = 0; i < products.length; i++) {
    for (let j = 0; j < products[i].variants.length; j++) {
      const price = products[i].variants[j].price;
      if (lowest === null || price < lowest) {
        lowest = price;
      }
      if (highest === null || price > highest) {
        highest = price;
      }
    }
  }

  if (lowest === null) {
    return "";
  }
  return (
    "Harga produk: " + formatRupiah(lowest) + " - " + formatRupiah(highest)
  );
}

function isFilterOpen() {
  return filterPanel.classList.contains("filter-panel--open");
}

function isDraftRangeInvalid() {
  return draftMin !== null && draftMax !== null && draftMin > draftMax;
}

function createFilterChipHtml(categoryId, label, count) {
  let activeClass = "";
  if (categoryId === draftCategory) {
    activeClass = " chips__item--active";
  }

  return `
    <button type="button" class="chips__item${activeClass}" onclick="setDraftCategory('${categoryId}')">
      ${label} <span class="filter-chips__count">${count}</span>
    </button>
  `;
}

function renderFilterCategories() {
  if (categories.length === 0) {
    filterCategoryGroup.hidden = true;
    return;
  }

  filterCategoryGroup.hidden = false;

  let html = createFilterChipHtml("semua", ALL_CATEGORY_LABEL, products.length);
  for (let i = 0; i < categories.length; i++) {
    const category = categories[i];
    html =
      html +
      createFilterChipHtml(
        category.id,
        category.label,
        countProducts(category.id),
      );
  }
  filterCategories.innerHTML = html;
}

function updateApplyButton() {
  if (isDraftRangeInvalid()) {
    filterError.textContent =
      "Harga minimum tidak boleh lebih besar dari harga maksimum.";
    filterError.hidden = false;
    filterApplyButton.disabled = true;
    filterApplyButton.textContent = "Tampilkan produk";
    return;
  }

  filterError.hidden = true;

  const count = countMatches(draftCategory, draftMin, draftMax);
  if (count === 0) {
    filterApplyButton.disabled = true;
    filterApplyButton.textContent = "Tidak ada produk yang cocok";
  } else {
    filterApplyButton.disabled = false;
    filterApplyButton.textContent = "Tampilkan " + count + " produk";
  }
}

function setDraftCategory(categoryId) {
  draftCategory = categoryId;
  renderFilterCategories();
  updateApplyButton();
}

function onFilterPriceInput() {
  filterMinInput.value = filterMinInput.value.replace(/\D/g, "").slice(0, 9);
  filterMaxInput.value = filterMaxInput.value.replace(/\D/g, "").slice(0, 9);
  draftMin = parsePrice(filterMinInput.value);
  draftMax = parsePrice(filterMaxInput.value);
  updateApplyButton();
}

function onFilterEnter(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    if (!filterApplyButton.disabled) {
      applyFilter();
    }
  }
}

function resetDraft() {
  draftCategory = "semua";
  draftMin = null;
  draftMax = null;
  filterMinInput.value = "";
  filterMaxInput.value = "";
  renderFilterCategories();
  updateApplyButton();
}

function openFilter() {
  lastFocused = document.activeElement;

  draftCategory = currentCategory;
  draftMin = minPrice;
  draftMax = maxPrice;
  filterMinInput.value = minPrice === null ? "" : minPrice;
  filterMaxInput.value = maxPrice === null ? "" : maxPrice;
  filterRange.textContent = getPriceRangeText();

  renderFilterCategories();
  updateApplyButton();

  filterPanel.classList.add("filter-panel--open");
  filterBackdrop.classList.add("filter-backdrop--visible");
  document.body.classList.add("site--locked");
  filterPanel.focus();
}

function closeFilter() {
  filterPanel.classList.remove("filter-panel--open");
  filterBackdrop.classList.remove("filter-backdrop--visible");
  document.body.classList.remove("site--locked");

  if (lastFocused) {
    lastFocused.focus();
  }
}

function applyFilter() {
  if (isDraftRangeInvalid()) {
    return;
  }

  currentCategory = draftCategory;
  minPrice = draftMin;
  maxPrice = draftMax;
  closeFilter();
  renderCatalog();
}

function resetFilter() {
  currentCategory = "semua";
  minPrice = null;
  maxPrice = null;
  renderCatalog();
}

function onFilterKeydown(event) {
  if (event.key === "Escape" && isFilterOpen()) {
    closeFilter();
  }
}

function renderFilterBar() {
  let activeCount = 0;
  if (currentCategory !== "semua") {
    activeCount = activeCount + 1;
  }
  if (minPrice !== null || maxPrice !== null) {
    activeCount = activeCount + 1;
  }

  filterBadge.hidden = activeCount === 0;
  filterBadge.textContent = activeCount;
  filterResetLink.hidden = activeCount === 0;

  if (activeCount === 0) {
    filterResult.textContent = products.length + " produk";
  } else {
    const shown = countMatches(currentCategory, minPrice, maxPrice);
    filterResult.textContent =
      "Menampilkan " + shown + " dari " + products.length + " produk";
  }
}

function createPromoHtml(product) {
  if (!product.promo) {
    return "";
  }
  return `<p class="promo"><span class="promo__text">${product.promo}</span></p>`;
}

function createPriceHtml(product) {
  const cheapest = getCheapestVariant(product);

  let prefixHtml = "";
  if (product.variants.length > 1) {
    prefixHtml = `<span class="product__price-prefix">dari</span>`;
  }

  let oldPriceHtml = "";
  if (cheapest.originalPrice) {
    oldPriceHtml = `<del class="product__price-old">${formatRupiah(cheapest.originalPrice)}</del>`;
  }

  return `${prefixHtml}${oldPriceHtml}<span class="product__price-value">${formatRupiah(cheapest.price)}</span>`;
}

function createPillsHtml(product) {
  if (hasOnlyDefaultVariant(product)) {
    return "";
  }

  let html = "";
  for (let i = 0; i < product.variants.length; i++) {
    html =
      html + `<span class="product__pill">${product.variants[i].label}</span>`;
  }
  html =
    html +
    `<span class="product__pill product__pill--more" hidden>${MORE_LABEL}</span>`;
  return html;
}

function getRowTops(elements) {
  const tops = [];
  for (let i = 0; i < elements.length; i++) {
    const top = elements[i].offsetTop;
    if (tops.indexOf(top) === -1) {
      tops.push(top);
    }
  }
  return tops;
}

function fitPills(box) {
  const pills = box.querySelectorAll(
    ".product__pill:not(.product__pill--more)",
  );
  const more = box.querySelector(".product__pill--more");
  if (more === null) {
    return;
  }

  for (let i = 0; i < pills.length; i++) {
    pills[i].hidden = false;
  }
  more.hidden = true;

  const tops = getRowTops(pills);
  if (tops.length <= MAX_PILL_ROWS) {
    return;
  }

  const lastRowTop = tops[MAX_PILL_ROWS - 1];
  more.hidden = false;

  let visible = pills.length;
  while (visible > 0 && more.offsetTop > lastRowTop) {
    visible = visible - 1;
    pills[visible].hidden = true;
  }

  more.title = pills.length - visible + " variasi lainnya";
}

function fitAllPills() {
  const boxes = document.querySelectorAll(".product__pills");
  for (let i = 0; i < boxes.length; i++) {
    fitPills(boxes[i]);
  }
}

function onPillResize() {
  clearTimeout(pillTimer);
  pillTimer = setTimeout(fitAllPills, 150);
}

function createProductCardHtml(product, index) {
  const delay = (0.05 + Math.min(index, 7) * 0.07).toFixed(2);

  let promoClass = "";
  if (!product.promo) {
    promoClass = " product--no-promo";
  }

  return `
    <article class="product product--tone-${getToneName(product.tone)}${promoClass}" style="animation-delay: ${delay}s">
      <div class="product__visual">
        <div class="product__image">
          <img class="product__photo" src="${product.images[0]}" alt="${product.name}" loading="lazy" decoding="async" />
        </div>
        ${createPromoHtml(product)}
      </div>
      <div class="product__info">
        <div class="product__row">
          <h3 class="product__name">
            <a class="product__link" href="product.html?id=${product.id}">${product.name}</a>
          </h3>
          <span class="product__price">${createPriceHtml(product)}</span>
        </div>
        <div class="product__pills">${createPillsHtml(product)}</div>
      </div>
    </article>
  `;
}

function renderProducts() {
  let html = "";
  let shown = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    if (productMatches(product, currentCategory, minPrice, maxPrice)) {
      html = html + createProductCardHtml(product, shown);
      shown = shown + 1;
    }
  }

  if (shown === 0) {
    html = `<p class="catalog__empty">Tidak ada produk yang cocok dengan filter.</p>`;
  }

  productGrid.innerHTML = html;
  fitAllPills();
}

function renderCatalog() {
  renderFilterBar();
  renderProducts();
}

function filterProducts(categoryId) {
  currentCategory = categoryId;
  renderCatalog();
}

function addProduct(product) {
  if (findProduct(product.id)) {
    console.warn('Produk dengan id "' + product.id + '" sudah ada.');
    return;
  }
  prepareProduct(product);
  products.push(product);
  renderCatalog();
}

function updateProduct(id, changes) {
  const product = findProduct(id);
  if (!product) {
    console.warn('Produk dengan id "' + id + '" tidak ditemukan.');
    return;
  }

  for (const key in changes) {
    product[key] = changes[key];
  }
  prepareProduct(product);
  renderCatalog();
}

function deleteProduct(id) {
  for (let i = 0; i < products.length; i++) {
    if (products[i].id === id) {
      products.splice(i, 1);
      renderCatalog();
      return;
    }
  }
  console.warn('Produk dengan id "' + id + '" tidak ditemukan.');
}

document.addEventListener("keydown", onFilterKeydown);
window.addEventListener("resize", onPillResize);
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(fitAllPills);
}

fillStoreInfo();
fillHomeText();
renderCatalog();
loadCart();
renderCart();
