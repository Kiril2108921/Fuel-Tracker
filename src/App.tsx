import { useState, useEffect, useCallback } from "react";

// --- Types ---

interface Food {
  id: string;
  name: string;
  amount: string;
  calories: number;
  protein: number;
  meal: Meal;
}

type Meal = "breakfast" | "lunch" | "dinner";

interface Goals {
  calories: number;
  protein: number;
}

// --- Constants ---

const GOALS: Goals = {
  calories: 2500,
  protein: 220,
};

const MEALS: Meal[] = ["breakfast", "lunch", "dinner"];

const MEAL_LABELS: Record<Meal, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

const STORAGE_KEY = "tracker-foods";

const QUICK_FOODS: Omit<Food, "id" | "meal">[] = [
  { name: "Chicken breast", amount: "6 oz", calories: 280, protein: 53 },
  { name: "White rice", amount: "1 cup", calories: 206, protein: 4 },
  { name: "Eggs", amount: "3 large", calories: 210, protein: 18 },
  { name: "Greek yogurt", amount: "1 cup", calories: 130, protein: 23 },
  { name: "Protein shake", amount: "1 scoop", calories: 120, protein: 25 },
  { name: "Banana", amount: "1 medium", calories: 105, protein: 1 },
  { name: "Oatmeal", amount: "1 cup", calories: 154, protein: 5 },
  { name: "Salmon", amount: "6 oz", calories: 350, protein: 40 },
];

