from datetime import datetime, date
from flask_login import UserMixin
from extensions import db, login_manager


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


class User(UserMixin, db.Model):
    __tablename__ = "users"

    user_id        = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username       = db.Column(db.String(50),  unique=True, nullable=False)
    email          = db.Column(db.String(100), unique=True, nullable=False)
    password_hash  = db.Column(db.String(255), nullable=False)
    monthly_income = db.Column(db.Numeric(12, 2), default=0.00)
    created_at     = db.Column(db.DateTime, default=datetime.utcnow)

    transactions = db.relationship("Transaction", backref="user", lazy=True, cascade="all, delete-orphan")
    budgets      = db.relationship("Budget",      backref="user", lazy=True, cascade="all, delete-orphan")
    reminders    = db.relationship("Reminder",    backref="user", lazy=True, cascade="all, delete-orphan")

    # Flask-Login needs this to use user_id as the ID field
    def get_id(self):
        return str(self.user_id)

    def to_dict(self):
        return {
            "user_id":        self.user_id,
            "username":       self.username,
            "email":          self.email,
            "monthly_income": float(self.monthly_income or 0),
            "created_at":     self.created_at.isoformat(),
        }


class Category(db.Model):
    __tablename__ = "categories"

    category_id   = db.Column(db.Integer, primary_key=True, autoincrement=True)
    cat_name      = db.Column(db.String(30), unique=True, nullable=False)

    transactions = db.relationship("Transaction", backref="category", lazy=True)
    budgets      = db.relationship("Budget",      backref="category", lazy=True)

    def to_dict(self):
        return {"category_id": self.category_id, "cat_name": self.cat_name}


class Transaction(db.Model):
    __tablename__ = "transactions"

    trans_id    = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id     = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=False)
    amount      = db.Column(db.Numeric(12, 2), nullable=False)
    type        = db.Column(db.String(10), nullable=False)   # "Income" | "Expense"
    category_id = db.Column(db.Integer, db.ForeignKey("categories.category_id"), nullable=False)
    date        = db.Column(db.Date, nullable=False)
    description = db.Column(db.Text, nullable=True)

    def to_dict(self):
        return {
            "trans_id":    self.trans_id,
            "user_id":     self.user_id,
            "amount":      float(self.amount),
            "type":        self.type,
            "category_id": self.category_id,
            "category":    self.category.cat_name if self.category else "",
            "date":        self.date.isoformat(),
            "description": self.description or "",
        }


class Budget(db.Model):
    __tablename__ = "budgets"

    budget_id    = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id      = db.Column(db.Integer, db.ForeignKey("users.user_id"),      nullable=False)
    category_id  = db.Column(db.Integer, db.ForeignKey("categories.category_id"), nullable=False)
    limit_amount = db.Column(db.Numeric(12, 2), nullable=False)

    __table_args__ = (db.UniqueConstraint("user_id", "category_id", name="uq_user_category_budget"),)

    def to_dict(self):
        return {
            "budget_id":    self.budget_id,
            "user_id":      self.user_id,
            "category_id":  self.category_id,
            "category":     self.category.cat_name if self.category else "",
            "limit_amount": float(self.limit_amount),
        }


class Reminder(db.Model):
    __tablename__ = "reminders"

    reminder_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id     = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=False)
    bill_name   = db.Column(db.String(100), nullable=False)
    due_date    = db.Column(db.Date, nullable=False)
    amount      = db.Column(db.Numeric(12, 2), nullable=False)
    status      = db.Column(db.String(10), default="Pending")  # "Pending" | "Paid"

    def to_dict(self):
        return {
            "reminder_id": self.reminder_id,
            "user_id":     self.user_id,
            "bill_name":   self.bill_name,
            "due_date":    self.due_date.isoformat(),
            "amount":      float(self.amount),
            "status":      self.status,
        }
