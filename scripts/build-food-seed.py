"""Convert the USDA SR28 ASCII release into two compact tab-separated files for seeding.

Usage: python3 -I scripts/build-food-seed.py <path-to-SR28-folder> supabase/seed

SR28 (the data later republished as FoodData Central "SR Legacy") is public
domain. Only the nutrients Mise shows are kept, which keeps the seed small.
"""

import csv
import sys
from pathlib import Path

NUTRIENTS = {
    "208": "kcal",
    "203": "protein_g",
    "205": "carbs_g",
    "204": "fat_g",
    "291": "fibre_g",
    "269": "sugar_g",
    "606": "sat_fat_g",
    "307": "sodium_mg",
}


def rows(path: Path):
    with path.open(encoding="latin-1") as fh:
        for line in fh:
            line = line.rstrip("\r\n")
            if not line:
                continue
            yield [f.strip("~") for f in line.split("^")]


def main() -> None:
    src, out = Path(sys.argv[1]), Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)

    groups = {r[0]: r[1] for r in rows(src / "FD_GROUP.txt")}
    foods = {}
    for r in rows(src / "FOOD_DES.txt"):
        foods[r[0]] = {"id": int(r[0]), "name": r[2], "food_group": groups.get(r[1], "")}

    nutrients: dict[str, dict[str, str]] = {}
    for r in rows(src / "NUT_DATA.txt"):
        col = NUTRIENTS.get(r[1])
        if col:
            nutrients.setdefault(r[0], {})[col] = r[2]

    cols = ["id", "name", "food_group", *NUTRIENTS.values()]
    with (out / "foods.tsv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh, delimiter="\t", quoting=csv.QUOTE_NONE, quotechar=None, escapechar="\\", lineterminator="\n")
        w.writerow(cols)
        for ndb, food in sorted(foods.items()):
            n = nutrients.get(ndb, {})
            w.writerow([food["id"], food["name"], food["food_group"], *(n.get(c, "") for c in NUTRIENTS.values())])

    with (out / "food_portions.tsv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh, delimiter="\t", quoting=csv.QUOTE_NONE, quotechar=None, escapechar="\\", lineterminator="\n")
        w.writerow(["food_id", "amount", "unit", "grams"])
        for r in rows(src / "WEIGHT.txt"):
            if r[0] in foods and r[4]:
                w.writerow([int(r[0]), r[2], r[3], r[4]])


if __name__ == "__main__":
    main()