// --- Helpers ---

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function loadFoods(): Food[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveFoods(foods: Food[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(foods));
}

// Default breakfast entry
const DEFAULT_FOOD: Food = {
  id: uid(),
  name: "Protein oats",
  amount: "1/2 cup",
  calories: 230,
  protein: 10,
  meal: "breakfast",
};

// --- App ---

export default function App() {
  const [foods, setFoods] = useState<Food[]>(() => {
    const saved = loadFoods();
    if (saved) return saved;
    return [DEFAULT_FOOD];
  });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formCalories, setFormCalories] = useState("");
  const [formProtein, setFormProtein] = useState("");
  const [formMeal, setFormMeal] = useState<Meal>("breakfast");
  const [isCustom, setIsCustom] = useState(false);

  // Persist
  useEffect(() => {
    saveFoods(foods);
  }, [foods]);

  // --- Derived data ---

  const totalCal = foods.reduce((s, f) => s + f.calories, 0);
  const totalPro = foods.reduce((s, f) => s + f.protein, 0);

  const mealGroups = MEALS.map((meal) => ({
    meal,
    foods: foods.filter((f) => f.meal === meal),
    cal: foods.filter((f) => f.meal === meal).reduce((s, f) => s + f.calories, 0),
    pro: foods.filter((f) => f.meal === meal).reduce((s, f) => s + f.protein, 0),
  }));

  // --- Actions ---

  const resetForm = useCallback(() => {
    setFormName("");
    setFormAmount("");
    setFormCalories("");
    setFormProtein("");
    setFormMeal("breakfast");
    setIsCustom(false);
    setEditingId(null);
  }, []);

  const handleSubmit = () => {
    const name = formName.trim();
    const cal = parseInt(formCalories) || 0;
    const pro = parseInt(formProtein) || 0;
    if (!name || cal <= 0) return;

    if (editingId) {
      setFoods((prev) =>
        prev.map((f) =>
          f.id === editingId
            ? { ...f, name, amount: formAmount, calories: cal, protein: pro, meal: formMeal }
            : f
        )
      );
    } else {
      setFoods((prev) => [
        ...prev,
        { id: uid(), name, amount: formAmount, calories: cal, protein: pro, meal: formMeal },
      ]);
    }

    resetForm();
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    setFoods((prev) => prev.filter((f) => f.id !== id));
  };

  const handleEdit = (food: Food) => {
    setEditingId(food.id);
    setFormName(food.name);
    setFormAmount(food.amount);
    setFormCalories(String(food.calories));
    setFormProtein(String(food.protein));
    setFormMeal(food.meal);
    setIsCustom(true);
    setShowForm(true);
  };

  const handleQuickAdd = (qf: Omit<Food, "id" | "meal">) => {
    setFoods((prev) => [
      ...prev,
      { ...qf, id: uid(), meal: formMeal },
    ]);
  };

  // --- Render ---

  const calPct = Math.min((totalCal / GOALS.calories) * 100, 100);
  const proPct = Math.min((totalPro / GOALS.protein) * 100, 100);
  const calOver = totalCal > GOALS.calories;
  const proOver = totalPro > GOALS.protein;

  return (
    <div className="app">
      <div className="header">
        <h1>Fuel Tracker</h1>
        <p>2,500 kcal &middot; 220g protein &middot; athlete cut</p>
      </div>

      {/* Progress */}
      <div className="card">
        <div className="card-title">Today</div>
        <div className="progress-grid">
          <div className="progress-item">
            <label>
              <span>Calories</span>
              <span>
                {totalCal.toLocaleString()} / {GOALS.calories.toLocaleString()}
              </span>
            </label>
            <div className="progress-bar">
              <div
                className={`progress-bar-fill cal${calOver ? " over" : ""}`}
                style={{ width: `${calPct}%` }}
              />
            </div>
          </div>
          <div className="progress-item">
            <label>
              <span>Protein</span>
              <span>
                {totalPro}g / {GOALS.protein}g
              </span>
            </label>
            <div className="progress-bar">
              <div
                className={`progress-bar-fill protein${proOver ? " over" : ""}`}
                style={{ width: `${proPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Meals */}
      {mealGroups.map(({ meal, foods: mealFoods, cal, pro }) => (
        <div className="card meal-section" key={meal}>
          <div className="meal-header">
            <h3>{MEAL_LABELS[meal]}</h3>
            <span className="meal-totals">
              {cal} kcal &middot; {pro}g protein
            </span>
          </div>

          {mealFoods.length === 0 && (
            <div className="empty-meal">No foods logged</div>
          )}

          {mealFoods.map((food) => (
            <div className="food-item" key={food.id}>
              <div className="food-info">
                <div className="food-name">{food.name}</div>
                {food.amount && <div className="food-amount">{food.amount}</div>}
              </div>
              <div className="food-macros">
                <span className="cal-val">{food.calories} kcal</span>
                <span className="pro-val">{food.protein}g</span>
              </div>
              <div className="food-actions">
                <button onClick={() => handleEdit(food)} title="Edit">
                  edit
                </button>
                <button
                  className="delete"
                  onClick={() => handleDelete(food.id)}
                  title="Delete"
                >
                  del
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Add / Edit Form */}
      {showForm ? (
        <div className="form-card">
          <div className="card-title">
            {editingId ? "Edit food" : "Add food"}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Meal</label>
              <select
                value={formMeal}
                onChange={(e) => setFormMeal(e.target.value as Meal)}
              >
                {MEALS.map((m) => (
                  <option key={m} value={m}>
                    {MEAL_LABELS[m]}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Amount</label>
              <input
                placeholder="e.g. 6 oz"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
              />
            </div>
          </div>

          {isCustom ? (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Food name</label>
                  <input
                    placeholder="Chicken breast"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
              <div className="form-row three">
                <div className="form-group">
                  <label>Calories</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={formCalories}
                    onChange={(e) => setFormCalories(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Protein (g)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={formProtein}
                    onChange={(e) => setFormProtein(e.target.value)}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="card-title" style={{ marginTop: "0.5rem" }}>
                Quick add
              </div>
              <div className="quick-adds">
                {QUICK_FOODS.map((qf) => (
                  <button
                    className="quick-add"
                    key={qf.name}
                    onClick={() => handleQuickAdd(qf)}
                  >
                    {qf.name}
                  </button>
                ))}
              </div>
              <button
                className="add-custom-btn"
                onClick={() => setIsCustom(true)}
              >
                + Custom food
              </button>
            </>
          )}

          <div className="btn-row">
            <button
              className="btn"
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
            >
              Cancel
            </button>
            {isCustom && (
              <button className="btn primary" onClick={handleSubmit}>
                {editingId ? "Save" : "Add"}
              </button>
            )}
          </div>
        </div>
      ) : (
        <button className="add-custom-btn" onClick={() => setShowForm(true)}>
          + Log food
        </button>
      )}
    </div>
  );
}
