#!/usr/bin/env python3
"""
Test script for tax rate calculation
"""

from tax_rates import get_tax_rate_for_address, extract_state_from_address

# Test cases
test_addresses = [
    ("123 Main St, Austin, TX 78701", "TX", 6.25),
    ("456 Oak Ave, Los Angeles, CA 90001", "CA", 7.25),
    ("789 Pine Rd, Miami, FL 33101", "FL", 6.0),
    ("321 Elm St, Portland, OR 97201", "OR", 0.0),
    ("555 Broadway, New York, NY 10012", "NY", 4.0),
    ("999 Lake Shore Dr, Chicago, IL 60601", "IL", 6.25),
    ("1234 Market St, San Francisco, California 94102", "CA", 7.25),
    ("No address provided", None, 8.5),  # Should use default
    ("123 Main St, Some City", None, 8.5),  # No state, use default
]

print("🧪 Testing Tax Rate Calculation\n")
print("=" * 70)

for address, expected_state, expected_rate in test_addresses:
    state = extract_state_from_address(address)
    rate = get_tax_rate_for_address(address)
    
    state_match = "✅" if state == expected_state else "❌"
    rate_match = "✅" if rate == expected_rate else "❌"
    
    print(f"\nAddress: {address}")
    print(f"  State: {state} {state_match} (expected: {expected_state})")
    print(f"  Tax Rate: {rate}% {rate_match} (expected: {expected_rate}%)")

print("\n" + "=" * 70)
print("✨ Test complete!")
