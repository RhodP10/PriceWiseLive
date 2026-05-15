import asyncio
from datetime import datetime
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session, joinedload

from pydantic import BaseModel

from marketplace_browser_scrape import scrape_lazada_sync, scrape_shopee_sync
from auth import create_access_token, hash_password, verify_password
from database import Base, engine
from deps import get_current_user, get_db
from models import (
    Ingredient,
    MonthlyFinancialSnapshot,
    Opex,
    OtherCost,
    Recipe,
    RecipeIngredient,
    RecipeOtherCost,
    User,
    UserWorkspace,
)
from schemas import (
    IngredientCreateIn,
    IngredientOut,
    MonthlySnapshotCreateIn,
    MonthlySnapshotOut,
    OpexCreateIn,
    OpexOut,
    OtherCostCreateIn,
    OtherCostOut,
    RecipeCreateIn,
    RecipeDetailsOut,
    RecipeIngredientCreateIn,
    RecipeIngredientOut,
    RecipeOtherCostCreateIn,
    RecipeOtherCostOut,
    RecipeOut,
    SmartPricingAnalyzeIn,
    TokenOut,
    PasswordChangeIn,
    UserOut,
    UserRegisterIn,
    WorkspaceState,
    convert_to_base,
)
from ml.smart_pricing import analyze_smart_pricing

app = FastAPI(title="PriceWise Backend", version="2.0.0")
Base.metadata.create_all(bind=engine)


def _migrate_monthly_snapshots_allow_duplicates() -> None:
    """Allow multiple Summary saves for the same calendar month (drop legacy unique on user_id+year_month)."""
    with engine.begin() as conn:
        dialect = conn.dialect.name
        if dialect == "postgresql":
            conn.execute(
                text(
                    "ALTER TABLE monthly_financial_snapshots DROP CONSTRAINT IF EXISTS uq_monthly_snap_user_month"
                )
            )
        elif dialect == "sqlite":
            tbl = "monthly_financial_snapshots"
            exists = conn.execute(
                text("SELECT 1 FROM sqlite_master WHERE type='table' AND name=:n"), {"n": tbl}
            ).scalar()
            if not exists:
                pass
            else:
                ddl = conn.execute(
                    text("SELECT sql FROM sqlite_master WHERE type='table' AND name=:n"), {"n": tbl}
                ).scalar_one_or_none()
                if ddl and "UNIQUE" in ddl.upper():
                    mig = f"{tbl}_dedupe_mig"
                    conn.execute(text(f"DROP TABLE IF EXISTS {mig}"))
                    conn.execute(
                        text(
                            f"""
                            CREATE TABLE {mig} (
                              id INTEGER NOT NULL PRIMARY KEY,
                              user_id INTEGER NOT NULL,
                              year_month VARCHAR(7) NOT NULL,
                              total_opex REAL NOT NULL,
                              total_revenue REAL NOT NULL,
                              gross_profit REAL NOT NULL,
                              net_profit REAL NOT NULL,
                              profit_margin_pct REAL NOT NULL,
                              best_supplier VARCHAR(255) NOT NULL,
                              generated_at DATETIME NOT NULL,
                              recipe_breakdown TEXT,
                              FOREIGN KEY(user_id) REFERENCES users (id)
                            )
                            """
                        )
                    )
                    conn.execute(text(f"INSERT INTO {mig} SELECT * FROM {tbl}"))
                    conn.execute(text(f"DROP TABLE {tbl}"))
                    conn.execute(text(f"ALTER TABLE {mig} RENAME TO {tbl}"))
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_monthly_snapshots_user_year_month "
                "ON monthly_financial_snapshots (user_id, year_month)"
            )
        )


_migrate_monthly_snapshots_allow_duplicates()

# Bearer tokens are sent via Authorization header (not cookies), so allow_origins=["*"]
# avoids brittle CORS when Origin is localhost vs 127.0.0.1 vs LAN IP during dev.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _ingredient_out(obj: Ingredient) -> IngredientOut:
    return IngredientOut.model_validate(obj)


def _other_out(obj: OtherCost) -> OtherCostOut:
    return OtherCostOut.model_validate(obj)


