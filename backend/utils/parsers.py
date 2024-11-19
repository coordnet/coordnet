def is_truthy(value: bool | str) -> bool:
    """
    Checks if value should be interpreted as `True`.
    The truthy values we copied from the Django's forms.fields.BooleanField.
    """
    if value in (
        True,
        "True",
        "true",
        "1",
    ):
        return True
    return False
