import re
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

PACKAGE_UNITS = {"kg", "g", "L", "ml", "piece"}
BASE_UNITS = {"g", "ml", "piece"}


def convert_to_base(package_size: float, package_unit: str) -> tuple[float, str]:
    if package_unit == "kg":
        return package_size * 1000, "g"
    if package_unit == "g":
        return package_size, "g"
    if package_unit == "L":
        return package_size * 1000, "ml"
    if package_unit == "ml":
        return package_size, "ml"
    if package_unit == "piece":
        return package_size, "piece"
    raise ValueError("Invalid package unit")


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserRegisterIn(BaseModel):
    email: str
    password: str = Field(min_length=6)

    @field_validator("email")
    @classmethod
    def validate_gmail(cls, v: str) -> str:
        if not v.lower().strip().endswith("@gmail.com"):
            raise ValueError("Only Gmail addresses are allowed")
        return v.lower().strip()


class UserOut(BaseModel):
    id: int
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}


class PasswordChangeIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)


class RecipeCreateIn(BaseModel):
    name: str = Field(min_length=1)
    description: str = ""


class RecipeOut(BaseModel):
    id: int
    name: str
    description: str
    created_at: datetime

    model_config = {"from_attributes": True}


class IngredientBaseIn(BaseModel):
    name: str = Field(min_length=1)
    supplier: str = ""
    package_price: float = Field(gt=0)
    shipping_fee: float = Field(ge=0, default=0)
    package_size: float = Field(gt=0)
    package_unit: str

    @field_validator("package_unit")
    @classmethod
    def validate_unit(cls, v: str) -> str:
        if v not in PACKAGE_UNITS:
            raise ValueError(f"package_unit must be one of: {sorted(PACKAGE_UNITS)}")
        return v


class IngredientCreateIn(IngredientBaseIn):
    pass


class IngredientOut(BaseModel):
    id: int
    name: str
    supplier: str
    package_price: float
    shipping_fee: float
    package_size: float
    package_unit: str
    base_quantity: float
    base_unit: str
    cost_per_unit: float
    created_at: datetime

    model_config = {"from_attributes": True}


class RecipeIngredientCreateIn(BaseModel):
    ingredient_id: int
    quantity: float = Field(gt=0)


class RecipeIngredientOut(BaseModel):
    id: int
    ingredient_id: int
    ingredient_name: str
    quantity: float
    unit: str
    cost_per_unit: float
    line_cost: float


class OpexCreateIn(BaseModel):
    name: str = Field(min_length=1)
    amount: float = Field(ge=0)
    type: Literal["fixed", "variable"]


class OpexOut(BaseModel):
    id: int
    name: str
    amount: float
    type: str
    created_at: datetime

    model_config = {"from_attributes": True}


class OtherCostCreateIn(IngredientBaseIn):
    pass


class OtherCostOut(BaseModel):
    id: int
    name: str
    supplier: str
    package_price: float
    shipping_fee: float
    package_size: float
    package_unit: str
    base_quantity: float
    base_unit: str
    cost_per_unit: float
    created_at: datetime

    model_config = {"from_attributes": True}


class RecipeOtherCostCreateIn(BaseModel):
    other_cost_id: int
    quantity: float = Field(gt=0)


class RecipeOtherCostOut(BaseModel):
    id: int
    other_cost_id: int
    other_cost_name: str
    quantity: float
    unit: str
    cost_per_unit: float
    line_cost: float


class RecipeCostSummaryOut(BaseModel):
    total_ingredient_cost: float
    total_other_cost: float
    total_cogs: float
    allocated_opex: float
    total_cost_per_recipe: float
    suggested_price: float
    margin_percent: float


class RecipeDetailsOut(BaseModel):
    id: int
    name: str
    description: str
    created_at: datetime
    ingredients: list[RecipeIngredientOut]
    other_costs: list[RecipeOtherCostOut]
    costing: RecipeCostSummaryOut


_YEAR_MONTH = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")


class RecipeSalesSnapshotEntryIn(BaseModel):
    recipe_id: str = Field(min_length=1)
    recipe_name: str = Field(min_length=1)
    orders: float = Field(ge=0)
    revenue: float
    profit: float


class RecipeSalesSnapshotEntryOut(BaseModel):
    recipe_id: str
    recipe_name: str
    orders: float
    revenue: float
    profit: float


class MonthlySnapshotCreateIn(BaseModel):
    year_month: str = Field(min_length=7, max_length=7)
    total_opex: float = Field(ge=0)
    total_revenue: float = Field(ge=0)
    gross_profit: float
    net_profit: float
    profit_margin_pct: float
    best_supplier: str = ""
    recipe_breakdown: list[RecipeSalesSnapshotEntryIn] | None = None

    @field_validator("year_month")
    @classmethod
    def validate_year_month(cls, v: str) -> str:
        if not _YEAR_MONTH.match(v.strip()):
            raise ValueError("year_month must be YYYY-MM")
        return v.strip()


class MonthlySnapshotOut(BaseModel):
    id: int
    year_month: str
    total_opex: float
    total_revenue: float
    gross_profit: float
    net_profit: float
    profit_margin_pct: float
    best_supplier: str
    generated_at: datetime
    recipe_breakdown: list[RecipeSalesSnapshotEntryOut] | None = None

    model_config = {"from_attributes": True}


class WorkspaceState(BaseModel):
    """Opaque JSON workspace synced from the Svelte client (camelCase keys in JSON)."""

    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    recipes: list[Any] = Field(default_factory=list)
    ingredients: list[Any] = Field(default_factory=list)
    others: list[Any] = Field(default_factory=list)
    opex: list[Any] = Field(default_factory=list)
    summary_sales: dict[str, float] = Field(
        default_factory=dict, serialization_alias="summarySales", validation_alias="summarySales"
    )
    costing_settings: dict[str, Any] = Field(
        default_factory=dict, serialization_alias="costingSettings", validation_alias="costingSettings"
    )


# --- Smart Pricing ML API (client sends precomputed COGS + list prices) ---


class UnitCostHistoryIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    recorded_at: str = Field(validation_alias="recordedAt")
    unit_cost: float = Field(validation_alias="unitCost")


class CatalogItemMLIn(BaseModel):
    """Ingredient or Other master row for ML (matches workspace JSON shape)."""

    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    id: str
    name: str
    unit_cost: float = Field(validation_alias="unitCost")
    supplier: str = ""
    unit_cost_history: list[UnitCostHistoryIn] = Field(default_factory=list, validation_alias="unitCostHistory")


class RecipePricingMLIn(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    id: str
    name: str
    cogs: float
    current_local: float = Field(validation_alias="currentLocal")
    suggested_local: float = Field(validation_alias="suggestedLocal")
    current_shopee: float = Field(default=0, validation_alias="currentShopee")
    current_lazada: float = Field(default=0, validation_alias="currentLazada")


class SmartPricingAnalyzeIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    ingredients: list[CatalogItemMLIn] = Field(default_factory=list)
    others: list[CatalogItemMLIn] = Field(default_factory=list)
    recipes: list[RecipePricingMLIn] = Field(default_factory=list)
    summary_sales: dict[str, float] = Field(default_factory=dict, validation_alias="summarySales")
    target_margin_pct: float = Field(default=70, validation_alias="targetMarginPct")

