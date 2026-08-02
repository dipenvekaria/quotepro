"""Unit tests for pure business logic in tools."""

from __future__ import annotations

import json

from quotepro.tools.discount import recalculate_discounts
from quotepro.tools.tax import extract_state, get_tax_rate


class TestTaxRates:
    def test_extract_state_from_zip_address(self) -> None:
        assert extract_state("123 Market St, San Francisco, CA 94103") == "CA"

    def test_extract_state_from_full_name(self) -> None:
        assert extract_state("456 Elm, Portland, Oregon 97205") == "OR"

    def test_extract_state_returns_none_when_no_state(self) -> None:
        assert extract_state("An address with no state") is None

    def test_get_tax_rate_falls_back_to_default(self) -> None:
        assert get_tax_rate("Nowhere in particular", default_rate=7.5) == 7.5

    def test_get_tax_rate_zero_for_no_tax_states(self) -> None:
        assert get_tax_rate("100 Salmon St, Portland, OR 97205") == 0.0


class TestDiscount:
    def test_percentage_discount_recalculated_on_subtotal(self) -> None:
        items = [
            {"name": "AC Unit", "quantity": 1, "unit_price": 1000, "total": 1000, "is_discount": False},
            {"name": "Labor", "quantity": 4, "unit_price": 125, "total": 500, "is_discount": False},
            {
                "name": "10% off",
                "quantity": 1,
                "unit_price": -100,
                "total": -100,
                "is_discount": True,
                "discount_target": "total",
            },
        ]
        result = recalculate_discounts(items)
        assert result["regular_subtotal"] == 1500.0
        # 10% of 1500 = 150 (updated from -100)
        assert result["discount_total"] == -150.0
        assert result["subtotal"] == 1350.0

    def test_fixed_discount_stays_fixed(self) -> None:
        items = [
            {"name": "Service", "quantity": 1, "unit_price": 500, "total": 500, "is_discount": False},
            {
                "name": "Loyalty credit",
                "quantity": 1,
                "unit_price": -50,
                "total": -50,
                "is_discount": True,
            },
        ]
        result = recalculate_discounts(items)
        assert result["discount_total"] == -50.0
        assert result["subtotal"] == 450.0
