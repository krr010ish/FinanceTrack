from datetime import date as date_type
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from extensions import db
from models import Reminder, Transaction, Category

reminder_bp = Blueprint("reminders", __name__, url_prefix="/api/reminders")


def _parse_date(s):
    try:
        return date_type.fromisoformat(s)
    except Exception:
        return None


@reminder_bp.route("/", methods=["GET"])
@login_required
def list_reminders():
    reminders = Reminder.query.filter_by(user_id=current_user.user_id)\
        .order_by(Reminder.due_date).all()
    return jsonify([r.to_dict() for r in reminders]), 200


@reminder_bp.route("/", methods=["POST"])
@login_required
def add_reminder():
    data = request.get_json()
    bill_name = (data.get("bill_name") or "").strip()
    due_date  = _parse_date(data.get("due_date", ""))
    amount    = data.get("amount")

    if not bill_name:
        return jsonify({"error": "Bill name is required."}), 400
    if not due_date:
        return jsonify({"error": "Valid due date required."}), 400
    try:
        amount = float(amount)
        if amount <= 0:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({"error": "Amount must be a positive number."}), 400

    reminder = Reminder(
        user_id   = current_user.user_id,
        bill_name = bill_name,
        due_date  = due_date,
        amount    = amount,
        status    = "Pending",
    )
    db.session.add(reminder)
    db.session.commit()
    return jsonify({"reminder": reminder.to_dict()}), 201


@reminder_bp.route("/<int:rid>/pay", methods=["POST"])
@login_required
def mark_paid(rid):
    """
    FR-06: marking a reminder as Paid auto-creates an expense transaction.
    Category defaults to the 'Bills' category (created if absent).
    """
    reminder = Reminder.query.filter_by(
        reminder_id=rid, user_id=current_user.user_id
    ).first_or_404()

    if reminder.status == "Paid":
        return jsonify({"error": "Already marked as paid."}), 400

    # Resolve or create 'Bills' category
    bills_cat = Category.query.filter_by(cat_name="Bills").first()
    if not bills_cat:
        bills_cat = Category(cat_name="Bills")
        db.session.add(bills_cat)
        db.session.flush()

    tx = Transaction(
        user_id     = current_user.user_id,
        amount      = reminder.amount,
        type        = "Expense",
        category_id = bills_cat.category_id,
        date        = date_type.today(),
        description = f"Auto-logged: {reminder.bill_name}",
    )
    db.session.add(tx)
    reminder.status = "Paid"
    db.session.commit()

    return jsonify({
        "reminder":    reminder.to_dict(),
        "transaction": tx.to_dict(),
        "message":     f"Marked as paid and logged ₹{float(reminder.amount):.2f} expense.",
    }), 200


@reminder_bp.route("/<int:rid>", methods=["DELETE"])
@login_required
def delete_reminder(rid):
    reminder = Reminder.query.filter_by(
        reminder_id=rid, user_id=current_user.user_id
    ).first_or_404()
    db.session.delete(reminder)
    db.session.commit()
    return jsonify({"message": "Reminder deleted."}), 200
