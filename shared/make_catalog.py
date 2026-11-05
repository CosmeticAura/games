#!/usr/bin/env python3
"""Writes catalog.json: the site-wide interface items. Prices come from ECONOMY.md section 4."""
import json, os

def items(cat, rows):
    return [{"id": f"{cat}_{v}", "name": n, "price": p, "tier": t} for v, n, p, t in rows]

AUTO = ("auto", "Theme's own", 0, "Free")
cat = {
    "theme": items("theme", [
        ("ink", "Ink night", 0, "Free"), ("cockpit", "Cockpit dusk", 12000, "Rare"), ("print", "Two-ink print", 12000, "Rare"),
        ("snow", "Snow peak", 18000, "Rare"), ("desert", "Desert noon", 18000, "Rare"), ("harbor", "Harbor fog", 18000, "Rare"),
        ("storm", "Storm", 40000, "Epic"), ("temple", "Autumn temple", 45000, "Epic"), ("deepsea", "Deep sea", 45000, "Epic"),
        ("lantern", "Lantern festival", 60000, "Epic"), ("golden", "Golden hour", 400000, "Mythic")]),
    "weather": items("weather", [AUTO, ("rain", "Rain", 0, "Free"), ("snow", "Snow", 2500, "Common"), ("fireflies", "Fireflies", 4000, "Common"),
                                  ("ash", "Ash", 6000, "Common"), ("none", "Clear air", 2500, "Common")]),
    "sky": items("sky", [AUTO, ("moon", "Moon", 0, "Free"), ("sun", "Sun", 2500, "Common"), ("none", "Nothing", 2500, "Common")]),
    "glow": items("glow", [AUTO, ("red", "Red", 0, "Free"), ("amber", "Amber", 2000, "Common"), ("jade", "Jade", 2000, "Common"),
                           ("blue", "Cool blue", 2000, "Common"), ("white", "White", 2000, "Common")]),
    "altimeter": items("altimeter", [AUTO, ("ruler", "Ruler", 0, "Free"), ("dial", "Round dial", 5000, "Common"), ("tape", "Tape", 5000, "Common")]),
    "numstyle": items("numstyle", [AUTO, ("brush", "Brush serif", 0, "Free"), ("mono", "Mono", 3000, "Common"), ("block", "Block", 3000, "Common")]),
    "trim": items("trim", [AUTO, ("gold", "Gold", 0, "Free"), ("jade", "Jade", 2500, "Common"), ("silver", "Silver", 2500, "Common"),
                           ("lacquer", "Red lacquer", 2500, "Common"), ("iron", "Black iron", 2500, "Common")]),
    "sound": items("sound", [("classic", "Classic", 0, "Free"), ("quiet", "Quiet", 10000, "Rare"), ("arcade", "Arcade", 10000, "Rare")]),
    "stamp": items("stamp", [AUTO, ("seal", "Safe seal", 0, "Free"), ("wax", "Wax seal", 3000, "Common"), ("star", "Star", 3000, "Common")]),
}
labels = {"theme": "Themes", "weather": "Weather", "sky": "Sky", "glow": "Ground glow", "altimeter": "Altimeter",
          "numstyle": "Numbers", "trim": "Panel trim", "sound": "Sounds", "stamp": "Stamps"}
out = {"v": 1, "labels": labels, "categories": cat}
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "catalog.json"), "w") as f:
    json.dump(out, f, indent=1)
print("catalog.json", sum(len(v) for v in cat.values()), "items")
