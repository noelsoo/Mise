// Generated from the linked Supabase project (supabase gen types typescript --linked),
// trimmed of the unused helper generics. Regenerate after every migration.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Rel = { foreignKeyName: string; columns: string[]; isOneToOne: boolean; referencedRelation: string; referencedColumns: string[] }[];
type T<Row, Insert> = { Row: Row; Insert: Insert; Update: Partial<Insert>; Relationships: Rel };

type Nutrients = {
  kcal: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null;
  fibre_g: number | null; sugar_g: number | null; sat_fat_g: number | null; sodium_mg: number | null;
};

export type RecipeRow = Nutrients & {
  id: string; user_id: string; title: string; description: string | null; servings: number;
  prep_minutes: number | null; cook_minutes: number | null; cuisine: string | null; course: string | null;
  tags: string[]; notes: string | null; source_url: string | null; rating: number | null; favourite: boolean;
  photos: string[]; counted_count: number; ingredient_count: number; share_slug: string | null;
  last_opened_at: string | null; created_at: string; updated_at: string;
};
export type IngredientRow = {
  id: string; recipe_id: string; user_id: string; position: number; group_name: string | null; raw: string;
  quantity: number | null; quantity2: number | null; unit: string | null; name: string; note: string | null;
  food_id: number | null; custom_food_id: string | null; grams: number | null; match_source: string | null; counted: boolean;
};
export type StepRow = { id: string; recipe_id: string; user_id: string; position: number; group_name: string | null; text: string };
export type ProfileRow = {
  id: string; display_name: string | null; units: string; week_start: number; kcal_target: number | null;
  protein_target: number | null; carbs_target: number | null; fat_target: number | null; onboarded: boolean;
  created_at: string; updated_at: string;
};
export type FoodRow = Nutrients & { id: number; name: string; food_group: string };
export type CustomFoodRow = {
  id: string; user_id: string; name: string; brand: string | null; serving_g: number | null; kcal: number;
  protein_g: number; carbs_g: number; fat_g: number; fibre_g: number | null; sugar_g: number | null;
  sat_fat_g: number | null; sodium_mg: number | null; created_at: string;
};
export type CookbookRow = { id: string; user_id: string; name: string; description: string | null; created_at: string };
export type CookbookRecipeRow = { cookbook_id: string; recipe_id: string; user_id: string; position: number };
export type MealPlanRow = {
  id: string; user_id: string; date: string; slot: string; recipe_id: string | null; servings: number | null;
  note: string | null; position: number; created_at: string;
};
export type GroceryRow = {
  id: string; user_id: string; name: string; quantity_text: string | null; aisle: string; merge_key: string | null;
  is_manual: boolean; is_staple: boolean; checked: boolean; sources: string[]; position: number; created_at: string;
};
export type FoodPortionRow = { id: number; food_id: number; amount: number; unit: string; grams: number };
export type FoodMatchRow = { user_id: string; ingredient_key: string; food_id: number | null; custom_food_id: string | null; created_at: string };

type Ins<R, Required extends keyof R> = Pick<R, Required> & Partial<Omit<R, Required>>;

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.18" };
  public: {
    Tables: {
      recipes: T<RecipeRow, Ins<RecipeRow, "title">>;
      ingredients: T<IngredientRow, Ins<IngredientRow, "raw" | "recipe_id">>;
      steps: T<StepRow, Ins<StepRow, "text" | "recipe_id">>;
      profiles: T<ProfileRow, Ins<ProfileRow, "id">>;
      foods: T<FoodRow, Ins<FoodRow, "id" | "name">>;
      food_portions: T<FoodPortionRow, Ins<FoodPortionRow, "food_id" | "amount" | "unit" | "grams">>;
      food_aliases: T<{ alias: string; food_id: number }, { alias: string; food_id: number }>;
      food_matches: T<FoodMatchRow, Ins<FoodMatchRow, "ingredient_key">>;
      custom_foods: T<CustomFoodRow, Ins<CustomFoodRow, "name" | "kcal">>;
      cookbooks: T<CookbookRow, Ins<CookbookRow, "name">>;
      cookbook_recipes: T<CookbookRecipeRow, Ins<CookbookRecipeRow, "cookbook_id" | "recipe_id">>;
      meal_plan_entries: T<MealPlanRow, Ins<MealPlanRow, "date" | "slot">>;
      grocery_items: T<GroceryRow, Ins<GroceryRow, "name">>;
    };
    Views: { [_ in never]: never };
    Functions: {
      delete_my_account: { Args: never; Returns: undefined };
      get_shared_recipe: { Args: { slug: string }; Returns: Json };
      health: { Args: never; Returns: string };
      search_foods: {
        Args: { q: string; max_results?: number };
        Returns: { id: number; name: string; food_group: string; kcal: number; score: number }[];
      };
      search_recipes: {
        Args: { q: string };
        Returns: RecipeRow[];
        SetofOptions: { from: "*"; to: "recipes"; isOneToOne: false; isSetofReturn: true };
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
