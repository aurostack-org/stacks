def repr(*fields: str):
    """Generates __repr__ for a model from specified fields.

    Usage:
        @repr("id", "name", "created")
        class MyModel(Base):
            ...
    """

    def decorator(cls):
        def __repr__(self) -> str:
            cls_name = type(self).__name__
            parts = ", ".join(f"{f}={getattr(self, f)!r}" for f in fields)
            return f"{cls_name}({parts})"

        cls.__repr__ = __repr__
        return cls

    return decorator


def to_dict(*fields: str):
    """Adds a .to_dict() method that serializes specified fields.
    If no fields given, serializes all column attributes.

    @to_dict("id", "name", "email")
    class User(Base):
        ...

    user.to_dict()  # {"id": 1, "name": "Alice", "email": "..."}
    """

    def decorator(cls):
        def _to_dict(self) -> dict:
            if fields:
                return {f: getattr(self, f) for f in fields}
            return {c.key: getattr(self, c.key) for c in self.__table__.columns}

        cls.to_dict = _to_dict
        return cls

    return decorator