@app.get("/")
def root():
    return {"message": "PriceWise recipe costing API is running"}


class MarketplaceScrapeIn(BaseModel):
    url: str
    marketplace: Literal["shopee", "lazada"]


class MarketplaceScrapeOut(BaseModel):
    ok: bool
    body_json: str | None = None
    error: str | None = None


@app.post("/marketplace/scrape", response_model=MarketplaceScrapeOut)
async def marketplace_scrape(body: MarketplaceScrapeIn):
    """Fetch listing JSON via Playwright (Chromium). Requires `playwright install chromium`."""
    try:
        if body.marketplace == "shopee":
            ok, text, err = await asyncio.to_thread(scrape_shopee_sync, body.url)
        else:
            ok, text, err = await asyncio.to_thread(scrape_lazada_sync, body.url)
        if ok and text:
            return MarketplaceScrapeOut(ok=True, body_json=text, error=None)
        return MarketplaceScrapeOut(ok=False, body_json=None, error=err or "Scrape failed")
    except Exception as exc:
        # Always JSON — never plain-text/HTML 500 (frontend expects JSON)
        return MarketplaceScrapeOut(
            ok=False,
            body_json=None,
            error=f"{type(exc).__name__}: {exc}",
        )


@app.post("/auth/register", response_model=UserOut)
def register(payload: UserRegisterIn, db: Session = Depends(get_db)):
    existing = db.scalar(select(User).where(User.email == payload.email.lower().strip()))
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(email=payload.email.lower().strip(), password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.post("/auth/login", response_model=TokenOut)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == form_data.username.lower().strip()))
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(str(user.id))
    return TokenOut(access_token=token)


