import random


def random_string(length: int = 32) -> str:
    """Generate a random string."""
    return "".join(random.choice("abcdefghijklmnopqrstuvwxyz0123456789") for i in range(length))
