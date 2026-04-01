# Análise de Sentimentos em Notícias sobre a Petrobras

Projeto desenvolvido para a disciplina de Busca e Mineração de Texto.

## Objetivo

Desenvolver um classificador de sentimentos capaz de identificar a polaridade
(positiva ou negativa) de notícias jornalísticas sobre a Petrobras, avaliando
o impacto dessas publicações sobre a imagem institucional da companhia.

## Metodologia

1. Coleta e pré-processamento de notícias públicas contendo o termo "Petrobras"
2. Treinamento do classificador com datasets públicos de sentimento em PT-BR
3. Rotulagem manual de amostra para avaliação do modelo
4. Avaliação por precisão e recall com comparação a baseline

## Tecnologias

- Python 3.11+

## Como executar

> Em construção.
```

---

**Estrutura de pastas**
```
├── data/
│   ├── raw/          # dados brutos baixados
│   ├── processed/    # dados após pré-processamento
│   └── labeled/      # amostra rotulada manualmente
├── notebooks/        # exploração e experimentos
├── src/
│   ├── collect/      # coleta de dados
│   ├── preprocess/   # limpeza e preparação
│   ├── train/        # treinamento do modelo
│   └── evaluate/     # métricas e avaliação
├── models/           # modelos treinados salvos
├── results/          # outputs e relatórios
├── requirements.txt
└── README.md
