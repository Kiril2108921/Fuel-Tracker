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
type Activity = "light" | "moderate" | "active" | "very-active";
type GoalMode = "cut" | "maintain" | "bulk";

interface Goals {
  calories: number;
  protein: number;
}

interface Profile {
  heightFeet: string;
  heightInches: string;
  weight: string;
  activity: Activity;
  goalMode: GoalMode;
}

interface QuickFood {
  name: string;
  amount: string;
  calories: number;
  protein: number;
}

// --- Constants ---

const DEFAULT_GOALS: Goals = {
  calories: 2500,
  protein: 220,
};

const DEFAULT_PROFILE: Profile = {
  heightFeet: "5",
  heightInches: "10",
  weight: "180",
  activity: "active",
  goalMode: "cut",
};

const MEALS: Meal[] = ["breakfast", "lunch", "dinner"];

const MEAL_LABELS: Record<Meal, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

const ACTIVITY_LABELS: Record<Activity, string> = {
  light: "Light",
  moderate: "Moderate",
  active: "Active",
  "very-active": "Very active",
};

const ACTIVITY_FACTORS: Record<Activity, number> = {
  light: 1.35,
  moderate: 1.5,
  active: 1.7,
  "very-active": 1.9,
};

const GOAL_LABELS: Record<GoalMode, string> = {
  cut: "Cut",
  maintain: "Maintain",
  bulk: "Bulk",
};

const GOAL_CALORIE_ADJUSTMENTS: Record<GoalMode, number> = {
  cut: -350,
  maintain: 0,
  bulk: 300,
};

const STORAGE_KEY = "tracker-foods";
const GOALS_STORAGE_KEY = "tracker-goals";
const PROFILE_STORAGE_KEY = "tracker-profile";

const QUICK_FOODS: QuickFood[] = [
  { name: "Chicken breast", amount: "1 oz", calories: 47, protein: 9 },
  { name: "White rice", amount: "1 cup", calories: 206, protein: 4 },
  { name: "Eggs", amount: "1 large", calories: 70, protein: 6 },
  { name: "Greek yogurt", amount: "1 cup", calories: 130, protein: 23 },
  { name: "Protein shake", amount: "1 scoop", calories: 120, protein: 25 },
  { name: "Banana", amount: "1 medium", calories: 105, protein: 1 },
  { name: "Oatmeal", amount: "1 cup", calories: 154, protein: 5 },
  { name: "Salmon", amount: "1 oz", calories: 58, protein: 7 },
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

function loadGoals(): Goals {
  try {
    const raw = localStorage.getItem(GOALS_STORAGE_KEY);
    if (!raw) return DEFAULT_GOALS;
    const parsed = JSON.parse(raw) as Goals;
    return {
      calories: parsed.calories || DEFAULT_GOALS.calories,
      protein: parsed.protein || DEFAULT_GOALS.protein,
    };
  } catch {
    return DEFAULT_GOALS;
  }
}

function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

function saveFoods(foods: Food[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(foods));
}

function saveGoals(goals: Goals) {
  localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals));
}