@app.get("/auth/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@app.patch("/auth/me/password")
def change_password(
    payload: PasswordChangeIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"ok": True}


@app.get("/workspace")
def get_workspace(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    row = db.get(UserWorkspace, current_user.id)
    base = WorkspaceState().model_dump(mode="json", by_alias=True)
    if not row or not row.payload:
        return base
    merged = {**base, **(row.payload if isinstance(row.payload, dict) else {})}
    try:
        state = WorkspaceState.model_validate(merged)
    except Exception:
        state = WorkspaceState()
    return state.model_dump(mode="json", by_alias=True)


@app.put("/workspace")
def put_workspace(
    body: WorkspaceState,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = body.model_dump(mode="json", by_alias=True)
    now = datetime.utcnow()
    row = db.get(UserWorkspace, current_user.id)
    if row:
        row.payload = data
        row.updated_at = now
    else:
        row = UserWorkspace(user_id=current_user.id, payload=data, updated_at=now)
        db.add(row)
    db.commit()
    return data


@app.post("/ml/smart-pricing/analyze")
def post_smart_pricing_analyze(
    body: SmartPricingAnalyzeIn,
    current_user: User = Depends(get_current_user),
):
    """ML-style pricing and cost intelligence from catalog history + recipe rows (client-built payload)."""
    _ = current_user.id
    return analyze_smart_pricing(body)


@app.get("/monthly-summaries", response_model=list[MonthlySnapshotOut])
def list_monthly_summaries(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rows = db.scalars(
        select(MonthlyFinancialSnapshot)
        .where(MonthlyFinancialSnapshot.user_id == current_user.id)
        .order_by(
            MonthlyFinancialSnapshot.year_month.asc(),
            MonthlyFinancialSnapshot.generated_at.asc(),
        )
    ).all()
    return [MonthlySnapshotOut.model_validate(r) for r in rows]


@app.post("/monthly-summaries", response_model=MonthlySnapshotOut)
def create_monthly_summary(
    payload: MonthlySnapshotCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    breakdown_dump = None
    if payload.recipe_breakdown is not None:
        breakdown_dump = [x.model_dump() for x in payload.recipe_breakdown]

    now = datetime.utcnow()
    row = MonthlyFinancialSnapshot(
        user_id=current_user.id,
        year_month=payload.year_month,
        total_opex=payload.total_opex,
        total_revenue=payload.total_revenue,
        gross_profit=payload.gross_profit,
        net_profit=payload.net_profit,
        profit_margin_pct=payload.profit_margin_pct,
        best_supplier=payload.best_supplier.strip(),
        generated_at=now,
        recipe_breakdown=breakdown_dump,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return MonthlySnapshotOut.model_validate(row)


@app.delete("/monthly-summaries/{snapshot_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_monthly_summary(
    snapshot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = db.scalar(
        select(MonthlyFinancialSnapshot).where(
            MonthlyFinancialSnapshot.id == snapshot_id,
            MonthlyFinancialSnapshot.user_id == current_user.id,
        )
    )
    if not row:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    db.delete(row)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.post("/recipes", response_model=RecipeOut)
def create_recipe(
    payload: RecipeCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    recipe = Recipe(
        user_id=current_user.id, name=payload.name.strip(), description=payload.description.strip()
    )
    db.add(recipe)
    db.commit()
    db.refresh(recipe)
    return recipe


@app.get("/recipes", response_model=list[RecipeOut])
def list_recipes(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return list(
        db.scalars(select(Recipe).where(Recipe.user_id == current_user.id).order_by(Recipe.created_at.desc()))
    )


@app.post("/ingredients", response_model=IngredientOut)
def create_ingredient(
    payload: IngredientCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    base_qty, base_unit = convert_to_base(payload.package_size, payload.package_unit)
    if base_qty <= 0:
        raise HTTPException(status_code=400, detail="package_size must be > 0")
    cpu = (payload.package_price + payload.shipping_fee) / base_qty
    row = Ingredient(
        user_id=current_user.id,
        name=payload.name.strip(),
        supplier=payload.supplier.strip(),
        package_price=payload.package_price,
        shipping_fee=payload.shipping_fee,
        package_size=payload.package_size,
        package_unit=payload.package_unit,
        base_quantity=base_qty,
        base_unit=base_unit,
        cost_per_unit=cpu,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _ingredient_out(row)


@app.get("/ingredients", response_model=list[IngredientOut])
def list_ingredients(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rows = db.scalars(select(Ingredient).where(Ingredient.user_id == current_user.id)).all()
    return [_ingredient_out(x) for x in rows]


@app.post("/recipes/{recipe_id}/ingredients", response_model=RecipeIngredientOut)
def add_recipe_ingredient(
    recipe_id: int,
    payload: RecipeIngredientCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    recipe = db.scalar(select(Recipe).where(Recipe.id == recipe_id, Recipe.user_id == current_user.id))
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    ing = db.scalar(
        select(Ingredient).where(Ingredient.id == payload.ingredient_id, Ingredient.user_id == current_user.id)
    )
    if not ing:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    if payload.quantity < 0:
        raise HTTPException(status_code=400, detail="Quantity must be >= 0")
    row = RecipeIngredient(recipe_id=recipe.id, ingredient_id=ing.id, quantity=payload.quantity)
    db.add(row)
    db.commit()
    db.refresh(row)
    return RecipeIngredientOut(
        id=row.id,
        ingredient_id=ing.id,
        ingredient_name=ing.name,
        quantity=row.quantity,
        unit=ing.base_unit,
        cost_per_unit=ing.cost_per_unit,
        line_cost=row.quantity * ing.cost_per_unit,
    )


@app.post("/opex", response_model=OpexOut)
def create_opex(
    payload: OpexCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = Opex(
        user_id=current_user.id, name=payload.name.strip(), amount=payload.amount, type=payload.type
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@app.get("/opex", response_model=list[OpexOut])
def list_opex(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return list(db.scalars(select(Opex).where(Opex.user_id == current_user.id)))


@app.post("/other-costs", response_model=OtherCostOut)
def create_other_cost(
    payload: OtherCostCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    base_qty, base_unit = convert_to_base(payload.package_size, payload.package_unit)
    if base_qty <= 0:
        raise HTTPException(status_code=400, detail="package_size must be > 0")
    cpu = (payload.package_price + payload.shipping_fee) / base_qty
    row = OtherCost(
        user_id=current_user.id,
        name=payload.name.strip(),
        supplier=payload.supplier.strip(),
        package_price=payload.package_price,
        shipping_fee=payload.shipping_fee,
        package_size=payload.package_size,
        package_unit=payload.package_unit,
        base_quantity=base_qty,
        base_unit=base_unit,
        cost_per_unit=cpu,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _other_out(row)


@app.get("/other-costs", response_model=list[OtherCostOut])
def list_other_costs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rows = db.scalars(select(OtherCost).where(OtherCost.user_id == current_user.id)).all()
    return [_other_out(x) for x in rows]


@app.post("/recipes/{recipe_id}/other-costs", response_model=RecipeOtherCostOut)
def add_recipe_other_cost(
    recipe_id: int,
    payload: RecipeOtherCostCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    recipe = db.scalar(select(Recipe).where(Recipe.id == recipe_id, Recipe.user_id == current_user.id))
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    other = db.scalar(
        select(OtherCost).where(OtherCost.id == payload.other_cost_id, OtherCost.user_id == current_user.id)
    )
    if not other:
        raise HTTPException(status_code=404, detail="Other cost not found")
    row = RecipeOtherCost(recipe_id=recipe.id, other_cost_id=other.id, quantity=payload.quantity)
    db.add(row)
    db.commit()
    db.refresh(row)
    return RecipeOtherCostOut(
        id=row.id,
        other_cost_id=other.id,
        other_cost_name=other.name,
        quantity=row.quantity,
        unit=other.base_unit,
        cost_per_unit=other.cost_per_unit,
        line_cost=row.quantity * other.cost_per_unit,
    )


@app.get("/recipes/{recipe_id}", response_model=RecipeDetailsOut)
def get_recipe_details(
    recipe_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    recipe = db.scalar(
        select(Recipe)
        .where(Recipe.id == recipe_id, Recipe.user_id == current_user.id)
        .options(
            joinedload(Recipe.recipe_ingredients).joinedload(RecipeIngredient.ingredient),
            joinedload(Recipe.recipe_other_costs).joinedload(RecipeOtherCost.other_cost),
        )
    )
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    ingredient_items: list[RecipeIngredientOut] = []
    total_ingredient_cost = 0.0
    for link in recipe.recipe_ingredients:
        ing = link.ingredient
        line_cost = link.quantity * ing.cost_per_unit
        total_ingredient_cost += line_cost
        ingredient_items.append(
            RecipeIngredientOut(
                id=link.id,
                ingredient_id=ing.id,
                ingredient_name=ing.name,
                quantity=link.quantity,
                unit=ing.base_unit,
                cost_per_unit=ing.cost_per_unit,
                line_cost=line_cost,
            )
        )

    other_items: list[RecipeOtherCostOut] = []
    total_other_cost = 0.0
    for link in recipe.recipe_other_costs:
        oc = link.other_cost
        line_cost = link.quantity * oc.cost_per_unit
        total_other_cost += line_cost
        other_items.append(
            RecipeOtherCostOut(
                id=link.id,
                other_cost_id=oc.id,
                other_cost_name=oc.name,
                quantity=link.quantity,
                unit=oc.base_unit,
                cost_per_unit=oc.cost_per_unit,
                line_cost=line_cost,
            )
        )

    total_cogs = total_ingredient_cost + total_other_cost
    recipe_count = db.scalar(select(func.count(Recipe.id)).where(Recipe.user_id == current_user.id)) or 1
    total_opex = db.scalar(select(func.coalesce(func.sum(Opex.amount), 0)).where(Opex.user_id == current_user.id)) or 0
    allocated_opex = float(total_opex) / float(recipe_count)
    total_cost_per_recipe = total_cogs + allocated_opex
    margin_percent = 25.0
    suggested_price = total_cost_per_recipe * (1 + margin_percent / 100)

    return RecipeDetailsOut(
        id=recipe.id,
        name=recipe.name,
        description=recipe.description,
        created_at=recipe.created_at,
        ingredients=ingredient_items,
        other_costs=other_items,
        costing={
            "total_ingredient_cost": total_ingredient_cost,
            "total_other_cost": total_other_cost,
            "total_cogs": total_cogs,
            "allocated_opex": allocated_opex,
            "total_cost_per_recipe": total_cost_per_recipe,
            "suggested_price": suggested_price,
            "margin_percent": margin_percent,
        },
    )
