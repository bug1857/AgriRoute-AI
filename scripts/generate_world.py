"""Exact Project 1 generator; geography is generated independently afterwards."""
import argparse
import hashlib
import json
from pathlib import Path
import numpy as np


def generate():
    np.random.seed(42)
    shelf_life = {"tomato": 5, "onion": 25, "mango": 6, "potato": 40}
    regions = ["North", "South", "East", "West"]
    lots = []
    for i in range(30):
        c = str(np.random.choice(list(shelf_life)))
        lots.append({"lot_id": i, "crop": c, "kg": int(np.random.uniform(500, 5000)),
                     "harvest_day": int(np.random.randint(0, 10)),
                     "region": str(np.random.choice(regions)), "shelf_life_days": shelf_life[c]})
    days = np.arange(120)
    prices, gluts = {}, {}
    for m in range(5):
        base = np.random.uniform(15, 40)
        p = base * (1 + 0.1 * np.sin(2 * np.pi * days / 7)) + np.random.normal(0, 1.5, 120)
        start = int(np.random.randint(10, 100))
        p[start:start + 7] *= 0.65
        prices[f"market_{m}"] = p.tolist()
        gluts[f"market_{m}"] = start
    weather = [{"region": r, "day": int(d),
                "temp_c": float(28 + 6 * np.sin(d / 20) + np.random.normal(0, 2)),
                "rain": bool(np.random.rand() < 0.2)} for r in regions for d in days]
    storage = [{"region": r, "capacity_kg": cap, "cost_per_kg_day": cost}
               for r, cap, cost in zip(regions, [8000, 5000, 6000, 4000], [0.30, 0.25, 0.35, 0.28])]
    return {"lots": lots, "prices": prices, "weather": weather, "storage": storage}, gluts


def serialize(world):
    return json.dumps(world, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False) + "\n"


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    world, gluts = generate()
    payload = serialize(world)
    digest = hashlib.sha256(payload.encode()).hexdigest()
    target = root / "data/world.json"
    if args.check:
        assert target.read_text() == payload, "Seeded dataset has changed"
        assert json.loads((root / "data/provenance.json").read_text())["sha256"] == digest
        print(f"PASS: seed 42, 30 lots, 600 prices, 480 weather rows, 4 stores; SHA256 {digest}")
    else:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(payload)
        (root / "data/provenance.json").write_text(json.dumps({
            "source": "supply-chain-ai-3-prototypes.docx · Project 1, Step 1",
            "seed": 42, "numpy_version": np.__version__, "sha256": digest,
            "total_kg": sum(l["kg"] for l in world["lots"]), "glut_start_days": gluts,
            "synthetic": True}, indent=2) + "\n")
        # Independent generator: never advance the original seed-42 stream for map metadata.
        rng = np.random.default_rng(2026)
        anchors = {"North": [27.04, 75.78], "South": [26.72, 75.80],
                   "East": [26.89, 76.05], "West": [26.88, 75.53]}
        points = [{"lot_id": l["lot_id"], "lat": round(anchors[l["region"]][0] + rng.uniform(-.055, .055), 6),
                   "lng": round(anchors[l["region"]][1] + rng.uniform(-.055, .055), 6)} for l in world["lots"]]
        markets = [{"id": f"market_{i}", "name": f"Market {chr(65+i)}", "lat": lat, "lng": lng}
                   for i, (lat, lng) in enumerate([(26.88,75.80),(27.08,75.93),(26.69,75.94),(26.96,76.16),(26.82,75.40)])]
        (root / "data/geography.json").write_text(json.dumps({"synthetic": True,
            "description": "Fictional lots and markets around Jaipur; not actual farms or mandis.",
            "lots": points, "markets": markets}, indent=2) + "\n")
        print(f"Generated exact original world: {digest}")
