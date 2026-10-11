#!/usr/bin/env python3
from math import isclose, isfinite
import random

EPS=1e-7

def shopee_fee(price):
    # Regra configurada no app para vigência a partir de 01/10/2026.
    if price < 8:
        return price*.20 + price*.50
    if price < 80:
        return price*.20 + 4.50
    if price < 100:
        return price*.14 + 16
    if price < 200:
        return price*.14 + 20
    return price*.14 + 26

def ml_fee(price,premium=False):
    pct=.19 if premium else .14
    if price < 12.5:
        fixed=price*.50
    elif price < 29:
        fixed=6.25
    elif price < 50:
        fixed=6.50
    elif price < 79:
        fixed=6.75
    else:
        fixed=0
    return price*pct+fixed

def amazon_fee(price):
    return price*.12+2

def tiktok_fee(price):
    return price*.10+4 if price < 50 else price*.06+6

def profit_at(price,cost,fee_fn=lambda p:0,tax_pct=0,loss_pct=0,cac=0):
    return price-cost-fee_fn(price)-price*tax_pct/100-price*loss_pct/100-cac

def solve_segmented(cost,target,fee_fn=lambda p:0,tax_pct=0,loss_pct=0,cac=0,breakpoints=(0,)):
    eps=1e-7
    max_price=10_000_000
    candidates=[]
    def good(p):
        return profit_at(p,cost,fee_fn,tax_pct,loss_pct,cac) >= target-1e-9
    points=list(breakpoints)
    for idx,a in enumerate(points):
        b=points[idx+1] if idx+1<len(points) else None
        if good(a):
            candidates.append(a)
            continue
        if b is not None:
            right=max(a,b-eps)
            if not good(right):
                continue
            lo,hi=a,right
        else:
            lo=a
            hi=max(a+1,cost+target+cac+20)
            for _ in range(100):
                if good(hi):
                    break
                hi*=1.7
                assert isfinite(hi) and hi<max_price
            else:
                continue
            if not good(hi):
                continue
        for _ in range(120):
            mid=(lo+hi)/2
            if good(mid):
                hi=mid
            else:
                lo=mid
        candidates.append(hi)
    assert candidates, "no viable price"
    return min(candidates)

def unit_production(weight_g,hours,outputs,filament_per_g,watts,kwh,maintenance_h,failure_pct=0):
    assert outputs>0
    mult=1+failure_pct/100
    filament=weight_g*filament_per_g*mult/outputs
    energy=hours*watts/1000*kwh/outputs
    maintenance=hours*maintenance_h/outputs
    return filament+energy+maintenance

# 1) Custo de produção conhecido.
cost=unit_production(
    weight_g=56.83,
    hours=3+49/60,
    outputs=1,
    filament_per_g=65/1000,
    watts=95,
    kwh=.73969,
    maintenance_h=.30,
)
expected_filament=56.83*(65/1000)
expected_energy=(3+49/60)*.095*.73969
expected_maintenance=(3+49/60)*.30
assert isclose(cost,expected_filament+expected_energy+expected_maintenance,abs_tol=1e-12)

# 2) Divisão correta quando uma mesa gera várias unidades.
one=unit_production(100,2,1,.065,95,.73969,.30)
four=unit_production(100,2,4,.065,95,.73969,.30)
assert isclose(four,one/4,rel_tol=0,abs_tol=1e-12)

# 3) Produto composto soma componentes já normalizados pela quantidade atendida.
a=unit_production(40,2,2,.065,95,.73969,.30)
b=unit_production(20,1,4,.065,95,.73969,.30)
assert isclose(a+b,(40*.065+2*.095*.73969+2*.30)/2+(20*.065+1*.095*.73969+1*.30)/4,abs_tol=1e-12)

# 4) Venda direta: preço = custo + lucro quando não há descontos.
p=solve_segmented(2.91,10)
assert isclose(p,12.91,abs_tol=EPS)
assert isclose(profit_at(p,2.91),10,abs_tol=EPS)

# 5) Marketplaces com taxas configuradas: solver tem de devolver o lucro líquido exato.
fee_cases=[
    (shopee_fee,(0,8,80,100,200)),
    (lambda p:ml_fee(p,False),(0,12.5,29,50,79)),
    (lambda p:ml_fee(p,True),(0,12.5,29,50,79)),
    (amazon_fee,(0,)),
    (tiktok_fee,(0,50)),
]
for fee,bp in fee_cases:
    for c in (1.25,2.91,8.40,25.00,85.00):
        for target in (0,5,10,30):
            p=solve_segmented(c,target,fee,breakpoints=bp)
            got=profit_at(p,c,fee)
            assert isfinite(p) and p>=0
            assert got>=target-2e-6, (c,target,p,got)
            # Minimality check: a tiny lower price must fail unless the solution
            # sits exactly on a marketplace breakpoint where the fee rule changes.
            lower=max(0,p-1e-5)
            on_boundary=any(abs(p-x)<2e-5 for x in bp)
            if not on_boundary:
                assert profit_at(lower,c,fee)<target+2e-6, (c,target,p,got)

# 6) Imposto, perdas e CAC entram separadamente e sem dupla contagem.
p=solve_segmented(10,15,lambda x:x*.20+4.5,tax_pct=6,loss_pct=1,cac=2)
assert isclose(profit_at(p,10,lambda x:x*.20+4.5,6,1,2),15,abs_tol=2e-6)

# 7) Margem e markup são grandezas diferentes.
price=21.1375
base_cost=2.91
fees=price*.20+4
markup=(price/base_cost-1)*100
margin=(price-base_cost-fees)/price*100
assert markup>600
assert 47<margin<48
assert not isclose(markup,margin,abs_tol=1e-9)

# 8) Robustez por propriedade: centenas de combinações válidas nunca geram NaN/Infinity
# e o lucro resolvido deve bater a meta.
rng=random.Random(20261011)
fee_fns=[lambda p:0,shopee_fee,lambda p:ml_fee(p,False),amazon_fee,tiktok_fee]
for _ in range(1200):
    c=rng.uniform(.01,500)
    target=rng.uniform(0,300)
    tax=rng.uniform(0,12)
    loss=rng.uniform(0,5)
    cac=rng.uniform(0,20)
    fee=fee_fns[rng.randrange(len(fee_fns))]
    bp=(0,8,80,100,200) if fee is shopee_fee else ((0,50) if fee is tiktok_fee else (0,))
    p=solve_segmented(c,target,fee,tax,loss,cac,breakpoints=bp)
    got=profit_at(p,c,fee,tax,loss,cac)
    assert isfinite(p) and 0<=p<10_000_000
    assert got>=target-5e-5, (c,target,tax,loss,cac,p,got)

# 9) Guardas conceituais do front-end: entradas obrigatórias zeradas não são válidas.
def valid_required(weight,hours,qty,filament_price,filament_weight,watts,kwh):
    return all(x>0 for x in (weight,hours,qty,filament_price,filament_weight,watts,kwh))
assert not valid_required(0,1,1,65,1000,95,.73969)
assert not valid_required(10,0,1,65,1000,95,.73969)
assert not valid_required(10,1,0,65,1000,95,.73969)
assert valid_required(10,1,1,65,1000,95,.73969)

print("Math verification: OK — deterministic, nonlinear marketplace and 1200 randomized invariant cases with tier discontinuities")
