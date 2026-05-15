# PriceWise Backend - FastAPI + SQLAlchemy

Recipe costing API with user authentication, per-user data isolation, and PostgreSQL (with SQLite fallback).

## Prerequisites

- Python 3.8+
- PostgreSQL (recommended) or SQLite fallback
- Uvicorn

## Setup Instructions

### 1. Create PostgreSQL Database

Create database:

```sql
CREATE DATABASE pricewise;
```

### 2. Install Dependencies

```bash
cd pricewise\backend
pip install -r requirements.txt
```

Or use the provided batch file on Windows:
```bash
run.bat
```

This will automatically create a virtual environment and install dependencies.

### 3. Configure Environment

Edit `.env`:

```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/pricewise
JWT_SECRET=change-this-dev-secret
JWT_EXPIRE_MINUTES=10080
```

If `DATABASE_URL` is missing, SQLite is used at **`backend/pricewise.db`** (always next to `database.py`, not relative to your shell). That avoids “data resetting” when `uvicorn` is started from different folders.

Optional: set `SQLITE_URL` to an **absolute** path if you want another file, e.g. `sqlite:///C:/data/pricewise.db`. Avoid `sqlite:///./pricewise.db` — `./` follows the process working directory, so each cwd can point at a different (empty) file.

If you previously ran the API from another folder and have an old `pricewise.db` there with your data, copy that file into `backend/pricewise.db` (replacing or merging as needed) so this stable path picks it up.

### 4. Run the Backend

**Option A: Automatic (Windows)**
```bash
run.bat
```

**Option B: Manual**
```bash
python -m uvicorn main:app --reload --port 8000
```

The API will start at: `http://localhost:8000`

## API Documentation

Once running, visit these URLs:

- **Interactive Docs**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc

## API Endpoints

### Auth
- `POST /auth/register`
- `POST /auth/login` (OAuth2PasswordRequestForm)
- `GET /auth/me`

### Recipes
- `POST /recipes`
- `GET /recipes`
- `GET /recipes/{id}` (full details + costing)
- `POST /recipes/{id}/ingredients`
- `POST /recipes/{id}/other-costs`

### Ingredients
- `POST /ingredients`
- `GET /ingredients`

### OPEX
- `POST /opex`
- `GET /opex`

### Other Costs
- `POST /other-costs`
- `GET /other-costs`

## Database Schema (high level)

- `users`
- `recipes`
- `ingredients`
- `recipe_ingredients`
- `opex`
- `other_costs`
- `recipe_other_costs`

All business data tables are user-owned via `user_id`.

## Costing Logic

Recipe details include:
- total ingredient cost (`sum(quantity * cost_per_unit)`)
- total other/packaging cost
- total COGS
- OPEX allocation (equal split across user recipes)
- total recipe cost
- suggested price (default 25% margin)

## Troubleshooting

### Database Connection Error
- Ensure PostgreSQL is running
- Check `DATABASE_URL` in `.env`
- Remove it to use SQLite fallback quickly

### Port Already in Use
```bash
# Change port in command:
python -m uvicorn main:app --reload --port 8001
```

### Virtual Environment Issues
```bash
# Delete venv and let run.bat recreate it
rmdir /s venv
run.bat
```

## File Structure

```
backend/
├── main.py          # FastAPI app and endpoints
├── models.py        # SQLAlchemy ORM models
├── schemas.py       # Pydantic schemas
├── database.py      # SQLAlchemy setup
├── auth.py          # JWT and password helpers
├── deps.py          # DB and auth dependencies
├── requirements.txt # Dependencies
├── .env             # Database config
├── run.bat          # Windows startup script
└── README.md        # This file
```

## Notes

- CORS is enabled for localhost:5173 and localhost:3000
- Tables are created automatically on first run
- Users only see their own data via token-auth ownership checks

## Next Steps

1. Create the MySQL database
2. Run `run.bat` or install dependencies manually
3. Start the backend server
4. Start your Svelte frontend with `npm run dev`
5. Open http://localhost:5173 and test the "Add Product" feature
