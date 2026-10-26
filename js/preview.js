const SUGGEST_URL = "https://photon.komoot.io/api/";
const REVERSE_URL = "https://photon.komoot.io/reverse";
const REVERSE_RADIUS_KM = 0.3;

const MIN_NAME_LETTERS = 3;
const MIN_ADDRESS_LENGTH = 5;
const PHONE_PREFIXES = ["+62", "62", "08"];

const NOTE_REQUIRED_LABEL = "Catatan alamat (wajib)";
const NOTE_REQUIRED_PLACEHOLDER = "Contoh: No. 12, pagar hijau";
const PIN_REMOVED_NOTE =
  "Alamat diubah, jadi pin lama dihapus. Pilih saran alamat atau ketuk peta untuk memasang pin baru.";
const PIN_MANUAL_NOTE =
  "Pin masih di titik yang kamu pilih di peta. Hapus pin kalau lokasinya berbeda dengan alamat.";

const previewContent = document.getElementById("preview-content");
const previewEmpty = document.getElementById("preview-empty");
const ordererNameInput = document.getElementById("orderer-name");
const recipientNameInput = document.getElementById("recipient-name");
const recipientPhoneInput = document.getElementById("recipient-phone");
const recipientAddressInput = document.getElementById("recipient-address");
const arrivalTimeInput = document.getElementById("arrival-time");
const addressNoteInput = document.getElementById("address-note");
const addressNoteLabel = document.getElementById("address-note-label");
const productNoteInput = document.getElementById("product-note");
const greetingCardInput = document.getElementById("greeting-card");
const messageBox = document.getElementById("message-box");
const formError = document.getElementById("form-error");
const addressSuggest = document.getElementById("address-suggest");
const addressField = document.querySelector(".address-field");
const mapBox = document.getElementById("map-box");
const mapClearButton = document.getElementById("map-clear");
const mapNote = document.getElementById("map-note");

const NOTE_OPTIONAL_LABEL = addressNoteLabel.textContent;
const NOTE_OPTIONAL_PLACEHOLDER = addressNoteInput.placeholder;
const MAP_NOTE_DEFAULT = mapNote.textContent;

let pinLat = null;
let pinLng = null;
let map = null;
let pin = null;

let suggestions = [];
let suggestTimer = null;
let suggestCounter = 0;
let reverseCounter = 0;

let pinAddressLine = "";
let pinMode = "none";
let pinHasNumber = true;
let hasTriedToSend = false;

function twoDigits(number) {
  if (number < 10) {
    return "0" + number;
  }
  return String(number);
}

function getEarliestArrival() {
  const earliest = new Date();
  earliest.setDate(earliest.getDate() + MIN_DAYS_AHEAD);
  return earliest;
}

function getEarliestArrivalText() {
  const now = getEarliestArrival();
  return (
    now.getFullYear() +
    "-" +
    twoDigits(now.getMonth() + 1) +
    "-" +
    twoDigits(now.getDate()) +
    "T" +
    twoDigits(now.getHours()) +
    ":" +
    twoDigits(now.getMinutes())
  );
}

function formatArrivalTime(value) {
  const picked = new Date(value);

  const dateText = picked.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeText =
    twoDigits(picked.getHours()) + "." + twoDigits(picked.getMinutes());

  return dateText + ", " + timeText;
}

function setupArrivalTime() {
  arrivalTimeInput.min = getEarliestArrivalText();
}

function fillLine(line, values) {
  for (const key in values) {
    const placeholder = "{" + key + "}";
    if (line.indexOf(placeholder) !== -1) {
      if (values[key] === "") {
        return null;
      }
      line = line.replaceAll(placeholder, values[key]);
    }
  }
  return line;
}

function makeOrderLine(number, item) {
  return fillLine(WA_ORDER_LINE, {
    no: String(number),
    produk: item.name,
    variasi: item.variant,
    harga: formatRupiah(item.price),
    jumlah: String(item.qty),
    subtotal: formatRupiah(item.qty * item.price),
  });
}

function isAddressNoteRequired() {
  return !(pinMode === "synced" && pinHasNumber);
}

function updateAddressNoteLabel() {
  if (isAddressNoteRequired()) {
    addressNoteLabel.textContent = NOTE_REQUIRED_LABEL;
    addressNoteInput.placeholder = NOTE_REQUIRED_PLACEHOLDER;
  } else {
    addressNoteLabel.textContent = NOTE_OPTIONAL_LABEL;
    addressNoteInput.placeholder = NOTE_OPTIONAL_PLACEHOLDER;
  }
}

