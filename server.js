// server.js (Amazon API Version - FINAL UPGRADE)
require("dotenv").config();
const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();

// ENV
const PORT = process.env.PORT || 3000;
const API_URL = EXTERNAL_API_URL;
const API_KEY = process.env.EXTERNAL_API_KEY;
const SERVER_NAME = process.env.SERVER_NAME || "LocalDev";

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/**
 * Normalize Amazon → UI format
 */
function normalizeProduct(raw) {
  let cleanPrice = 0;
  if (raw.product_price) {
    const n = Number(String(raw.product_price).replace(/[^0-9.]/g, ""));
    cleanPrice = isNaN(n) ? 0 : n;
  }

  return {
    id: raw.asin || String(Math.random()),
    title: raw.product_title || "No title available",
    description: raw.product_description || "No description available",
    price: cleanPrice,
    rating: Number(raw.product_star_rating) || 0,
    image:
      raw.product_photo ||
      "https://via.placeholder.com/400x300?text=No+Image",
    url: raw.product_url || "#"
  };
}

/**
 * MAIN SEARCH ENDPOINT
 */
app.get("/api/products", async (req, res) => {
  const { q, minPrice, maxPrice, minRating, sort, page } = req.query;

  if (!q) {
    return res.status(400).json({
      serverName: SERVER_NAME,
      error: "Search term (?q=) is required"
    });
  }

  // Pagination
  const currentPage = Number(page) || 1;

  // Sort conversion UI → Amazon
  let apiSort = "RELEVANCE";
  if (sort === "price-asc") apiSort = "PRICE_LOW_TO_HIGH";
  if (sort === "price-desc") apiSort = "PRICE_HIGH_TO_LOW";
  if (sort === "rating-desc" || sort === "rating-asc") {
    apiSort = "AVERAGE_CUSTOMER_REVIEWS";
  }

  try {
    const response = await axios.get(API_URL, {
      params: {
        query: q,
        page: currentPage,
        country: "US",
        sort_by: apiSort,
        product_condition: "ALL",
        is_prime: false,
        deals_and_discounts: "NONE"
      },
      headers: {
        "x-rapidapi-key": API_KEY,
        "x-rapidapi-host": "real-time-amazon-data.p.rapidapi.com"
      },
      timeout: 10000
    });

    console.log("📡 RAW AMAZON RESPONSE:", JSON.stringify(response.data, null, 2));

    const items = response.data?.data?.products || [];
    let products = items.map(normalizeProduct);

    // Local filters
    if (minPrice) {
      products = products.filter(
        (p) => p.price !== 0 && p.price >= Number(minPrice)
      );
    }

    if (maxPrice) {
      products = products.filter(
        (p) => p.price !== 0 && p.price <= Number(maxPrice)
      );
    }

    if (minRating) {
      products = products.filter(
        (p) => Number(p.rating) >= Number(minRating)
      );
    }

    // Extra local sorting for rating
    if (sort === "rating-asc") {
      products.sort((a, b) => a.rating - b.rating);
    }
    if (sort === "rating-desc") {
      products.sort((a, b) => b.rating - a.rating);
    }

    return res.json({
      serverName: SERVER_NAME,
      query: q,
      count: products.length,
      page: currentPage,
      products
    });
  } catch (err) {
    console.error("❌ AMAZON API ERROR:", err.response?.data || err.message);

    if (err.response) {
      const status = err.response.status;
      let message = "Failed to contact Amazon API";

      if (status === 429) {
        message = "External API rate limit exceeded. Please try again later.";
      } else if (status >= 500) {
        message = "External product service is currently unavailable.";
      }

      return res.status(status).json({
        serverName: SERVER_NAME,
        error: message
      });
    }

    // Network / timeout / unknown
    return res.status(503).json({
      serverName: SERVER_NAME,
      error: "Could not reach the external product service. Please try again."
    });
  }
});

/**
 * HEALTH CHECK
 */
app.get("/api/health", (req, res) => {
  res.json({
    serverName: SERVER_NAME,
    status: "ok",
    time: new Date().toISOString()
  });
});

/**
 * FRONTEND FALLBACK
 */
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/**
 * START SERVER
 */
app.listen(PORT, () =>
  console.log(` Server (${SERVER_NAME}) running at http://localhost:${PORT}`)
);
