from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from extensions import db
from models import Budget, Category

budget_bp = Blueprint("budgets", __name__, url_prefix="/api/budgets")


@budget_bp.route("/", methods=["GET"])
@login_required
def list_budgets():
    budgets = Budget.query.filter_by(user_id=current_user.user_id).all()
    return jsonify([b.to_dict() for b in budgets]), 200


@budget_bp.route("/", methods=["POST"])
@login_required
def set_budget():
    data   = request.get_json()
    cat_id = data.get("category_id")
    limit  = data.get("limit_amount")

    if not cat_id or not Category.query.get(cat_id):
        return jsonify({"error": "Invalid category."}), 400
    try:
        limit = float(limit)
        if limit <= 0:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({"error": "Limit must be a positive number."}), 400

    # Upsert — one budget per user/category
    existing = Budget.query.filter_by(
        user_id=current_user.user_id, category_id=cat_id
    ).first()

    if existing:
        existing.limit_amount = limit
        db.session.commit()
        return jsonify({"budget": existing.to_dict()}), 200

    budget = Budget(user_id=current_user.user_id, category_id=cat_id, limit_amount=limit)
    db.session.add(budget)
    db.session.commit()
    return jsonify({"budget": budget.to_dict()}), 201


@budget_bp.route("/<int:budget_id>", methods=["DELETE"])
@login_required
def delete_budget(budget_id):
    budget = Budget.query.filter_by(
        budget_id=budget_id, user_id=current_user.user_id
    ).first_or_404()
    db.session.delete(budget)
    db.session.commit()
    return jsonify({"message": "Budget removed."}), 200
