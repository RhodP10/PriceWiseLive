"""Smart Pricing analysis: linear regression on unit-cost history, heuristics for alerts and demand."""

from __future__ import annotations

import math
import statistics
from datetime import datetime
from typing import Any

try:
    from sklearn.linear_model import LinearRegression

    _HAS_SK = True
except ImportError:  # pragma: no cover
    _HAS_SK = False

from schemas import CatalogItemMLIn, SmartPricingAnalyzeIn


def _parse_iso(s: str) -> datetime | None:
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        return None


def _hist_ts_cost(h: dict[str, Any]) -> tuple[datetime | None, float]:
    ts_s = h.get("recordedAt") or h.get("recorded_at")
    uc_raw = h.get("unitCost", h.get("unit_cost", 0))
    ts = _parse_iso(str(ts_s or ""))
    try:
        uc = float(uc_raw)
    except (TypeError, ValueError):
        uc = 0.0
    return ts, uc


def _forecast_unit_cost(history: list[dict[str, Any]], current: float) -> tuple[float, float, float | None]:
    """Returns (predicted_next_month, confidence_0_1, trend_pct_first_to_last)."""
    points: list[tuple[float, float]] = []
    for h in history:
        ts, uc = _hist_ts_cost(h)
        if ts is not None and uc > 0:
            points.append((ts.timestamp(), uc))
    if not points:
        return current, 0.12, None
    points.sort(key=lambda x: x[0])
    y = [p[1] for p in points]
    t0 = points[0][0]
    first = y[0]
    trend_pct = ((y[-1] - first) / first * 100.0) if first > 1e-9 else None
    if len(points) == 1:
        return y[0], 0.28, trend_pct

    x_days = [(p[0] - t0) / 86400.0 for p in points]
    horizon = 30.0

    if _HAS_SK and len(points) >= 2:
        x_arr = [[xd] for xd in x_days]
        reg = LinearRegression()
        reg.fit(x_arr, y)
        last_day = x_days[-1]
        pred = float(reg.predict([[last_day + horizon]])[0])
        pred = max(pred, 1e-9)
        r2 = max(0.0, min(1.0, float(reg.score(x_arr, y))))
        conf = min(0.92, 0.22 + 0.1 * (len(points) - 1) + 0.38 * r2)
        return pred, conf, trend_pct

    slope = (y[-1] - y[-2]) / (x_days[-1] - x_days[-2] + 1e-9)
    pred = max(y[-1] + slope * horizon, 1e-9)
    conf = min(0.68, 0.18 + 0.12 * len(points))
    return pred, conf, trend_pct


def _volatility(history: list[dict[str, Any]]) -> tuple[str, str]:
    vals: list[float] = []
    for h in history:
        _, uc = _hist_ts_cost(h)
        if uc > 0:
            vals.append(uc)
    if len(vals) < 3:
        return "LOW", "Not enough dated price changes yet — log updates when suppliers change quotes."
    mean = sum(vals) / len(vals)
    if mean <= 1e-9:
        return "LOW", "Stable recorded costs."
    var = sum((v - mean) ** 2 for v in vals) / len(vals)
    std = math.sqrt(var)
    cv = std / mean
    if cv > 0.15:
        return "HIGH", "Unit cost swings are elevated vs average; consider alternates or contracts."
    if cv > 0.08:
        return "MED", "Moderate variability in your logged unit costs."
    return "LOW", "Recorded local costs look stable."


