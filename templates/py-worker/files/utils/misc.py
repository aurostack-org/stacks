import os
import pathlib
from urllib.parse import urlparse, quote, urlencode
from datetime import datetime, timedelta
from typing import Callable


# A function that takes a page number and returns
# whether the loop should continue.
LoopFunction = Callable[[int], bool]


def loop(fn: LoopFunction) -> None:
    """
    Repeatedly calls `fn(page)` with an increasing page number starting at 1
    until `fn` returns False.

    Args:
        fn: A callable that accepts the current page (int) and returns:
            - True to continue to the next page
            - False to stop looping
    """
    page = 1
    while page > 0:
        can_proceed = fn(page)
        if not can_proceed:
            page = 0
        else:
            page += 1


def get_offset(page: int, limit: int = 10) -> int:
    """
    Calculate the offset for pagination.

    Page is treated as 1-indexed (page=1 => offset=0).

    Args:
        page: Current page number (1-indexed).
        limit: Number of items per page. Defaults to 10.

    Returns:
        The offset (number of items to skip).
    """
    return (page - 1) * limit
