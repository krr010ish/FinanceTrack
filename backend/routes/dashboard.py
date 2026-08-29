from datetime import date
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from models import Category
from analytics import calculate_monthly_status, predict_next_month, spending_breakdown

dash_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")


@dash_bp.route("/summary", methods=["GET"])
@login_required
def summary():
    """FR-03 — net position for the requested month (default: current)."""
    month_str = request.args.get("month")  # YYYY-MM
    ref = date.today()
    if month_str:
        try:
            y, m = int(month_str[:4]), int(month_str[5:7])
            ref = date(y, m, 1)
        except Exception:
            pass

    status    = calculate_monthly_status(current_user.user_id, ref)
    breakdown = spending_breakdown(current_user.user_id, ref)
    income_obj= current_user.monthly_income

    return jsonify({
        "summary":          status,
        "breakdown":        breakdown,
        "monthly_income":   float(income_obj or 0),
    }), 200


@dash_bp.route("/predict", methods=["GET"])
@login_required
def predict():
    """FR-07 — WMA prediction for next month per category."""
    predictions = predict_next_month(current_user.user_id)
    if not predictions:
        return jsonify({
            "message":     "Insufficient data. At least one month of expenses needed.",
            "predictions": [],
        }), 200
    return jsonify({"predictions": predictions}), 200


@dash_bp.route("/categories", methods=["GET"])
def list_categories():
    cats = Category.query.order_by(Category.cat_name).all()
    return jsonify([c.to_dict() for c in cats]), 200
