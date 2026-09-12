const API_BASE = "http://localhost:5000/api";

const favoritesEl = document.getElementById("favorites");
const statusEl = document.getElementById("favStatus");
const modal = document.getElementById("recipeModal");
const closeModalBtn = document.getElementById("closeModal");
const modalImage = document.getElementById("modalImage");
const modalTitle = document.getElementById("modalTitle");
const modalCategory = document.getElementById("modalCategory");
const modalArea = document.getElementById("modalArea");
const modalInstructions = document.getElementById("modalInstructions");
const modalIngredients = document.getElementById("modalIngredients");
const modalServings = document.getElementById("modalServings");

let activeMeal = null;

function setAuthUi() {
  const userId = localStorage.getItem("userId");
  const loginLink = document.getElementById("loginLink");
  const logoutBtn = document.getElementById("logoutBtn");

  if (userId) {
    loginLink.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("userId");
      localStorage.removeItem("username");
      window.location.href = "index.html";
    });
  } else {
    loginLink.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
  }
}

async function loadFavorites() {
  const userId = localStorage.getItem("userId");
  if (!userId) {
    statusEl.textContent = "Login to view your favorites.";
    favoritesEl.innerHTML = "";
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/favorites/${userId}`);
    const data = await response.json();

    if (!data || data.length === 0) {
      statusEl.textContent = "No favorites yet. Save some recipes.";
      favoritesEl.innerHTML = "";
      return;
    }

    statusEl.textContent = `${data.length} saved recipe${data.length > 1 ? "s" : ""}.`;
    favoritesEl.innerHTML = "";
    data.forEach((recipe) => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <img src="${recipe.mealImage}" alt="${recipe.mealName}">
        <h3>${recipe.mealName}</h3>
        <div class="card-actions">
          <button class="primary" type="button">View details</button>
          <button class="ghost" type="button">Remove</button>
        </div>
      `;
      const [detailsBtn, removeBtn] = card.querySelectorAll("button");
      detailsBtn.addEventListener("click", () => openModal(recipe.mealId));
      removeBtn.addEventListener("click", () => removeFavorite(recipe.mealId));
      favoritesEl.appendChild(card);
    });
  } catch (err) {
    statusEl.textContent = "Could not load favorites.";
  }
}

async function removeFavorite(mealId) {
  const userId = localStorage.getItem("userId");
  if (!userId) return;

  try {
    const response = await fetch(`${API_BASE}/favorites/${userId}/${mealId}`, {
      method: "DELETE"
    });
    const data = await response.json();
    statusEl.textContent = data.message || "Removed.";
    loadFavorites();
  } catch (err) {
    statusEl.textContent = "Failed to remove favorite.";
  }
}

function parseQuantityString(value) {
  if (value.includes(" ")) {
    const [whole, fraction] = value.split(" ");
    return Number(whole) + parseQuantityString(fraction);
  }
  if (value.includes("/")) {
    const [num, den] = value.split("/");
    const parsed = Number(num) / Number(den);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  return Number(value);
}

function parseMeasure(measure) {
  if (!measure) return null;
  const trimmed = measure.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(\.\d+)?)/);
  if (!match) {
    return { qty: null, unit: trimmed };
  }

  const qty = parseQuantityString(match[1]);
  const unit = trimmed.slice(match[0].length).trim();
  return { qty, unit };
}

function formatQuantity(qty) {
  if (!Number.isFinite(qty)) return "";
  const rounded = Math.round(qty * 100) / 100;
  if (Number.isInteger(rounded)) return `${rounded}`;
  return `${rounded}`;
}

function buildIngredientLine(ingredient, measure, factor) {
  const parsed = parseMeasure(measure);
  if (!parsed) return ingredient;

  if (!parsed.qty) {
    return `${parsed.unit} ${ingredient}`.trim();
  }

  const scaled = formatQuantity(parsed.qty * factor);
  const unit = parsed.unit ? ` ${parsed.unit}` : "";
  return `${scaled}${unit} ${ingredient}`.trim();
}

function extractIngredients(meal, factor) {
  const lines = [];
  for (let i = 1; i <= 20; i += 1) {
    const ingredient = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (ingredient && ingredient.trim()) {
      lines.push(buildIngredientLine(ingredient.trim(), measure, factor));
    }
  }
  return lines;
}

function renderInstructions(text) {
  const cleaned = (text || "").trim();
  if (!cleaned) {
    modalInstructions.innerHTML = "<p>Instructions not available.</p>";
    return;
  }

  const lines = cleaned
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    const steps = cleaned
      .split(/(?<=\.)\s+/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (steps.length > 1) {
      modalInstructions.innerHTML = `<ol>${steps
        .map((step) => `<li>${step}</li>`)
        .join("")}</ol>`;
      return;
    }
  }

  modalInstructions.innerHTML = `<ol>${lines
    .map((line) => `<li>${line}</li>`)
    .join("")}</ol>`;
}

function updateIngredients() {
  if (!activeMeal) return;
  const targetServings = Number(modalServings.value) || 1;
  const factor = targetServings / 2;
  const ingredients = extractIngredients(activeMeal, factor);
  modalIngredients.innerHTML = ingredients.map((line) => `<li>${line}</li>`).join("");
}

async function openModal(mealId) {
  modalIngredients.innerHTML = "";
  renderInstructions("Loading instructions...");
  modal.classList.remove("hidden");

  try {
    const response = await fetch(`${API_BASE}/recipes/detail/${mealId}`);
    const data = await response.json();
    if (!data.meals || !data.meals[0]) {
      renderInstructions("Instructions not available.");
      return;
    }

    activeMeal = data.meals[0];
    modalImage.src = activeMeal.strMealThumb;
    modalTitle.textContent = activeMeal.strMeal;
    modalCategory.textContent = activeMeal.strCategory || "Meal";
    modalArea.textContent = activeMeal.strArea || "Global";
    modalServings.value = 2;
    renderInstructions(activeMeal.strInstructions || "");
    updateIngredients();
  } catch (err) {
    renderInstructions("Instructions not available.");
  }
}

function closeModal() {
  modal.classList.add("hidden");
}

closeModalBtn.addEventListener("click", closeModal);
modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    closeModal();
  }
});

modalServings.addEventListener("input", updateIngredients);

setAuthUi();
loadFavorites();