function saveProfile(profile: Profile) {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

function roundToNearest(value: number, nearest: number) {
  return Math.round(value / nearest) * nearest;
}

function calculateGoals(profile: Profile): Goals {
  const feet = parseInt(profile.heightFeet) || 0;
  const inches = parseInt(profile.heightInches) || 0;
  const weightLb = parseFloat(profile.weight) || 0;
  const totalInches = feet * 12 + inches;

  if (totalInches <= 0 || weightLb <= 0) return DEFAULT_GOALS;

  const weightKg = weightLb / 2.20462;
  const heightCm = totalInches * 2.54;
  const estimatedBmr = 10 * weightKg + 6.25 * heightCm - 5 * 25 + 5;
  const calories =
    estimatedBmr * ACTIVITY_FACTORS[profile.activity] +
    GOAL_CALORIE_ADJUSTMENTS[profile.goalMode];
  const proteinPerLb =
    profile.goalMode === "cut" ? 1 : profile.goalMode === "bulk" ? 0.9 : 0.8;

  return {
    calories: Math.max(1200, roundToNearest(calories, 25)),
    protein: Math.max(50, roundToNearest(weightLb * proteinPerLb, 5)),
  };
}

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
  const [goals, setGoals] = useState<Goals>(() => loadGoals());
  const [profile, setProfile] = useState<Profile>(() => loadProfile());
  const [foods, setFoods] = useState<Food[]>(() => {
    const saved = loadFoods();
    if (saved) return saved;
    return [DEFAULT_FOOD];
  });

  const [showForm, setShowForm] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formCalories, setFormCalories] = useState("");
  const [formProtein, setFormProtein] = useState("");
  const [formMeal, setFormMeal] = useState<Meal>("breakfast");
  const [isCustom, setIsCustom] = useState(false);
  const [quickQuantities, setQuickQuantities] = useState<Record<string, string>>({
    "Chicken breast": "6",
    Eggs: "3",
    Salmon: "6",
  });

  useEffect(() => {
    saveFoods(foods);
  }, [foods]);

  useEffect(() => {
    saveGoals(goals);
  }, [goals]);

  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  const totalCal = foods.reduce((s, f) => s + f.calories, 0);
  const totalPro = foods.reduce((s, f) => s + f.protein, 0);

  const mealGroups = MEALS.map((meal) => {
    const mealFoods = foods.filter((f) => f.meal === meal);
    return {
      meal,
      foods: mealFoods,
      cal: mealFoods.reduce((s, f) => s + f.calories, 0),
      pro: mealFoods.reduce((s, f) => s + f.protein, 0),
    };
  });

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

  const handleGoalInput = (key: keyof Goals, value: string) => {
    setGoals((prev) => ({ ...prev, [key]: Math.max(0, parseInt(value) || 0) }));
  };

  const handleProfileInput = <K extends keyof Profile>(key: K, value: Profile[K]) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const handleQuickQuantity = (name: string, value: string) => {
    setQuickQuantities((prev) => ({ ...prev, [name]: value }));
  };

  const handleQuickAdd = (qf: QuickFood) => {
    const quantity = Math.max(1, parseFloat(quickQuantities[qf.name] || "1") || 1);
    const amount = quantity === 1 ? qf.amount : `${quantity} x ${qf.amount}`;

    setFoods((prev) => [
      ...prev,
      {
        id: uid(),
        name: qf.name,
        amount,
        calories: Math.round(qf.calories * quantity),
        protein: Math.round(qf.protein * quantity),
        meal: formMeal,
      },
    ]);
  };

  const calculatedGoals = calculateGoals(profile);
  const calPct = goals.calories > 0 ? Math.min((totalCal / goals.calories) * 100, 100) : 0;
  const proPct = goals.protein > 0 ? Math.min((totalPro / goals.protein) * 100, 100) : 0;
  const calOver = totalCal > goals.calories;
  const proOver = totalPro > goals.protein;

  return (
    <div className="app">
      <div className="header">
        <h1>Fuel Tracker</h1>
        <p>
          {goals.calories.toLocaleString()} kcal &middot; {goals.protein}g protein
        </p>
      </div>

      <div className="card">
        <div className="card-title">Today</div>
        <div className="progress-grid">
          <div className="progress-item">
            <label>
              <span>Calories</span>
              <span>
                {totalCal.toLocaleString()} / {goals.calories.toLocaleString()}
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
                {totalPro}g / {goals.protein}g
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
        <button className="settings-toggle" onClick={() => setShowGoals((prev) => !prev)}>
          {showGoals ? "Hide goals" : "Set goals"}
        </button>
      </div>

      {showGoals && (
        <div className="form-card">
          <div className="card-title">Goals</div>
          <div className="form-row">
            <div className="form-group">
              <label>Calories</label>
              <input
                type="number"
                value={goals.calories}
                onChange={(e) => handleGoalInput("calories", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Protein (g)</label>
              <input
                type="number"
                value={goals.protein}
                onChange={(e) => handleGoalInput("protein", e.target.value)}
              />
            </div>
          </div>

          <div className="card-title calculator-title">Calculator</div>
          <div className="form-row three">
            <div className="form-group">
              <label>Feet</label>
              <input
                type="number"
                value={profile.heightFeet}
                onChange={(e) => handleProfileInput("heightFeet", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Inches</label>
              <input
                type="number"
                value={profile.heightInches}
                onChange={(e) => handleProfileInput("heightInches", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Weight (lb)</label>
              <input
                type="number"
                value={profile.weight}
                onChange={(e) => handleProfileInput("weight", e.target.value)}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Activity</label>
              <select
                value={profile.activity}
                onChange={(e) => handleProfileInput("activity", e.target.value as Activity)}
              >
                {(Object.keys(ACTIVITY_LABELS) as Activity[]).map((activity) => (
                  <option key={activity} value={activity}>
                    {ACTIVITY_LABELS[activity]}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Goal</label>
              <select
                value={profile.goalMode}
                onChange={(e) => handleProfileInput("goalMode", e.target.value as GoalMode)}
              >
                {(Object.keys(GOAL_LABELS) as GoalMode[]).map((goalMode) => (
                  <option key={goalMode} value={goalMode}>
                    {GOAL_LABELS[goalMode]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="calculator-preview">
            Suggested: {calculatedGoals.calories.toLocaleString()} kcal &middot;{" "}
            {calculatedGoals.protein}g protein
          </div>
          <button className="btn primary full" onClick={() => setGoals(calculatedGoals)}>
            Use suggested goals
          </button>
        </div>
      )}

      {mealGroups.map(({ meal, foods: mealFoods, cal, pro }) => (
        <div className="card meal-section" key={meal}>
          <div className="meal-header">
            <h3>{MEAL_LABELS[meal]}</h3>
            <span className="meal-totals">
              {cal} kcal &middot; {pro}g protein
            </span>
          </div>

          {mealFoods.length === 0 && <div className="empty-meal">No foods logged</div>}

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
                <button className="delete" onClick={() => handleDelete(food.id)} title="Delete">
                  del
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}

      {showForm ? (
        <div className="form-card">
          <div className="card-title">{editingId ? "Edit food" : "Add food"}</div>

          <div className="form-row">
            <div className="form-group">
              <label>Meal</label>
              <select value={formMeal} onChange={(e) => setFormMeal(e.target.value as Meal)}>
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
              <div className="card-title quick-title">Quick add</div>
              <div className="quick-adds">
                {QUICK_FOODS.map((qf) => (
                  <div className="quick-add" key={qf.name}>
                    <div className="quick-add-info">
                      <span>{qf.name}</span>
                      <small>{qf.amount}</small>
                    </div>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={quickQuantities[qf.name] || "1"}
                      onChange={(e) => handleQuickQuantity(qf.name, e.target.value)}
                      aria-label={`${qf.name} quantity`}
                    />
                    <button onClick={() => handleQuickAdd(qf)}>Add</button>
                  </div>
                ))}
              </div>
              <button className="add-custom-btn" onClick={() => setIsCustom(true)}>
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