function getPhoneDigits() {
  return recipientPhoneInput.value.replace(/\D/g, "");
}

function getPhoneText() {
  return recipientPhoneInput.value.replace(/[\s-]/g, "");
}

function hasValidPhonePrefix() {
  const text = getPhoneText();
  for (let i = 0; i < PHONE_PREFIXES.length; i++) {
    if (text.startsWith(PHONE_PREFIXES[i])) {
      return true;
    }
  }
  return false;
}

function isPhoneLengthValid() {
  const length = getPhoneDigits().length;
  return length >= 9 && length <= 15;
}

function onPhoneInput(input) {
  let text = input.value.replace(/[^\d+\-\s]/g, "");

  if (text.charAt(0) === "+") {
    text = "+" + text.slice(1).replace(/\+/g, "");
  } else {
    text = text.replace(/\+/g, "");
  }

  input.value = text;
  updatePreview();
}

function countLetters(text) {
  const letters = text.match(/\p{L}/gu);
  if (letters === null) {
    return 0;
  }
  return letters.length;
}

function isNameLongEnough(input) {
  return countLetters(input.value) >= MIN_NAME_LETTERS;
}

function isAddressLongEnough() {
  return recipientAddressInput.value.trim().length >= MIN_ADDRESS_LENGTH;
}

function getTextOrDash(input) {
  const text = input.value.trim();
  if (text === "") {
    return "-";
  }
  return text;
}

function getArrivalText() {
  if (arrivalTimeInput.value === "") {
    return "-";
  }
  return formatArrivalTime(arrivalTimeInput.value);
}

function getOrderText() {
  const lines = [];
  for (let i = 0; i < cart.length; i++) {
    lines.push(makeOrderLine(i + 1, cart[i]) || "");
  }
  return lines.join("\n");
}

function getLocationLink() {
  if (pinLat === null) {
    return "";
  }
  return (
    "https://www.google.com/maps?q=" +
    pinLat.toFixed(6) +
    "," +
    pinLng.toFixed(6)
  );
}

function getMessageValues() {
  return {
    toko: STORE_NAME,
    pemesan: getTextOrDash(ordererNameInput),
    nama: getTextOrDash(recipientNameInput),
    telepon: getTextOrDash(recipientPhoneInput),
    alamat: getTextOrDash(recipientAddressInput),
    catatan_alamat: addressNoteInput.value.trim(),
    lokasi: getLocationLink(),
    waktu: getArrivalText(),
    pesanan: getOrderText(),
    catatan_produk: productNoteInput.value.trim(),
    kartu_ucapan: greetingCardInput.value.trim(),
    total: formatRupiah(getCartTotal()),
  };
}

function buildMessage() {
  const values = getMessageValues();
  const lines = [];

  for (let i = 0; i < WA_MESSAGE.length; i++) {
    const filled = fillLine(WA_MESSAGE[i], values);
    if (filled !== null) {
      lines.push(filled);
    }
  }
  return lines.join("\n");
}

function updatePreview() {
  updateAddressNoteLabel();
  messageBox.value = buildMessage();

  if (hasTriedToSend) {
    checkForm(false);
  }
}

function markInvalid(input, isInvalid) {
  let field = input.parentElement;
  while (!field.classList.contains("field")) {
    field = field.parentElement;
  }

  if (isInvalid) {
    field.classList.add("field--invalid");
  } else {
    field.classList.remove("field--invalid");
  }
}

function isArrivalTimePast() {
  if (arrivalTimeInput.value === "") {
    return false;
  }
  return (
    new Date(arrivalTimeInput.value).getTime() < getEarliestArrival().getTime()
  );
}

function getNoteMissingMessage() {
  if (pinMode === "synced") {
    return "Alamat yang dipilih belum ada nomor rumahnya. Isi catatan alamat (nomor rumah).";
  }
  return "Alamat tidak dipilih dari saran, jadi catatan alamat wajib diisi (nomor rumah).";
}

function markAllFields(
  ordererBad,
  nameBad,
  phoneBad,
  addressBad,
  timeBad,
  noteMissing,
) {
  markInvalid(ordererNameInput, ordererBad);
  markInvalid(recipientNameInput, nameBad);
  markInvalid(recipientPhoneInput, phoneBad);
  markInvalid(recipientAddressInput, addressBad);
  markInvalid(arrivalTimeInput, timeBad);
  markInvalid(addressNoteInput, noteMissing);
}

