"""Benchmark do pipeline completo para o Claude Haiku 4.5.

Igual ao `pipeline_ollama.py`, mas força o pipeline a rodar com o modelo
Anthropic Haiku. Rodamos Sonnet e Haiku em scripts separados de propósito,
para controlar o custo de cada execução.

Cada pergunta passa pelo pipeline médico do backend (tradução → extração de
grafo → MeSH → PubMed → veredito). O CSV grava o *veredito final* (Confirmado,
Refutado, Indefinido, Contraditório, Sem evidência).

Pré-requisitos:
    - ANTHROPIC_API_KEY definida no `chat/.env`.
    - Backend de pé (porta 8000):
        cd chat
        .venv/bin/uvicorn backend.main:app --port 8000

Uso:
    cd chat
    python benchmark/pipeline_anthropic_haiku.py
"""
import csv
import json
import time
from pathlib import Path

import requests

API_URL = "http://localhost:8000/chat"

MODELS = ["claude-haiku-4-5"]

QUESTIONS = [
    "A sinvastatina é usada para tratar o colesterol alto?",
    "A amoxicilina é eficaz no tratamento da gripe?",
    "A metformina é indicada para o tratamento do diabetes tipo 2?",
    "O omeprazol é usado para tratar a depressão?",
    "A levotiroxina trata o hipotireoidismo?",
    "A insulina é indicada para tratar a hipertensão?",
    "A fluoxetina é usada para tratar o diabetes?",
    "O captopril é usado no tratamento da hipertensão?",
    "A sertralina é indicada para tratar a hipertensão?",
    "O alopurinol é usado no tratamento da gota?",
    "O alopurinol é indicado para tratar a hipertensão?",
    "O diazepam é indicado para tratar infecções bacterianas?",
    "A loratadina é usada no tratamento de alergias?",
    "A levotiroxina é usada para tratar a asma?",
    "A varfarina é usada para prevenir tromboses?",
    "A varfarina é usada para tratar o colesterol alto?",
    "A ivermectina é usada para tratar infecções por parasitas?",
    "A ivermectina é eficaz no tratamento da COVID-19?",
    "A hidroxicloroquina cura a COVID-19?",
    "O metotrexato é utilizado no tratamento da artrite reumatoide?",
    "O paracetamol previne o câncer?",
    "O ácido acetilsalicílico (AAS) é usado para prevenir o infarto em pacientes de risco?",
    "O uso prolongado de prednisona pode causar osteoporose?",
    "A amoxicilina causa hipertensão?",
    "O paracetamol em doses elevadas pode causar lesão no fígado?",
    "A metformina causa hipotireoidismo?",
    "O uso de ibuprofeno pode causar úlcera gástrica?",
    "A sinvastatina pode causar dores musculares?",
    "A furosemida pode causar perda de potássio (hipocalemia)?",
    "A loratadina causa diabetes?",
    "O enalapril pode causar tosse seca?",
    "O paracetamol pode causar catarata?",
    "A morfina pode causar constipação (prisão de ventre)?",
    "A metformina pode causar surdez?",
    "A cisplatina pode causar perda auditiva (ototoxicidade)?",
    "O salbutamol pode causar úlcera gástrica?",
    "A vancomicina pode causar lesão renal (nefrotoxicidade)?",
    "A azitromicina pode causar diabetes?",
    "O carbonato de lítio pode causar tremores?",
    "A dipirona pode causar hipotireoidismo?",
]


def ask(model_key: str, question: str) -> str:
    """Roda a pergunta pelo pipeline via API e devolve o veredito final.

    Consome o stream SSE e captura o `label` do passo de veredito. Se o pipeline
    pedir esclarecimento (termo não mapeado no MeSH) ou nada for produzido,
    devolve um marcador explicativo no lugar do veredito.
    """
    response = requests.post(
        API_URL,
        json={"message": question, "model": model_key},
        stream=True,
        timeout=600,
    )
    response.raise_for_status()

    verdict = None
    needs_clarification = False
    event = None

    for raw in response.iter_lines(decode_unicode=True):
        if raw is None or raw == "":
            event = None
            continue
        if raw.startswith("event:"):
            event = raw[len("event:"):].strip()
            continue
        if not raw.startswith("data:"):
            continue
        data_str = raw[len("data:"):].strip()
        try:
            data = json.loads(data_str)
        except json.JSONDecodeError:
            continue

        if event == "pipeline_step":
            step = data.get("step")
            status = data.get("status")
            payload = data.get("payload") or {}
            if step == "verdict" and status == "ok":
                verdict = payload.get("label")
            elif step == "final" and status == "ok" and verdict is None:
                verdict = (payload.get("stage6") or {}).get("label")
            elif step == "mesh_search" and status == "needs_clarification":
                needs_clarification = True
        elif event == "error":
            return f"Erro: {data.get('message', '?')}"

    if verdict:
        return verdict
    if needs_clarification:
        return "Esclarecimento necessário"
    return "Sem veredito"


def main() -> None:
    results = []

    for model_key in MODELS:
        print(f"\n=== {model_key} ===")
        for i, question in enumerate(QUESTIONS, 1):
            t0 = time.time()
            try:
                verdict = ask(model_key, question)
            except Exception as e:  # noqa: BLE001 — registra falha e segue
                verdict = f"Erro: {e}"
            elapsed = time.time() - t0
            print(f"  [{i:02d}] {verdict!r:.40s} ({elapsed:.1f}s)")
            results.append({
                "model":    model_key,
                "question": question,
                "verdict":  verdict,
                "time_s":   round(elapsed, 2),
            })

    output = Path(__file__).parent / "results_pl_anthropic_haiku.csv"
    with open(output, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["model", "question", "verdict", "time_s"])
        writer.writeheader()
        writer.writerows(results)

    print(f"\nResultados salvos em {output}")


if __name__ == "__main__":
    main()
