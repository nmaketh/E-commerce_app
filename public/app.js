// public/app.js

const form = document.getElementById("search-form");
const statusMessage = document.getElementById("status-message");
const resultsContainer = document.getElementById("results");
const resultsCount = document.getElementById("results-count");
const serverLabel = document.getElementById("server-label");
const loadingSkeleton = document.getElementById("loading-skeleton");
const sortSelect = document.getElementById("sort");

// Pagination elements
const prevPageBtn = document.getElementById("prev-page");
const nextPageBtn = document.getElementById("next-page");
const pageInfo = document.getElementById("page-info");

// Comparison elements
const compareBtn = document.getElementById("compare-btn");
const compareCountEl = document.getElementById("compare-count");
const compareModal = document.getElementById("compare-modal");
const compareBody = document.getElementById("compare-body");
const closeCompareBtn = document.getElementById("close-compare");
const clearCompareBtn = document.getElementById("clear-compare");

// Theme toggle
const themeToggleBtn = document.getElementById("theme-toggle");

// Global state
let lastResults = [];
let currentPage = 1;
const pageSize = 8;
const selectedCompareIds = new Set();

// === Theme handling ===
(function initTheme() {
  const saved = localStorage.getItem("smartshop-theme");
  if (saved === "dark" || saved === "light") {
    document.body.setAttribute("data-theme", saved);
  }
})();

themeToggleBtn.addEventListener("click", () => {
  const current = document.body.getAttribute("data-theme") || "light";
  const next = current === "light" ? "dark" : "light";
  document.body.setAttribute("data-theme", next);
  localStorage.setItem("smartshop-theme", next);
});

// === Form interactions ===

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  currentPage = 1; // reset to first page on new search
  await performSearch();
});

sortSelect.addEventListener("change", () => {
  if (lastResults.length > 0) {
    const sorted = sortProducts([...lastResults], sortSelect.value);
    renderPage(sorted);
  }
});

// Pagination controls
prevPageBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    const sorted = sortProducts([...lastResults], sortSelect.value);
    renderPage(sorted);
  }
});

nextPageBtn.addEventListener("click", () => {
  const totalPages = Math.max(1, Math.ceil(lastResults.length / pageSize));
  if (currentPage < totalPages) {
    currentPage++;
    const sorted = sortProducts([...lastResults], sortSelect.value);
    renderPage(sorted);
  }
});

// Comparison controls
compareBtn.addEventListener("click", () => {
  if (selectedCompareIds.size < 2) {
    showStatus(
      "Select at least two products to compare (up to three).",
      "info"
    );
    return;
  }
  openCompareModal();
});

closeCompareBtn.addEventListener("click", () => {
  compareModal.classList.add("hidden");
});

clearCompareBtn.addEventListener("click", () => {
  selectedCompareIds.clear();
  compareCountEl.textContent = "0";
  reRenderCardsSelection();
  compareModal.classList.add("hidden");
});

// === Helpers ===

function getFormValues() {
  return {
    q: document.getElementById("query").value.trim(),
    minPrice: document.getElementById("min-price").value.trim(),
    maxPrice: document.getElementById("max-price").value.trim(),
    minRating: document.getElementById("min-rating").value.trim(),
    sort: document.getElementById("sort").value,
  };
}

async function performSearch() {
  const { q, minPrice, maxPrice, minRating, sort } = getFormValues();

  if (!q) {
    showStatus("Please enter a product name or keyword.", "error");
    return;
  }

  // Reset comparison on new search
  selectedCompareIds.clear();
  compareCountEl.textContent = "0";

  // Reset UI
  showStatus("Searching products...", "info");
  resultsContainer.innerHTML = "";
  resultsCount.textContent = "";
  serverLabel.textContent = "";
  showSkeleton(true);

  const params = new URLSearchParams();
  params.set("q", q);
  if (minPrice) params.set("minPrice", minPrice);
  if (maxPrice) params.set("maxPrice", maxPrice);
  if (minRating) params.set("minRating", minRating);
  if (sort) params.set("sort", sort);

  try {
    const res = await fetch(`/api/products?${params.toString()}`);
    const data = await res.json();

    showSkeleton(false);

    if (!res.ok) {
      const msg = data.error || "Unknown error while fetching products.";
      showStatus(msg, "error");
      lastResults = [];
      resultsCount.textContent = "0 results";
      if (data.serverName) {
        serverLabel.textContent = `Server: ${data.serverName}`;
      }
      renderPage([]);
      return;
    }

    if (!data.products || data.products.length === 0) {
      showStatus(`No products found for “${data.query}”. Try another search.`, "info");
      lastResults = [];
      resultsCount.textContent = "0 results";
      if (data.serverName) {
        serverLabel.textContent = `Server: ${data.serverName}`;
      }
      renderPage([]);
      return;
    }

    lastResults = data.products;
    const sorted = sortProducts([...data.products], sort);
    renderPage(sorted);

    showStatus(`Showing results for “${data.query}”.`, "success");
    resultsCount.textContent = `${data.count} result(s)`;
    if (data.serverName) {
      serverLabel.textContent = `Server: ${data.serverName}`;
    }
  } catch (err) {
    console.error("Error calling backend:", err);
    showSkeleton(false);
    showStatus(
      "Could not reach the server. Please check your connection and try again.",
      "error"
    );
    renderPage([]);
  }
}