def _demand_levels(sales: dict[str, float]) -> dict[str, str]:
    if not sales:
        return {}
    vals = list(sales.values())
    if not vals:
        return {}
    vals_sorted = sorted(vals)
    n = len(vals_sorted)
    lo = vals_sorted[max(0, n // 3 - 1)]
    hi = vals_sorted[min(n - 1, (2 * n) // 3)]
    out: dict[str, str] = {}
    for k, v in sales.items():
        if v >= hi:
            out[k] = "High"
        elif v <= lo:
            out[k] = "Low"
        else:
            out[k] = "Medium"
    return out


def _serialize_item(it: CatalogItemMLIn) -> dict[str, Any]:
    return {
        "id": it.id,
        "name": it.name,
        "unitCost": it.unit_cost,
        "supplier": it.supplier,
        "unitCostHistory": [h.model_dump(mode="json") for h in it.unit_cost_history],
    }


def analyze_smart_pricing(body: SmartPricingAnalyzeIn) -> dict[str, Any]:
    ingredients_payload = [_serialize_item(x) for x in body.ingredients]
    others_payload = [_serialize_item(x) for x in body.others]

    ingredient_forecasts: list[dict[str, Any]] = []
    for it in body.ingredients:
        hist = [h.model_dump(mode="json") for h in it.unit_cost_history]
        pred, conf, trend = _forecast_unit_cost(hist, it.unit_cost)
        ingredient_forecasts.append(
            {
                "id": it.id,
                "name": it.name,
                "current": round(it.unit_cost, 6),
                "predictedNext": round(pred, 6),
                "confidence": round(conf, 2),
                "trendPct": None if trend is None else round(trend, 2),
            }
        )

    volatility_rows: list[dict[str, Any]] = []
    for it in body.ingredients:
        hist = [h.model_dump(mode="json") for h in it.unit_cost_history]
        risk, note = _volatility(hist)
        volatility_rows.append({"id": it.id, "name": it.name, "risk": risk, "note": note})

    demand = _demand_levels(body.summary_sales)
    demand_rows: list[dict[str, Any]] = []
    for r in body.recipes:
        demand_rows.append(
            {
                "recipeId": r.id,
                "name": r.name,
                "level": demand.get(r.id, "—"),
                "ordersNextMonthHint": body.summary_sales.get(r.id),
            }
        )

    selling: list[dict[str, Any]] = []
    alerts: list[dict[str, Any]] = []
    for r in body.recipes:
        cur = r.current_local
        sug = r.suggested_local
        cogs = r.cogs
        margin_at_cur = ((cur - cogs) / cur * 100.0) if cur > 1e-9 else 0.0
        margin_at_sug = ((sug - cogs) / sug * 100.0) if sug > 1e-9 else 0.0
        comp: list[float] = []
        if r.current_shopee > 1e-6:
            comp.append(r.current_shopee)
        if r.current_lazada > 1e-6:
            comp.append(r.current_lazada)
        comp_avg = statistics.mean(comp) if comp else None

        reasons: list[str] = []
        if body.target_margin_pct > 0:
            reasons.append(f"Target margin setting: {body.target_margin_pct:.0f}% on revenue.")
        if margin_at_cur + 0.5 < body.target_margin_pct:
            reasons.append(
                f"Current local list price implies ~{margin_at_cur:.1f}% margin vs COGS; suggested ~{margin_at_sug:.1f}%."
            )
        if comp_avg is not None:
            reasons.append(f"Competitor list average (channels): ₱{comp_avg:.2f}.")
        if sug > cur + 0.02:
            reasons.append("Suggested price is higher — room to capture margin if demand holds.")
        elif sug < cur - 0.02:
            reasons.append("Suggested price is lower — costs or margin rule imply a more competitive list price.")

        delta_pct = ((sug - cur) / cur * 100.0) if cur > 1e-9 else 0.0
        conf = 0.55
        if comp_avg is not None:
            conf += 0.12
        if abs(sug - cur) < 0.05:
            conf += 0.15
        conf = min(0.94, conf)

        selling.append(
            {
                "recipeId": r.id,
                "name": r.name,
                "channel": "local",
                "current": round(cur, 2),
                "suggested": round(sug, 2),
                "cogs": round(cogs, 4),
                "marginPctCurrent": round(margin_at_cur, 2),
                "marginPctSuggested": round(margin_at_sug, 2),
                "competitorAvg": None if comp_avg is None else round(comp_avg, 2),
                "deltaPctVsCurrent": round(delta_pct, 2),
                "confidence": round(conf, 2),
                "reasons": reasons[:6],
            }
        )

        if cur + 1e-6 < sug * 0.95:
            alerts.append(
                {
                    "type": "margin",
                    "text": f"“{r.name}” local price is below the cost-plus target — you may be leaving margin on the table.",
                }
            )
        if cur > sug * 1.08:
            alerts.append(
                {
                    "type": "competitive",
                    "text": f"“{r.name}” is priced meaningfully above the model suggestion — verify competitor positioning.",
                }
            )

    for f in ingredient_forecasts:
        if f.get("trendPct") is not None and float(f["trendPct"]) > 5:
            alerts.append(
                {
                    "type": "cost",
                    "text": f"Ingredient “{f['name']}” shows a rising cost trend in your logs — watch COGS for recipes that use it.",
                }
            )

    for v in volatility_rows:
        if v["risk"] == "HIGH":
            alerts.append({"type": "volatility", "text": f"High cost volatility: {v['name']} — review supplier stability."})

    supplier_tips: list[dict[str, Any]] = []
    for it in body.ingredients:
        hist = [float(h.unit_cost) for h in it.unit_cost_history if h.unit_cost > 0]
        if len(hist) >= 4:
            mean = sum(hist) / len(hist)
            std = math.sqrt(sum((x - mean) ** 2 for x in hist) / len(hist))
            cv = std / mean if mean > 1e-9 else 0
            if cv > 0.12:
                supplier_tips.append(
                    {
                        "severity": "warn",
                        "text": f"{it.name}: logged local unit costs vary (~{cv * 100:.0f}% CV). Compare marketplace landed totals before locking a supplier.",
                    }
                )

    profit_hint: list[dict[str, Any]] = []
    for r in body.recipes:
        profit_cur = max(0.0, r.current_local - r.cogs)
        profit_sug = max(0.0, r.suggested_local - r.cogs)
        profit_hint.append(
            {
                "recipeId": r.id,
                "name": r.name,
                "profitPerOrderCurrent": round(profit_cur, 2),
                "profitPerOrderSuggested": round(profit_sug, 2),
            }
        )

    model_notes = (
        "Models: linear regression on dated unit-cost history (30-day horizon) when scikit-learn is installed; "
        "otherwise a simple slope extrapolation. Selling prices use your spreadsheet COGS + target margin from the client."
    )
    if not _HAS_SK:
        model_notes += " Install `scikit-learn` for full regression scoring and confidence tuning."

    return {
        "ingredientForecasts": ingredient_forecasts,
        "volatility": volatility_rows,
        "demandSignals": demand_rows,
        "sellingPriceRecommendations": selling,
        "profitPerOrderHint": profit_hint,
        "supplierTips": supplier_tips,
        "alerts": alerts[:12],
        "modelNotes": model_notes,
        "echo": {"ingredientCount": len(body.ingredients), "recipeCount": len(body.recipes)},
    }
