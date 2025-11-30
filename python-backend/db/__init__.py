"""
Database repositories for data access layer
"""
from .repositories.base import BaseRepository
from .repositories.quotes import QuoteRepository
from .repositories.customers import CustomerRepository
from .repositories.leads import LeadRepository
from .repositories.catalog import CatalogRepository

__all__ = [
    "BaseRepository",
    "QuoteRepository",
    "CustomerRepository",
    "LeadRepository",
    "CatalogRepository",
]
