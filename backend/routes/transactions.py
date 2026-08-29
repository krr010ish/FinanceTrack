from datetime import date as date_type
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from extensions import db
from models import Transaction, Category
from analytics import check_budget_alert

tx_bp = Blueprint("transactions", __name__, url_prefix="/api/transactions")


def _parse_date(s):
    try:
        return date_type.fromisoformat(s)
    except Exception:
        return None


@tx_bp.route("/", methods=["GET"])
@login_required
def list_transactions():
    month = request.args.get("month")   # YYYY-MM
    cat   = request.args.get("category_id", type=int)
    ttype = request.args.get("type")    # Income | Expense

    q = Transaction.query.filter_by(user_id=current_user.user_id)

    if month:
        try:
            y, m = int(month[:4]), int(month[5:7])
            from datetime import date as d_
            first = d_(y, m, 1)
            import calendar
            last_day = calendar.monthrange(y, m)[1]
            last  = d_(y, m, last_day)
            q = q.filter(Transaction.date >= first, Transaction.date <= last)
        except Exception:
            pass

    if cat:
        q = q.filter_by(category_id=cat)
    if ttype in ("Income", "Expense"):
        q = q.filter_by(type=ttype)

    txs = q.order_by(Transaction.date.desc()).all()
    return jsonify([t.to_dict() for t in txs]), 200


@tx_bp.route("/", methods=["POST"])
@login_required
def add_transaction():
    data = request.get_json()

    # ── validation (FR-02) ──
    try:
        amount = float(data.get("amount", 0))
        if amount <= 0:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({"error": "Amount must be a positive number."}), 400

    ttype = data.get("type", "")
    if ttype not in ("Income", "Expense"):
        return jsonify({"error": "Type must be 'Income' or 'Expense'."}), 400

    tx_date = _parse_date(data.get("date", ""))
    if not tx_date:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400
    if tx_date > date_type.today():
        return jsonify({"error": "Future-dated transactions are not allowed."}), 400

    cat_id = data.get("category_id")
    if not cat_id or not Category.query.get(cat_id):
        return jsonify({"error": "Invalid or missing category."}), 400

    tx = Transaction(
        user_id     = current_user.user_id,
        amount      = amount,
        type        = ttype,
        category_id = cat_id,
        date        = tx_date,
        description = data.get("description", "").strip() or None,
    )
    db.session.add(tx)
    db.session.commit()

    # ── FR-05 budget alert ──
    alert_info = None
    if ttype == "Expense":
        alert_info = check_budget_alert(current_user.user_id, cat_id, amount)

    return jsonify({
        "transaction": tx.to_dict(),
        "alert":       alert_info,
    }), 201


@tx_bp.route("/<int:tx_id>", methods=["PUT"])
@login_required
def update_transaction(tx_id):
    tx = Transaction.query.filter_by(
        trans_id=tx_id, user_id=current_user.user_id
    ).first_or_404()

    data = request.get_json()

    if "amount" in data:
        try:
            amt = float(data["amount"])
            if amt <= 0:
                raise ValueError
            tx.amount = amt
        except (TypeError, ValueError):
            return jsonify({"error": "Amount must be a positive number."}), 400

    if "type" in data:
        if data["type"] not in ("Income", "Expense"):
            return jsonify({"error": "Type must be 'Income' or 'Expense'."}), 400
        tx.type = data["type"]

    if "date" in data:
        d = _parse_date(data["date"])
        if not d:
            return jsonify({"error": "Invalid date."}), 400
        if d > date_type.today():
            return jsonify({"error": "Future-dated transactions are not allowed."}), 400
        tx.date = d

    if "category_id" in data:
        if not Category.query.get(data["category_id"]):
            return jsonify({"error": "Invalid category."}), 400
        tx.category_id = data["category_id"]

    if "description" in data:
        tx.description = data["description"].strip() or None

    db.session.commit()
    return jsonify({"transaction": tx.to_dict()}), 200


@tx_bp.route("/<int:tx_id>", methods=["DELETE"])
@login_required
def delete_transaction(tx_id):
    tx = Transaction.query.filter_by(
        trans_id=tx_id, user_id=current_user.user_id
    ).first_or_404()
    db.session.delete(tx)
    db.session.commit()
    return jsonify({"message": "Transaction deleted."}), 200
