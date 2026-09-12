const API_BASE = "http://localhost:5000/api";

const searchInput = document.getElementById("searchInput");
const servingsInput = document.getElementById("servingsInput");
const searchBtn = document.getElementById("searchBtn");
const recipesEl = document.getElementById("recipes");
const statusEl = document.getElementById("status");

const modal = document.getElementById("recipeModal");
const closeModalBtn = document.getElementById("closeModal");
const modalImage = document.getElementById("modalImage");
const modalTitle = document.getElementById("modalTitle");
const modalCategory = document.getElementById("modalCategory");
const modalArea = document.getElementById("modalArea");
const modalInstructions = document.getElementById("modalInstructions");
const modalIngredients = document.getElementById("modalIngredients");
const modalServings = document.getElementById("modalServings");
const saveFavoriteBtn = document.getElementById("saveFavoriteBtn");

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
      window.location.reload();
    });
  } else {
    loginLink.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
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

function renderCards(meals) {
  recipesEl.innerHTML = "";
  if (!meals || meals.length === 0) {
    statusEl.textContent = "No recipes found. Try another search.";
    return;
  }

  statusEl.textContent = `${meals.length} recipe${meals.length > 1 ? "s" : ""} found.`;
  meals.forEach((meal) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img src="${meal.strMealThumb}" alt="${meal.strMeal}">
      <h3>${meal.strMeal}</h3>
      <p>${meal.strCategory || "Meal"} · ${meal.strArea || "Global"}</p>
      <div class="card-actions">
        <button class="primary" type="button">View details</button>
        <button class="ghost" type="button">Save</button>
      </div>
    `;

    const [detailsBtn, saveBtn] = card.querySelectorAll("button");
    detailsBtn.addEventListener("click", () => openModal(meal));
    saveBtn.addEventListener("click", () => saveFavorite(meal));

    recipesEl.appendChild(card);
  });
}

function normalizeQuery(input) {
  const cleaned = input
    .toLowerCase()
    .replace(/\b(recipes?|dish|dishes|food|cuisine)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || input.trim();
}

function titleCase(value) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

async function searchRecipe() {
  const rawQuery = searchInput.value.trim();
  const query = normalizeQuery(rawQuery);
  if (!query) {
    statusEl.textContent = "Type a recipe name to search.";
    return;
  }

  statusEl.textContent = "Searching recipes...";
  recipesEl.innerHTML = "";

  try {
    const response = await fetch(`${API_BASE}/recipes/search/${encodeURIComponent(query)}`);
    if (!response.ok) {
      const fallback = `Search failed (${response.status}).`;
      let message = fallback;
      try {
        const errorData = await response.json();
        if (errorData && errorData.message) {
          message = errorData.message;
        }
      } catch (err) {
        message = fallback;
      }
      throw new Error(message);
    }
    const data = await response.json();

    if (data.meals && data.meals.length) {
      renderCards(data.meals);
      return;
    }

    const areaQuery = titleCase(query);
    const areaResponse = await fetch(`${API_BASE}/recipes/area/${encodeURIComponent(areaQuery)}`);
    if (!areaResponse.ok) {
      throw new Error(`Area search failed (${areaResponse.status}).`);
    }
    const areaData = await areaResponse.json();
    if (areaData.meals && areaData.meals.length) {
      renderCards(areaData.meals);
      return;
    }

    const categoryResponse = await fetch(`${API_BASE}/recipes/category/${encodeURIComponent(areaQuery)}`);
    if (!categoryResponse.ok) {
      throw new Error(`Category search failed (${categoryResponse.status}).`);
    }
    const categoryData = await categoryResponse.json();
    renderCards(categoryData.meals || []);
  } catch (err) {
    const message = err && err.message ? err.message : "Search failed. Please try again.";
    statusEl.textContent = message;
  }
}

async function openModal(meal) {
  activeMeal = meal;
  modalImage.src = meal.strMealThumb;
  modalTitle.textContent = meal.strMeal;
  modalCategory.textContent = meal.strCategory || "Meal";
  modalArea.textContent = meal.strArea || "Global";
  modalServings.value = servingsInput.value || 2;
  modalIngredients.innerHTML = "";
  renderInstructions("Loading instructions...");
  modal.classList.remove("hidden");

  if (!meal.strInstructions) {
    try {
      const response = await fetch(`${API_BASE}/recipes/detail/${meal.idMeal}`);
      if (!response.ok) {
        throw new Error(`Details lookup failed (${response.status}).`);
      }
      const data = await response.json();
      if (data.meals && data.meals[0]) {
        activeMeal = data.meals[0];
      }
    } catch (err) {
      renderInstructions("Instructions not available.");
    }
  }

  modalImage.src = activeMeal.strMealThumb;
  modalTitle.textContent = activeMeal.strMeal;
  modalCategory.textContent = activeMeal.strCategory || "Meal";
  modalArea.textContent = activeMeal.strArea || "Global";
  renderInstructions(activeMeal.strInstructions || "");
  updateIngredients();
}

function closeModal() {
  modal.classList.add("hidden");
}

function updateIngredients() {
  if (!activeMeal) return;
  const targetServings = Number(modalServings.value) || 1;
  const baseServings = Math.max(Number(servingsInput.value) || 1, 1);
  const factor = targetServings / baseServings;
  const ingredients = extractIngredients(activeMeal, factor);
  modalIngredients.innerHTML = ingredients.map((line) => `<li>${line}</li>`).join("");
}

function renderInstructions(text) {
  const cleaned = text.trim();
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

async function saveFavorite(meal) {
  const userId = localStorage.getItem("userId");
  if (!userId) {
    alert("Please login to save favorites.");
    window.location = "login.html";
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/favorites/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        mealId: meal.idMeal,
        mealName: meal.strMeal,
        mealImage: meal.strMealThumb
      })
    });

    const data = await response.json();
    alert(data.message);
  } catch (err) {
    alert("Could not save favorite.");
  }
}

searchBtn.addEventListener("click", searchRecipe);
searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    searchRecipe();
  }
});

closeModalBtn.addEventListener("click", closeModal);
modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    closeModal();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modal.classList.contains("hidden")) {
    closeModal();
  }
});

modalServings.addEventListener("input", updateIngredients);
servingsInput.addEventListener("input", () => {
  if (!modal.classList.contains("hidden")) {
    modalServings.value = servingsInput.value || 1;
    updateIngredients();
  }
});
saveFavoriteBtn.addEventListener("click", () => {
  if (activeMeal) saveFavorite(activeMeal);
});

setAuthUi();