function checkForm(shouldFocus) {
  const ordererEmpty = ordererNameInput.value.trim() === "";
  const ordererShort = !ordererEmpty && !isNameLongEnough(ordererNameInput);
  const nameEmpty = recipientNameInput.value.trim() === "";
  const nameShort = !nameEmpty && !isNameLongEnough(recipientNameInput);
  const phoneEmpty = recipientPhoneInput.value.trim() === "";
  const phonePrefixBad = !phoneEmpty && !hasValidPhonePrefix();
  const phoneLengthBad = !phoneEmpty && !isPhoneLengthValid();
  const addressEmpty = recipientAddressInput.value.trim() === "";
  const addressShort = !addressEmpty && !isAddressLongEnough();
  const timeEmpty = arrivalTimeInput.value === "";
  const noteMissing =
    isAddressNoteRequired() && addressNoteInput.value.trim() === "";

  arrivalTimeInput.min = getEarliestArrivalText();
  const timePast = isArrivalTimePast();

  markAllFields(
    ordererEmpty || ordererShort,
    nameEmpty || nameShort,
    phoneEmpty || phonePrefixBad || phoneLengthBad,
    addressEmpty || addressShort,
    timeEmpty || timePast,
    noteMissing,
  );

  let message = "";
  let firstProblem = null;

  if (ordererEmpty) {
    message = "Nama pemesan belum diisi.";
    firstProblem = ordererNameInput;
  } else if (ordererShort) {
    message = "Nama pemesan minimal " + MIN_NAME_LETTERS + " huruf.";
    firstProblem = ordererNameInput;
  } else if (nameEmpty) {
    message = "Nama penerima belum diisi.";
    firstProblem = recipientNameInput;
  } else if (nameShort) {
    message = "Nama penerima minimal " + MIN_NAME_LETTERS + " huruf.";
    firstProblem = recipientNameInput;
  } else if (phoneEmpty) {
    message = "Nomor penerima belum diisi.";
    firstProblem = recipientPhoneInput;
  } else if (phonePrefixBad) {
    message = "Nomor penerima harus diawali +62, 62, atau 08.";
    firstProblem = recipientPhoneInput;
  } else if (phoneLengthBad) {
    message = "Nomor penerima tidak valid (harus 9-15 angka).";
    firstProblem = recipientPhoneInput;
  } else if (addressEmpty) {
    message = "Alamat penerima belum diisi.";
    firstProblem = recipientAddressInput;
  } else if (addressShort) {
    message =
      "Alamat penerima minimal " +
      MIN_ADDRESS_LENGTH +
      " karakter (contoh: Jl. A).";
    firstProblem = recipientAddressInput;
  } else if (timeEmpty) {
    message = "Waktu sampai belum diisi.";
    firstProblem = arrivalTimeInput;
  } else if (timePast) {
    message =
      "Waktu sampai minimal " +
      MIN_DAYS_AHEAD +
      " hari dari sekarang (H+" +
      MIN_DAYS_AHEAD +
      ").";
    firstProblem = arrivalTimeInput;
  } else if (noteMissing) {
    message = getNoteMissingMessage();
    firstProblem = addressNoteInput;
  }

  formError.textContent = message;
  formError.hidden = message === "";

  if (firstProblem !== null && shouldFocus) {
    firstProblem.focus();
  }

  return firstProblem === null;
}

function getAddressFirstLine() {
  return recipientAddressInput.value.split("\n")[0].trim();
}

function setMapNote(text, isWarning) {
  mapNote.textContent = text;
  if (isWarning) {
    mapNote.classList.add("map-box__note--warn");
  } else {
    mapNote.classList.remove("map-box__note--warn");
  }
}

function checkPinStillMatches() {
  if (pinLat === null) {
    return;
  }

  reverseCounter = reverseCounter + 1;

  const changed = getAddressFirstLine() !== pinAddressLine;

  if (pinMode === "synced" && changed) {
    removePin();
    setMapNote(PIN_REMOVED_NOTE, true);
  } else if (pinMode === "manual" && changed) {
    setMapNote(PIN_MANUAL_NOTE, true);
  } else if (mapNote.textContent === PIN_MANUAL_NOTE) {
    setMapNote(MAP_NOTE_DEFAULT, false);
  }
}

