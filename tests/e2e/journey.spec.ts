import { expect, test } from "@playwright/test";

// The "done when" journey: sign in, add recipes, see macros, plan, build the list, tick it off,
// then confirm everything is there from a fresh browser context (another device).
// Needs a confirmed test account: E2E_EMAIL and E2E_PASSWORD.
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
test.skip(!email || !password, "E2E_EMAIL and E2E_PASSWORD not set");
test.describe.configure({ mode: "serial" });

const RECIPES = [
  { title: `E2E Chicken rice ${Date.now()}`, ingredients: "400 g chicken breast\n2 cups jasmine rice\n3 cloves garlic, minced\n2 tbsp light soy sauce\n1 tbsp sesame oil", steps: "Poach the chicken for 20 minutes.\n\nCook the rice in the stock." },
  { title: `E2E Sambal kangkong ${Date.now()}`, ingredients: "300 g kangkong\n2 tbsp vegetable oil\n4 shallots\n1 tsp sugar", steps: "Fry the shallots for 2 minutes.\n\nAdd the kangkong and toss for 1 minute." },
  { title: `E2E Overnight oats ${Date.now()}`, ingredients: "50 g rolled oats\n150 ml milk\n1 tbsp chia seeds\n1 banana", steps: "Mix everything and chill overnight." },
];

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/(recipes|onboarding)/);
  if (page.url().includes("/onboarding")) await page.getByRole("button", { name: "Skip for now" }).click();
}

test("add three recipes and see macros, plan them, build and tick the list, then see it all on another device", async ({ page, browser }) => {
  await signIn(page);
  for (const r of RECIPES) {
    await page.goto("/add");
    await page.getByRole("tab", { name: "Paste text" }).click();
    await page.getByLabel("Recipe text").fill(`${r.title}\nServes 2\n\nIngredients\n${r.ingredients}\n\nMethod\n${r.steps}`);
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "Review import" })).toBeVisible();
    await page.getByRole("button", { name: "Save recipe" }).click();
    await page.waitForURL(/\/recipes\/[0-9a-f-]{36}$/);
    await expect(page.getByText("kcal per serving")).toBeVisible();
    await expect(page.getByText(/\d+ of \d+/).first()).toBeVisible();
    await page.getByRole("button", { name: "Plan" }).click();
    await page.getByRole("button", { name: "Add to plan" }).click();
    await expect(page.getByText("Added to your plan.")).toBeVisible();
  }

  await page.goto("/groceries");
  await page.getByRole("button", { name: /Build from plan/ }).click();
  await expect(page.getByText(/Built from the plan/)).toBeVisible();
  await page.reload();
  const first = page.getByRole("checkbox").first();
  await first.check();
  await expect(first).toBeChecked();

  const other = await browser.newContext();
  const page2 = await other.newPage();
  await signIn(page2);
  for (const r of RECIPES) await expect(page2.getByText(r.title)).toBeVisible();
  await page2.goto("/groceries");
  await expect(page2.getByRole("checkbox").first()).toBeChecked();
  await other.close();
});
