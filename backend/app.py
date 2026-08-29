from flask import Flask, jsonify
from config import Config
from extensions import db, bcrypt, login_manager, cors


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Extensions
    db.init_app(app)
    bcrypt.init_app(app)
    login_manager.init_app(app)
    cors.init_app(app, supports_credentials=True,
                  origins=["http://localhost:5173", "http://localhost:3000"])

    login_manager.login_view = "auth.login"

    @login_manager.unauthorized_handler
    def unauthorized():
        return jsonify({"error": "Authentication required."}), 401

    # Blueprints
    from routes.auth         import auth_bp
    from routes.transactions import tx_bp
    from routes.budgets      import budget_bp
    from routes.reminders    import reminder_bp
    from routes.dashboard    import dash_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(tx_bp)
    app.register_blueprint(budget_bp)
    app.register_blueprint(reminder_bp)
    app.register_blueprint(dash_bp)

    # DB init + seed categories
    with app.app_context():
        db.create_all()
        _seed_categories()

    return app


def _seed_categories():
    from models import Category
    default_cats = [
        "Food", "Rent", "Transport", "Healthcare",
        "Entertainment", "Utilities", "Education",
        "Clothing", "Bills", "Salary", "Freelance",
        "Investment", "Other"
    ]
    for name in default_cats:
        if not Category.query.filter_by(cat_name=name).first():
            db.session.add(Category(cat_name=name))
    db.session.commit()


if __name__ == "__main__":
    application = create_app()
    application.run(debug=True, port=5000)