function onAddressInput() {
  checkPinStillMatches();
  updatePreview();

  clearTimeout(suggestTimer);
  suggestTimer = setTimeout(loadSuggestions, 400);
}

function onAddressKeydown(event) {
  if (event.key === "Escape") {
    hideSuggestions();
  }
}

function getSuggestionIndex(item) {
  for (let i = 0; i < addressSuggest.children.length; i++) {
    if (addressSuggest.children[i] === item) {
      return i;
    }
  }
  return -1;
}

function onSuggestClick(event) {
  chooseSuggestion(getSuggestionIndex(event.currentTarget));
}

function onSuggestKeydown(event) {
  const item = event.currentTarget;

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    chooseSuggestion(getSuggestionIndex(item));
  } else if (event.key === "ArrowDown") {
    event.preventDefault();
    if (item.nextElementSibling !== null) {
      item.nextElementSibling.focus();
    }
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    if (item.previousElementSibling !== null) {
      item.previousElementSibling.focus();
    } else {
      recipientAddressInput.focus();
    }
  } else if (event.key === "Escape") {
    hideSuggestions();
    recipientAddressInput.focus();
  }
}

function hideSuggestions() {
  clearTimeout(suggestTimer);
  suggestCounter = suggestCounter + 1;

  suggestions = [];
  addressSuggest.hidden = true;
  addressSuggest.innerHTML = "";
}

function makeStreetText(props) {
  const street = props.street || "";
  if (!props.housenumber) {
    return street;
  }
  if (street !== "") {
    return street + " No. " + props.housenumber;
  }
  return "No. " + props.housenumber;
}

function makeAddressLabel(props) {
  const parts = [
    props.name,
    makeStreetText(props),
    props.locality,
    props.district,
    props.city || props.county,
    props.state,
    props.postcode,
  ];

  const result = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part && result.indexOf(part) === -1) {
      result.push(part);
    }
  }
  return result.join(", ");
}

function loadSuggestions() {
  const text = getAddressFirstLine();
  if (text.length < 3) {
    hideSuggestions();
    return;
  }

  const url =
    SUGGEST_URL +
    "?q=" +
    encodeURIComponent(text) +
    "&limit=5&countrycode=ID&lat=" +
    MAP_START[0] +
    "&lon=" +
    MAP_START[1];

  suggestCounter = suggestCounter + 1;
  const myNumber = suggestCounter;

  fetch(url)
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      if (myNumber === suggestCounter) {
        showSuggestions(data.features);
      }
    })
    .catch(function () {
      hideSuggestions();
    });
}

function createSuggestionItem(label) {
  const item = document.createElement("li");
  item.className = "address-field__option";
  item.setAttribute("role", "option");
  item.tabIndex = 0;
  item.onkeydown = onSuggestKeydown;
  item.onclick = onSuggestClick;
  item.textContent = label;
  return item;
}

function showSuggestions(features) {
  suggestions = [];
  addressSuggest.innerHTML = "";

  for (let i = 0; i < features.length; i++) {
    const props = features[i].properties;
    const label = makeAddressLabel(props);
    if (label === "") {
      continue;
    }

    suggestions.push({
      label: label,
      hasNumber: props.housenumber ? true : false,
      lng: features[i].geometry.coordinates[0],
      lat: features[i].geometry.coordinates[1],
    });
    addressSuggest.appendChild(createSuggestionItem(label));
  }

  addressSuggest.hidden = suggestions.length === 0;
}

function setAddressFirstLine(text) {
  const lines = recipientAddressInput.value.split("\n");
  lines[0] = text;
  recipientAddressInput.value = lines.join("\n");
}

function chooseSuggestion(index) {
  const suggestion = suggestions[index];
  if (!suggestion) {
    return;
  }

  setAddressFirstLine(suggestion.label);
  hideSuggestions();

  pinMode = "synced";
  pinAddressLine = getAddressFirstLine();
  pinHasNumber = suggestion.hasNumber;

  setPin(suggestion.lat, suggestion.lng, true, false);
}

function closeSuggestionsIfOutside(event) {
  if (!addressField.contains(event.target)) {
    hideSuggestions();
  }
}

function onMapClick(event) {
  setPin(event.latlng.lat, event.latlng.lng, false, true);
}

