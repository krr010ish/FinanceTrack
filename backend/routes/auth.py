from flask import Blueprint, request, jsonify, session
from flask_login import login_user, logout_user, login_required, current_user
from extensions import db, bcrypt
from models import User

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    username = (data.get("username") or "").strip()
    email    = (data.get("email")    or "").strip().lower()
    password = data.get("password", "")
    income   = data.get("monthly_income", 0)

    if not username or not email or not password:
        return jsonify({"error": "Username, email and password are required."}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters."}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already taken."}), 409
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered."}), 409

    hashed = bcrypt.generate_password_hash(password).decode("utf-8")
    user = User(username=username, email=email, password_hash=hashed,
                monthly_income=income)
    db.session.add(user)
    db.session.commit()

    login_user(user, remember=False)
    session.permanent = True
    return jsonify({"message": "Account created.", "user": user.to_dict()}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data     = request.get_json()
    username = (data.get("username") or "").strip()
    password = data.get("password", "")

    if not username or not password:
        return jsonify({"error": "Username and password required."}), 400

    user = User.query.filter_by(username=username).first()
    if not user or not bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid username or password."}), 401

    login_user(user, remember=True)
    session.permanent = True
    return jsonify({"message": "Logged in.", "user": user.to_dict()}), 200


@auth_bp.route("/logout", methods=["POST"])
@login_required
def logout():
    logout_user()
    return jsonify({"message": "Logged out."}), 200


@auth_bp.route("/me", methods=["GET"])
@login_required
def me():
    return jsonify({"user": current_user.to_dict()}), 200


@auth_bp.route("/me", methods=["PUT"])
@login_required
def update_profile():
    data   = request.get_json()
    income = data.get("monthly_income")
    email  = (data.get("email") or "").strip().lower()

    if income is not None:
        try:
            current_user.monthly_income = float(income)
        except ValueError:
            return jsonify({"error": "Invalid income value."}), 400

    if email and email != current_user.email:
        if User.query.filter_by(email=email).first():
            return jsonify({"error": "Email already in use."}), 409
        current_user.email = email

    db.session.commit()
    return jsonify({"user": current_user.to_dict()}), 200