function sortProducts(products, sortValue) {
  if (sortValue === "price-asc") {
    products.sort((a, b) => (a.price || 0) - (b.price || 0));
  } else if (sortValue === "price-desc") {
    products.sort((a, b) => (b.price || 0) - (a.price || 0));
  } else if (sortValue === "rating-desc") {
    products.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (sortValue === "rating-asc") {
    products.sort((a, b) => (a.rating || 0) - (b.rating || 0));
  }
  return products;
}

// Render a single page of results (client-side pagination)
function renderPage(products) {
  const total = products.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  currentPage = Math.min(currentPage, totalPages);

  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageItems = products.slice(start, end);

  renderResults(pageItems);

  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  prevPageBtn.disabled = currentPage === 1;
  nextPageBtn.disabled = currentPage === totalPages || total === 0;
}

function renderResults(products) {
  resultsContainer.innerHTML = "";

  if (!products || products.length === 0) {
    return;
  }

  products.forEach((p) => {
    const card = document.createElement("article");
    card.className = "product-card";
    if (selectedCompareIds.has(p.id)) {
      card.classList.add("selected");
    }

    const safeTitle = escapeHtml(p.title);
    const safeDescription = escapeHtml(p.description);

    card.innerHTML = `
      <div class="product-image-wrapper">
        <img
          src="${p.image}"
          alt="${safeTitle}"
          class="product-image"
          onerror="this.src='https://via.placeholder.com/400x300?text=No+Image';"
        />
      </div>
      <div class="product-body">
        <h3 class="product-title" title="${safeTitle}">
          ${safeTitle}
        </h3>
        <div class="product-meta-row">
          <span class="product-price">$${Number(p.price || 0).toFixed(2)}</span>
          <span class="product-rating">${Number(p.rating || 0).toFixed(1)} ★</span>
        </div>
        <p class="product-description">
          ${safeDescription.slice(0, 140)}...
        </p>
        <div class="product-footer">
          <a
            href="${p.url}"
            target="_blank"
            rel="noopener noreferrer"
            class="btn-link"
          >
            View on store →
          </a>
          <label class="compare-toggle">
            <input type="checkbox" ${selectedCompareIds.has(p.id) ? "checked" : ""} />
            Compare
          </label>
        </div>
      </div>
    `;

    const checkbox = card.querySelector("input[type='checkbox']");
    checkbox.addEventListener("change", (e) => {
      handleCompareToggle(p.id, e.target.checked);
      if (selectedCompareIds.has(p.id)) {
        card.classList.add("selected");
      } else {
        card.classList.remove("selected");
      }
    });

    resultsContainer.appendChild(card);
  });
}

function handleCompareToggle(id, isChecked) {
  if (isChecked) {
    if (selectedCompareIds.size >= 3) {
      showStatus("You can compare up to 3 products at a time.", "error");
      // revert checkbox state visually
      reRenderCardsSelection();
      return;
    }
    selectedCompareIds.add(id);
  } else {
    selectedCompareIds.delete(id);
  }
  compareCountEl.textContent = String(selectedCompareIds.size);
}

function reRenderCardsSelection() {
  // Called when we change selection from outside the card event
  const cards = resultsContainer.querySelectorAll(".product-card");
  cards.forEach((card, index) => {
    const product = lastResults.find(
      (p) => p.id === card.dataset?.id
    );
  });
}

/* Status, skeleton, escaping */

function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type || ""}`;
}

function showSkeleton(show) {
  if (show) {
    loadingSkeleton.classList.remove("hidden");
  } else {
    loadingSkeleton.classList.add("hidden");
  }
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* Comparison modal */

function openCompareModal() {
  const selected = Array.from(selectedCompareIds);
  const products = lastResults.filter((p) => selected.includes(p.id));

  if (products.length < 2) return;

  const rows = [];

  rows.push(`
    <tr>
      <th>Product</th>
      ${products
        .map(
          (p) =>
            `<td><strong>${escapeHtml(p.title)}</strong><br /><a href="${
              p.url
            }" target="_blank" rel="noopener noreferrer" class="btn-link" style="margin-top:4px; display:inline-flex;">View →</a></td>`
        )
        .join("")}
    </tr>
  `);

  rows.push(`
    <tr>
      <th>Image</th>
      ${products
        .map(
          (p) =>
            `<td><img src="${p.image}" alt="${escapeHtml(
              p.title
            )}" onerror="this.src='https://via.placeholder.com/120x90?text=No+Image';" /></td>`
        )
        .join("")}
    </tr>
  `);

  rows.push(`
    <tr>
      <th>Price</th>
      ${products
        .map(
          (p) =>
            `<td>$${Number(p.price || 0).toFixed(2)}</td>`
        )
        .join("")}
    </tr>
  `);

  rows.push(`
    <tr>
      <th>Rating</th>
      ${products
        .map(
          (p) =>
            `<td>${Number(p.rating || 0).toFixed(1)} ★</td>`
        )
        .join("")}
    </tr>
  `);

  rows.push(`
    <tr>
      <th>Description</th>
      ${products
        .map(
          (p) =>
            `<td style="max-width:260px;">${escapeHtml(
              p.description || ""
            ).slice(0, 260)}...</td>`
        )
        .join("")}
    </tr>
  `);

  compareBody.innerHTML = `
    <table class="compare-table">
      <tbody>
        ${rows.join("")}
      </tbody>
    </table>
  `;

  compareModal.classList.remove("hidden");
}
