#!/usr/bin/env python3
from math import isclose

def solve_profit(cost, profit, pct=0, fixed=0, extra_pct=0, extra_fixed=0):
    denom=1-(pct+extra_pct)/100
    assert denom>0
    return (cost+profit+fixed+extra_fixed)/denom

def margin(price,cost,fees=0):
    return (price-cost-fees)/price*100 if price else 0

# Direct sale: cost 2.91 + desired net profit 10.
assert isclose(solve_profit(2.91,10),12.91,abs_tol=1e-9)

# Shopee current low-price rule used by app before 01/10/2026: 20% + R$4.
p=solve_profit(2.91,10,20,4)
assert isclose(p,21.1375,abs_tol=1e-9)
fees=p*.20+4
assert isclose(p-fees-2.91,10,abs_tol=1e-9)

# Amazon Casa / individual in current app: 12% + R$2 per item.
p=solve_profit(2.91,10,12,2)
assert isclose(p,16.943181818181817,abs_tol=1e-9)

# TikTok Shop under R$50: 10% + R$4.
p=solve_profit(2.91,10,10,4)
assert isclose(p,18.788888888888888,abs_tol=1e-9)

# Composite puzzle example from Bambu Studio: frame + inserts.
weight=42.95+13.88
filament_cost=weight*(65/1000)
assert isclose(weight,56.83,abs_tol=1e-9)
assert isclose(filament_cost,3.69395,abs_tol=1e-9)

# Energy example: two sequential jobs, total 3h49m, A1 planning average 95W,
# CPFL Piratininga B1 current snapshot R$0.73969/kWh.
hours=3+49/60
energy=hours*(95/1000)*0.73969
assert isclose(energy,0.2681992658333333,abs_tol=1e-12)

# Markup and margin are not the same thing.
price=21.1375
markup=(price/2.91-1)*100
m=(price-2.91-(price*.20+4))/price*100
assert markup>600
assert 47<m<48

print("Math verification: OK")
