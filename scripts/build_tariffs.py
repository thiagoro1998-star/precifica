#!/usr/bin/env python3
import csv, io, json, re, sys, urllib.request
from datetime import datetime, date

URL = "https://dadosabertos.aneel.gov.br/dataset/5a583f3e-1646-4f67-bf0f-69db4203e89e/resource/fcf2906c-7c32-4b9b-a637-054e7a5234f4/download/tarifas-homologadas-distribuidoras-energia-eletrica.csv"

def norm(s):
    s = (s or "").strip().upper()
    repl = str.maketrans("ÁÀÃÂÉÊÍÓÔÕÚÜÇ", "AAAAEEIOOOUUC")
    return s.translate(repl)

def parse_date(v):
    if not v:
        return None
    v = v.strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(v[:10], fmt).date()
        except Exception:
            pass
    return None

def parse_num(v):
    if v is None:
        return 0.0
    s = str(v).strip().replace(" ", "")
    if not s:
        return 0.0
    if "," in s:
        s = s.replace(".", "").replace(",", ".")
    try:
        n = float(s)
    except Exception:
        return 0.0
    # ANEEL dataset stores tariff values in R$/MWh; convert to R$/kWh when needed.
    if n > 20:
        n /= 1000.0
    return n

print("Downloading ANEEL tariff dataset...", file=sys.stderr)
with urllib.request.urlopen(URL, timeout=20) as r:
    raw = r.read()

text = raw.decode("utf-8-sig", errors="replace")
sample = text[:8192]
try:
    dialect = csv.Sniffer().sniff(sample, delimiters=";,")
    delim = dialect.delimiter
except Exception:
    delim = ";"

reader = csv.DictReader(io.StringIO(text), delimiter=delim)
today = date.today()
best = {}

for row in reader:
    subgrupo = norm(row.get("DscSubGrupo"))
    modalidade = norm(row.get("DscModalidadeTarifaria"))
    classe = norm(row.get("DscClasse"))
    subclasse = norm(row.get("DscSubClasse"))
    base = norm(row.get("DscBaseTarifaria"))
    detalhe = norm(row.get("DscDetalhe"))
    posto = norm(row.get("NomPostoTarifario"))
    if subgrupo != "B1":
        continue
    if "CONVENCIONAL" not in modalidade:
        continue
    if "RESIDENCIAL" not in classe and "RESIDENCIAL" not in subclasse:
        continue
    if "BAIXA RENDA" in subclasse or "BAIXA RENDA" in classe:
        continue
    if base and "TARIFA DE APLICACAO" not in base:
        continue
    if detalhe and "NAO SE APLICA" not in detalhe:
        continue
    if posto and "NAO SE APLICA" not in posto:
        continue

    start = parse_date(row.get("DatInicioVigencia"))
    end = parse_date(row.get("DatFimVigencia"))
    if start and start > today:
        continue
    if end and end < today:
        continue

    tusd = parse_num(row.get("VlrTUSD"))
    te = parse_num(row.get("VlrTE"))
    total = tusd + te
    if total <= 0.1 or total >= 5:
        continue

    sig = (row.get("SigAgente") or "").strip()
    if not sig:
        continue
    key = norm(sig)
    current = best.get(key)
    score = start or date(1900,1,1)
    if current is None or score > current["_score"]:
        best[key] = {
            "_score": score,
            "sigAgente": sig,
            "rate": round(total, 6),
            "tusd": round(tusd, 6),
            "te": round(te, 6),
            "start": row.get("DatInicioVigencia"),
            "end": row.get("DatFimVigencia"),
            "resolution": row.get("DscREH") or "",
            "source": "ANEEL — Tarifas de aplicação das distribuidoras",
            "updated": row.get("DatGeracaoConjuntoDados") or "",
        }

out = {}
for k,v in best.items():
    v.pop("_score", None)
    out[k] = v

payload = {
    "generatedAt": datetime.now().isoformat(timespec="seconds"),
    "sourceUrl": URL,
    "source": "ANEEL — Tarifas de aplicação das distribuidoras de energia elétrica",
    "note": "B1 residencial convencional, Tarifa de Aplicação, TUSD + TE, sem tributos e bandeiras.",
    "agents": out
}
with open("dist/tariffs.json","w",encoding="utf-8") as f:
    json.dump(payload,f,ensure_ascii=False,separators=(",",":"))

print(f"Generated {len(out)} current residential B1 agent tariffs", file=sys.stderr)
