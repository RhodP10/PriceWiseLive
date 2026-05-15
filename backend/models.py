from datetime import datetime
from typing import Any, Optional

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    recipes = relationship("Recipe", back_populates="user", cascade="all, delete-orphan")
    ingredients = relationship("Ingredient", back_populates="user", cascade="all, delete-orphan")
    other_costs = relationship("OtherCost", back_populates="user", cascade="all, delete-orphan")
    opex_items = relationship("Opex", back_populates="user", cascade="all, delete-orphan")
    monthly_snapshots = relationship(
        "MonthlyFinancialSnapshot", back_populates="user", cascade="all, delete-orphan"
    )
    workspace = relationship(
        "UserWorkspace", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )


class UserWorkspace(Base):
    """Single JSON document per user: recipes, catalogs, OPEX, summary inputs, costing settings."""

    __tablename__ = "user_workspaces"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="workspace")


class MonthlyFinancialSnapshot(Base):
    """Saved month row from Summary → Statistics (per user)."""

    __tablename__ = "monthly_financial_snapshots"
    __table_args__ = (Index("ix_monthly_snapshots_user_year_month", "user_id", "year_month"),)
    # Multiple saves per calendar month are allowed; distinguish rows by id + generated_at.

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    year_month: Mapped[str] = mapped_column(String(7), nullable=False)
    total_opex: Mapped[float] = mapped_column(Float, nullable=False)
    total_revenue: Mapped[float] = mapped_column(Float, nullable=False)
    gross_profit: Mapped[float] = mapped_column(Float, nullable=False)
    net_profit: Mapped[float] = mapped_column(Float, nullable=False)
    profit_margin_pct: Mapped[float] = mapped_column(Float, nullable=False)
    best_supplier: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    recipe_breakdown: Mapped[Optional[list[Any]]] = mapped_column(JSON, nullable=True)

    user = relationship("User", back_populates="monthly_snapshots")


class Recipe(Base):
    __tablename__ = "recipes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="recipes")
    recipe_ingredients = relationship(
        "RecipeIngredient", back_populates="recipe", cascade="all, delete-orphan"
    )
    recipe_other_costs = relationship(
        "RecipeOtherCost", back_populates="recipe", cascade="all, delete-orphan"
    )


class Ingredient(Base):
    __tablename__ = "ingredients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    supplier: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    package_price: Mapped[float] = mapped_column(Float, nullable=False)
    shipping_fee: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    package_size: Mapped[float] = mapped_column(Float, nullable=False)
    package_unit: Mapped[str] = mapped_column(String(16), nullable=False)  # kg, g, L, ml, piece
    base_quantity: Mapped[float] = mapped_column(Float, nullable=False)
    base_unit: Mapped[str] = mapped_column(String(16), nullable=False)  # g, ml, piece
    cost_per_unit: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="ingredients")
    recipe_links = relationship("RecipeIngredient", back_populates="ingredient")


class RecipeIngredient(Base):
    __tablename__ = "recipe_ingredients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    recipe_id: Mapped[int] = mapped_column(ForeignKey("recipes.id"), nullable=False, index=True)
    ingredient_id: Mapped[int] = mapped_column(ForeignKey("ingredients.id"), nullable=False, index=True)
    quantity: Mapped[float] = mapped_column(Float, nullable=False)  # used qty in ingredient base unit

    recipe = relationship("Recipe", back_populates="recipe_ingredients")
    ingredient = relationship("Ingredient", back_populates="recipe_links")


class Opex(Base):
    __tablename__ = "opex"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    type: Mapped[str] = mapped_column(String(16), nullable=False)  # fixed | variable
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="opex_items")


class OtherCost(Base):
    __tablename__ = "other_costs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    supplier: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    package_price: Mapped[float] = mapped_column(Float, nullable=False)
    shipping_fee: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    package_size: Mapped[float] = mapped_column(Float, nullable=False)
    package_unit: Mapped[str] = mapped_column(String(16), nullable=False)
    base_quantity: Mapped[float] = mapped_column(Float, nullable=False)
    base_unit: Mapped[str] = mapped_column(String(16), nullable=False)
    cost_per_unit: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="other_costs")
    recipe_links = relationship("RecipeOtherCost", back_populates="other_cost")


class RecipeOtherCost(Base):
    __tablename__ = "recipe_other_costs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    recipe_id: Mapped[int] = mapped_column(ForeignKey("recipes.id"), nullable=False, index=True)
    other_cost_id: Mapped[int] = mapped_column(ForeignKey("other_costs.id"), nullable=False, index=True)
    quantity: Mapped[float] = mapped_column(Float, nullable=False)  # used qty in base unit

    recipe = relationship("Recipe", back_populates="recipe_other_costs")
    other_cost = relationship("OtherCost", back_populates="recipe_links")

