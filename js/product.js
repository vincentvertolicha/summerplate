let currentProduct = null;
let currentVariantIndex = 0;
let currentImage = 0;
let swipeStartX = 0;
let selectedAddons = [];

const productPage = document.getElementById("product-page");
const notFound = document.getElementById("not-found");

const ppGallery = document.getElementById("pp-gallery");
const ppThumbs = document.getElementById("pp-thumbs");
const ppImgBox = document.getElementById("pp-img-box");
const ppImg = document.getElementById("pp-img");
const ppCounter = document.getElementById("pp-counter");
const ppPromoBox = document.getElementById("pp-promo-box");
const ppPromo = document.getElementById("pp-promo");
const ppCategory = document.getElementById("pp-category");
const ppName = document.getElementById("pp-name");
const ppPrice = document.getElementById("pp-price");
const ppDesc = document.getElementById("pp-desc");
const ppChips = document.getElementById("pp-chips");
const ppVariantLabel = document.getElementById("pp-variant-label");
const ppAddons = document.getElementById("pp-addons");
const ppAddonList = document.getElementById("pp-addon-list");
const ppAddBtn = document.getElementById("pp-add-btn");

function getProductIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function renderVariantSection() {
  const onlyDefault = hasOnlyDefaultVariant(currentProduct);
  ppVariantLabel.hidden = onlyDefault;
  ppChips.hidden = onlyDefault;
}

function renderChips() {
  let html = "";
  for (let i = 0; i < currentProduct.variants.length; i++) {
    let activeClass = "";
    if (i === currentVariantIndex) {
      activeClass = " chips__item--active";
    }
    html =
      html +
      `
      <button class="chips__item${activeClass}" onclick="selectVariant(${i})">
        ${currentProduct.variants[i].label}
      </button>
    `;
  }
  ppChips.innerHTML = html;
}

function getAddonsTotal() {
  let total = 0;
  for (let i = 0; i < selectedAddons.length; i++) {
    total = total + currentProduct.addons[selectedAddons[i]].price;
  }
  return total;
}

function getSelectedAddons() {
  const result = [];
  for (let i = 0; i < selectedAddons.length; i++) {
    result.push(currentProduct.addons[selectedAddons[i]]);
  }
  return result;
}

function renderPrice(variant) {
  const addonsTotal = getAddonsTotal();

  let oldPriceHtml = "";
  if (variant.originalPrice) {
    oldPriceHtml = `<del class="product-page__price-old">${formatRupiah(variant.originalPrice + addonsTotal)}</del>`;
  }
  ppPrice.innerHTML = `${oldPriceHtml}<span class="product-page__price-now">${formatRupiah(variant.price + addonsTotal)}</span>`;
}

function createAddonPriceText(addon) {
  if (addon.price === 0) {
    return "Gratis";
  }
  return "+" + formatRupiah(addon.price);
}

function createAddonHtml(addon, index) {
  let descHtml = "";
  if (addon.description) {
    descHtml = `<span class="addon__desc">${addon.description}</span>`;
  }

  return `
    <label class="addon">
      <input class="addon__input" type="checkbox" onchange="toggleAddon(${index}, this)" />
      <span class="addon__box"></span>
      <span class="addon__text">
        <span class="addon__name">${addon.label}</span>
        ${descHtml}
      </span>
      <span class="addon__price">${createAddonPriceText(addon)}</span>
    </label>
  `;
}

function renderAddons() {
  selectedAddons = [];

  const addons = currentProduct.addons || [];
  ppAddons.hidden = addons.length === 0;

  let html = "";
  for (let i = 0; i < addons.length; i++) {
    html = html + createAddonHtml(addons[i], i);
  }
  ppAddonList.innerHTML = html;
}

function toggleAddon(index, input) {
  const position = selectedAddons.indexOf(index);

  if (input.checked && position === -1) {
    selectedAddons.push(index);
  } else if (!input.checked && position !== -1) {
    selectedAddons.splice(position, 1);
  }

  input.parentElement.classList.toggle("addon--checked", input.checked);
  renderPrice(currentProduct.variants[currentVariantIndex]);
}

function renderDescription(variant) {
  const description = variant.description || currentProduct.description || "";
  ppDesc.textContent = description;
  ppDesc.hidden = description === "";
}