function setupMap() {
  if (map !== null) {
    map.invalidateSize();
    return;
  }

  if (typeof L === "undefined") {
    mapBox.hidden = true;
    return;
  }

  map = L.map("map").setView(MAP_START, MAP_START_ZOOM);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  map.on("click", onMapClick);
}

function onPinDragEnd() {
  const position = pin.getLatLng();
  setPin(position.lat, position.lng, false, true);
}

function createPinMarker(lat, lng) {
  const pinIcon = L.divIcon({
    className: "pin",
    html: '<span class="pin__marker"></span>',
    iconSize: [26, 26],
    iconAnchor: [13, 31],
  });
  pin = L.marker([lat, lng], { draggable: true, icon: pinIcon }).addTo(map);
  pin.on("dragend", onPinDragEnd);
}

function showPinOnMap(lat, lng, moveMap) {
  if (map === null) {
    return;
  }

  if (pin === null) {
    createPinMarker(lat, lng);
  } else {
    pin.setLatLng([lat, lng]);
  }

  if (moveMap) {
    map.setView([lat, lng], 17);
  }
}

function setPin(lat, lng, moveMap, lookup) {
  pinLat = lat;
  pinLng = lng;

  showPinOnMap(lat, lng, moveMap);
  mapClearButton.hidden = false;

  if (lookup) {
    pinMode = "manual";
    pinAddressLine = getAddressFirstLine();
  }
  updatePreview();

  if (lookup) {
    lookupAddressFromPin(lat, lng);
  } else {
    reverseCounter = reverseCounter + 1;
    setMapNote(MAP_NOTE_DEFAULT, false);
  }
}

function useAddressFromPin(props) {
  setAddressFirstLine(makeAddressLabel(props));
  hideSuggestions();
  pinMode = "synced";
  pinAddressLine = getAddressFirstLine();
  pinHasNumber = props.housenumber ? true : false;
  setMapNote(MAP_NOTE_DEFAULT, false);
  updatePreview();
}

function showReverseResult(data) {
  let props = {};
  if (data.features && data.features.length > 0) {
    props = data.features[0].properties;
  }

  if (makeAddressLabel(props) === "") {
    setMapNote(
      "Alamat di titik ini tidak ditemukan. Alamat di kolom tidak diubah, sesuaikan sendiri kalau perlu.",
      true,
    );
    return;
  }

  useAddressFromPin(props);
}

function showReverseError() {
  setMapNote(
    "Alamat belum bisa dicari (koneksi bermasalah). Alamat di kolom tidak diubah.",
    true,
  );
}

function lookupAddressFromPin(lat, lng) {
  reverseCounter = reverseCounter + 1;
  const myNumber = reverseCounter;
  setMapNote("Mencari alamat di titik ini...", false);

  const url =
    REVERSE_URL +
    "?lat=" +
    lat.toFixed(6) +
    "&lon=" +
    lng.toFixed(6) +
    "&limit=1&radius=" +
    REVERSE_RADIUS_KM;

  fetch(url)
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      if (myNumber === reverseCounter) {
        showReverseResult(data);
      }
    })
    .catch(function () {
      if (myNumber === reverseCounter) {
        showReverseError();
      }
    });
}

function removePin() {
  pinLat = null;
  pinLng = null;
  pinMode = "none";
  pinAddressLine = "";
  if (pin !== null) {
    pin.remove();
    pin = null;
  }
  mapClearButton.hidden = true;
  reverseCounter = reverseCounter + 1;
  setMapNote(MAP_NOTE_DEFAULT, false);
  updatePreview();
}

function onCartRendered() {
  const isEmpty = cart.length === 0;
  previewContent.hidden = isEmpty;
  previewEmpty.hidden = !isEmpty;
  if (isEmpty) {
    closeCart();
  } else {
    setupMap();
  }
  updatePreview();
}

function sendToWhatsApp() {
  if (cart.length === 0) {
    return;
  }

  hasTriedToSend = true;
  if (!checkForm(true)) {
    return;
  }

  const link =
    "https://wa.me/" +
    WA_NUMBER +
    "?text=" +
    encodeURIComponent(messageBox.value);
  window.open(link, "_blank");
}

document.addEventListener("click", closeSuggestionsIfOutside);
document.addEventListener("focusin", closeSuggestionsIfOutside);

fillStoreInfo();
document.title = "Konfirmasi Pesanan | " + STORE_NAME;
setupArrivalTime();
loadCart();
renderCart();
