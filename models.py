from flask_login import UserMixin
import database


class User(UserMixin):
    def __init__(self, id, email, tier):
        self.id = id
        self.email = email
        self.tier = tier

    @staticmethod
    def get(user_id):
        row = database.get_user_by_id(user_id)
        if row:
            return User(row['id'], row['email'], row['tier'])
        return None