function showVariantImage(variant) {
  if (typeof variant.image !== "number") {
    return;
  }
  if (variant.image >= 0 && variant.image < currentProduct.images.length) {
    showImage(variant.image);
  }
}

function selectVariant(index) {
  currentVariantIndex = index;
  const variant = currentProduct.variants[index];

  renderChips();
  renderPrice(variant);
  renderDescription(variant);
  showVariantImage(variant);
}

function renderThumbs() {
  let html = "";
  for (let i = 0; i < currentProduct.images.length; i++) {
    html =
      html +
      `
      <button class="gallery__thumb" onclick="showImage(${i})" aria-label="Gambar ${i + 1}">
        <img class="gallery__thumb-image" src="${currentProduct.images[i]}" alt="${currentProduct.name} (foto ${i + 1})" loading="lazy" />
      </button>
    `;
  }
  ppThumbs.innerHTML = html;
}

function showProduct(product) {
  currentProduct = product;
  document.title = product.name + " | " + STORE_NAME;

  ppGallery.classList.add("gallery--tone-" + getToneName(product.tone));
  ppCategory.textContent = getCategoryLabel(product.category);
  ppName.textContent = product.name;

  ppPromo.textContent = product.promo || "";
  ppPromoBox.hidden = !product.promo;

  renderAddons();
  renderThumbs();
  if (product.images.length > 1) {
    ppGallery.classList.add("gallery--multi");
  }
  showImage(0);
  renderVariantSection();
  selectVariant(0);

  productPage.hidden = false;
}

function markActiveThumb(thumb) {
  const oldThumb = ppThumbs.querySelector(".gallery__thumb--active");
  if (oldThumb) {
    oldThumb.classList.remove("gallery__thumb--active");
  }
  thumb.classList.add("gallery__thumb--active");
}

function scrollThumbIntoView(thumb) {
  const thumbBottom = thumb.offsetTop + thumb.offsetHeight;
  const visibleBottom = ppThumbs.scrollTop + ppThumbs.clientHeight;

  if (thumb.offsetTop < ppThumbs.scrollTop) {
    ppThumbs.scrollTop = thumb.offsetTop;
  } else if (thumbBottom > visibleBottom) {
    ppThumbs.scrollTop = thumbBottom - ppThumbs.clientHeight;
  }
}

function showImage(index) {
  const count = ppThumbs.children.length;

  if (index < 0) {
    index = count - 1;
  }
  if (index >= count) {
    index = 0;
  }
  currentImage = index;

  const thumb = ppThumbs.children[index];
  markActiveThumb(thumb);

  const pic = thumb.querySelector(".gallery__thumb-image");
  ppImg.src = pic.src;
  ppImg.alt = pic.alt;
  ppCounter.textContent = index + 1 + " / " + count;

  scrollThumbIntoView(thumb);
}

function stepImage(direction) {
  if (ppThumbs.children.length > 1) {
    showImage(currentImage + direction);
  }
}

function onSwipeStart(event) {
  swipeStartX = event.changedTouches[0].clientX;
}

function onSwipeEnd(event) {
  const distance = event.changedTouches[0].clientX - swipeStartX;
  if (distance < -40) {
    stepImage(1);
  } else if (distance > 40) {
    stepImage(-1);
  }
}

function onArrowKey(event) {
  if (!currentProduct) {
    return;
  }
  if (event.key === "ArrowLeft") {
    stepImage(-1);
  }
  if (event.key === "ArrowRight") {
    stepImage(1);
  }
}

function resetAddButton() {
  ppAddBtn.textContent = "Tambah ke keranjang";
}

function addToCart() {
  const variant = currentProduct.variants[currentVariantIndex];
  addItemToCart(currentProduct, variant, 1, getSelectedAddons());

  ppAddBtn.textContent = "Ditambahkan ✓";
  setTimeout(resetAddButton, 1200);
}

ppImgBox.addEventListener("touchstart", onSwipeStart, { passive: true });
ppImgBox.addEventListener("touchend", onSwipeEnd);
document.addEventListener("keydown", onArrowKey);

fillStoreInfo();

const productFromUrl = findProduct(getProductIdFromUrl());

if (productFromUrl) {
  showProduct(productFromUrl);
} else {
  document.title = "Produk Tidak Ditemukan | " + STORE_NAME;
  notFound.hidden = false;
}

loadCart();
renderCart();
