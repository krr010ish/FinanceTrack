"""
analytics.py
Core business logic as described in the synopsis (Section 8).
All functions are pure / side-effect-free; they accept data and return results.
"""

from datetime import date
from dateutil.relativedelta import relativedelta
from sqlalchemy import func
from models import Transaction, Budget
from extensions import db


# ── helpers ──────────────────────────────────────────────────────────────────

def _month_bounds(ref: date):
    """Return (first_day, last_day) for the month containing ref."""
    first = ref.replace(day=1)
    last  = (first + relativedelta(months=1)) - relativedelta(days=1)
    return first, last


def _category_total(user_id: int, category_id: int, ref: date) -> float:
    """Sum of expenses for a user/category in the month of ref."""
    first, last = _month_bounds(ref)
    result = db.session.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id     == user_id,
        Transaction.category_id == category_id,
        Transaction.type        == "Expense",
        Transaction.date        >= first,
        Transaction.date        <= last,
    ).scalar()
    return float(result or 0)


# ── FR-03 : surplus / loss ────────────────────────────────────────────────────

def calculate_monthly_status(user_id: int, ref: date = None):
    """
    Net Position = SUM(Income) - SUM(Expense) for the given month.
    Returns dict with total_income, total_expense, net_position, status.
    """
    if ref is None:
        ref = date.today()

    first, last = _month_bounds(ref)

    rows = Transaction.query.filter(
        Transaction.user_id == user_id,
        Transaction.date    >= first,
        Transaction.date    <= last,
    ).all()

    total_income  = sum(float(t.amount) for t in rows if t.type == "Income")
    total_expense = sum(float(t.amount) for t in rows if t.type == "Expense")
    net           = total_income - total_expense

    return {
        "total_income":  total_income,
        "total_expense": total_expense,
        "net_position":  net,
        "status":        "Surplus" if net >= 0 else "Loss",
        "month":         ref.strftime("%B %Y"),
    }


# ── FR-07 : WMA prediction ────────────────────────────────────────────────────

def predict_next_month(user_id: int):
    """
    Weighted Moving Average per category.
    Weights: M1 (last month) × 3, M2 × 2, M3 × 1  →  divisor = 6.
    Returns list of {category_id, category, predicted_amount}.
    """
    today = date.today()
    m1_ref = today - relativedelta(months=1)
    m2_ref = today - relativedelta(months=2)
    m3_ref = today - relativedelta(months=3)

    # Collect all categories this user has ever spent in
    rows = db.session.query(Transaction.category_id).filter(
        Transaction.user_id == user_id,
        Transaction.type    == "Expense",
    ).distinct().all()

    predictions = []
    for (cat_id,) in rows:
        m1 = _category_total(user_id, cat_id, m1_ref)
        m2 = _category_total(user_id, cat_id, m2_ref)
        m3 = _category_total(user_id, cat_id, m3_ref)

        if m1 == 0 and m2 == 0 and m3 == 0:
            continue  # no history for this category

        weighted_sum = (m1 * 3) + (m2 * 2) + (m3 * 1)
        prediction   = weighted_sum / 6

        # resolve category name
        from models import Category
        cat = Category.query.get(cat_id)
        predictions.append({
            "category_id":      cat_id,
            "category":         cat.cat_name if cat else str(cat_id),
            "predicted_amount": round(prediction, 2),
        })

    return predictions


# ── FR-05 : budget alert ──────────────────────────────────────────────────────

def check_budget_alert(user_id: int, category_id: int, new_expense: float):
    """
    Run after every expense entry.
    Returns alert level: None | 'warning' (≥80%) | 'critical' (≥100%).
    """
    budget = Budget.query.filter_by(
        user_id=user_id, category_id=category_id
    ).first()

    if not budget:
        return {"alert": None, "current_total": None, "limit": None}

    limit         = float(budget.limit_amount)
    current_total = _category_total(user_id, category_id, date.today())
    new_total     = current_total + new_expense

    if new_total >= limit:
        level = "critical"
        msg   = f"Budget exceeded! You have spent ₹{new_total:.0f} of your ₹{limit:.0f} limit."
    elif new_total >= limit * 0.80:
        level = "warning"
        msg   = f"You have used {new_total/limit*100:.0f}% of your budget for this category."
    else:
        level = None
        msg   = None

    return {
        "alert":         level,
        "message":       msg,
        "new_total":     new_total,
        "limit":         limit,
        "percent_used":  round(new_total / limit * 100, 1) if limit else 0,
    }


# ── Spending breakdown (for charts) ──────────────────────────────────────────

def spending_breakdown(user_id: int, ref: date = None):
    """Category-wise expense totals for the current month (for pie/bar charts)."""
    if ref is None:
        ref = date.today()
    first, last = _month_bounds(ref)

    rows = db.session.query(
        Transaction.category_id,
        func.sum(Transaction.amount).label("total")
    ).filter(
        Transaction.user_id == user_id,
        Transaction.type    == "Expense",
        Transaction.date    >= first,
        Transaction.date    <= last,
    ).group_by(Transaction.category_id).all()

    from models import Category
    result = []
    for cat_id, total in rows:
        cat = Category.query.get(cat_id)
        result.append({
            "category_id": cat_id,
            "category":    cat.cat_name if cat else str(cat_id),
            "total":       float(total),
        })
    return result
