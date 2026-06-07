"""Benchmark de verdadeiro/falso para modelos Ollama locais.

Executa cada pergunta em cada modelo e salva as respostas em results_bl_ollama.csv.

Uso:
    python benchmark/run.py
"""
import csv
import time

import requests

OLLAMA_URL = "http://localhost:11434/api/chat"

MODELS = {
    "qwen":  {"name": "qwen3:8b",    "extra": {"think": False}},
    "llama": {"name": "llama3.1:8b", "extra": {}},
}

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
]

PROMPT_TEMPLATE = (
    "Responda apenas 'Verdadeiro' ou 'Falso', sem explicação: {question}"
)


def ask(model_name: str, question: str, extra: dict) -> str:
    response = requests.post(
        OLLAMA_URL,
        json={
            "model": model_name,
            "messages": [{"role": "user", "content": PROMPT_TEMPLATE.format(question=question)}],
            "stream": False,
            **extra,
        },
        timeout=60,
    )
    response.raise_for_status()
    return response.json()["message"]["content"].strip()


def main() -> None:
    results = []

    for model_key, model_cfg in MODELS.items():
        print(f"\n=== {model_key} ({model_cfg['name']}) ===")
        for i, question in enumerate(QUESTIONS, 1):
            t0 = time.time()
            answer = ask(model_cfg["name"], question, model_cfg["extra"])
            elapsed = time.time() - t0
            print(f"  [{i:02d}] {answer!r:.50s} ({elapsed:.1f}s)")
            results.append({
                "model":    model_key,
                "question": question,
                "answer":   answer,
                "time_s":   round(elapsed, 2),
            })

    output = "benchmark/results_bl_ollama.csv"
    with open(output, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["model", "question", "answer", "time_s"])
        writer.writeheader()
        writer.writerows(results)

    print(f"\nResultados salvos em {output}")


if __name__ == "__main__":
    main()
