// MedGraph — knowledge graph data for canned medical queries
// Node types: drug, condition, mechanism, biomarker, anatomy, study
// Edge types: causes, inhibits, correlates, supports, contradicts, metabolizes

window.MG_DATA = {
  conversations: [
    {
      id: "creatina",
      matches: ["creatina", "calvi", "calvicie", "queda de cabelo", "dht"],
      query: "Suplementação de creatina causa calvície?",
      verdict: {
        label: "Evidência fraca",
        tone: "warn",
        text: "Hipótese baseada em um único estudo de 2009 (n=20); não confirmada por replicações."
      },
      streamed: [
        "A hipótese de que a creatina cause calvície vem de um único estudo de 2009 com 20 jogadores de rugby (van der Merwe et al.), no qual a suplementação de 25g/dia por 7 dias seguida de 5g/dia por 14 dias elevou os níveis séricos de DHT em ~56%.",
        "\n\nA DHT (di-hidrotestosterona) está mecanisticamente associada à alopecia androgenética em indivíduos geneticamente predispostos — atua nos folículos via receptor de andrógeno.",
        "\n\nLimitações: o estudo nunca foi replicado, não mediu queda capilar como desfecho, e o aumento de DHT permaneceu dentro da faixa de referência. Revisões sistemáticas posteriores (Antonio et al., 2021) concluem que não há evidência clínica direta ligando creatina a perda capilar.",
        "\n\nPara pesquisadores: o mecanismo proposto envolve up-regulation da 5α-redutase tipo II, mas nenhum ensaio mediu atividade enzimática diretamente."
      ],
      citations: [
        { id: "c1", authors: "van der Merwe J et al.", year: 2009, journal: "Clin J Sport Med", title: "Three weeks of creatine monohydrate supplementation affects dihydrotestosterone to testosterone ratio in college-aged rugby players", n: 20 },
        { id: "c2", authors: "Antonio J et al.", year: 2021, journal: "J Int Soc Sports Nutr", title: "Common questions and misconceptions about creatine supplementation", n: null },
        { id: "c3", authors: "Trüeb RM", year: 2002, journal: "Exp Gerontol", title: "Molecular mechanisms of androgenetic alopecia", n: null }
      ],
      graph: {
        nodes: [
          { id: "creatina", label: "Creatina", type: "drug", size: 28, fx: null, fy: null },
          { id: "dht", label: "DHT", type: "biomarker", size: 24, sub: "di-hidrotestosterona" },
          { id: "testo", label: "Testosterona", type: "biomarker", size: 20 },
          { id: "5ar", label: "5α-redutase II", type: "mechanism", size: 22 },
          { id: "ar", label: "Receptor de andrógeno", type: "mechanism", size: 18 },
          { id: "foliculo", label: "Folículo capilar", type: "anatomy", size: 20 },
          { id: "aga", label: "Alopecia androgenética", type: "condition", size: 26 },
          { id: "rugby", label: "van der Merwe 2009", type: "study", size: 18, sub: "n=20" },
          { id: "antonio", label: "Antonio 2021", type: "study", size: 16, sub: "revisão" }
        ],
        edges: [
          { s: "creatina", t: "dht", type: "correlates", conf: 0.4, label: "↑56% (1 estudo)" },
          { s: "testo", t: "5ar", type: "metabolizes", conf: 0.95, label: "substrato" },
          { s: "5ar", t: "dht", type: "causes", conf: 0.95, label: "produz" },
          { s: "dht", t: "ar", type: "supports", conf: 0.9, label: "agonista" },
          { s: "ar", t: "foliculo", type: "causes", conf: 0.85, label: "miniaturização" },
          { s: "foliculo", t: "aga", type: "causes", conf: 0.9 },
          { s: "rugby", t: "creatina", type: "supports", conf: 0.3, label: "1 RCT pequeno" },
          { s: "antonio", t: "creatina", type: "contradicts", conf: 0.7, label: "sem evidência" },
          { s: "creatina", t: "aga", type: "correlates", conf: 0.15, label: "hipotético" }
        ]
      }
    },

    {
      id: "estatina",
      matches: ["estatina", "vastatina", "statina", "demencia", "demência", "alzheimer"],
      query: "Estatinas causam demência?",
      verdict: {
        label: "Evidência contraditória",
        tone: "info",
        text: "Sinais de alerta retirados pela FDA em 2012 após revisão; meta-análises recentes sugerem efeito neutro ou protetor."
      },
      streamed: [
        "A preocupação surgiu em 2012, quando a FDA adicionou alerta sobre efeitos cognitivos reversíveis (memória, confusão) a estatinas, baseado em relatos espontâneos de farmacovigilância.",
        "\n\nDesde então, ensaios clínicos randomizados e meta-análises não confirmaram associação causal. Estudos de coorte (Rotterdam, ARIC) sugerem efeito neutro ou levemente protetor sobre incidência de Alzheimer, possivelmente via redução de inflamação vascular e melhora do fluxo cerebral.",
        "\n\nMecanismos hipotéticos para efeito adverso incluem depleção de colesterol em membranas neuronais e redução de coenzima Q10. Mecanismos protetores incluem redução de placas ateroscleróticas cerebrais e modulação de β-amilóide.",
        "\n\nA evidência atual favorece neutralidade. Heterogeneidade entre estatinas lipofílicas (sinvastatina, atorvastatina) e hidrofílicas (pravastatina, rosuvastatina) ainda é debatida quanto à penetração na barreira hematoencefálica."
      ],
      citations: [
        { id: "c1", authors: "Wagstaff LR et al.", year: 2003, journal: "Pharmacotherapy", title: "Statin-associated memory loss: analysis of 60 case reports", n: 60 },
        { id: "c2", authors: "Zhang X et al.", year: 2018, journal: "J Neurol Neurosurg Psychiatry", title: "Statin use and risk of dementia: meta-analysis", n: 4115458 },
        { id: "c3", authors: "Power MC et al.", year: 2015, journal: "JAMA Intern Med", title: "Statins, cognition, and dementia—systematic review", n: null },
        { id: "c4", authors: "FDA Drug Safety Communication", year: 2012, journal: "FDA", title: "Important safety label changes to cholesterol-lowering statin drugs", n: null }
      ],
      graph: {
        nodes: [
          { id: "estatinas", label: "Estatinas", type: "drug", size: 28 },
          { id: "lipo", label: "Lipofílicas", type: "drug", size: 18, sub: "sinva, atorva" },
          { id: "hidro", label: "Hidrofílicas", type: "drug", size: 18, sub: "prava, rosuva" },
          { id: "hmgcoa", label: "HMG-CoA redutase", type: "mechanism", size: 22 },
          { id: "ldl", label: "LDL-C", type: "biomarker", size: 20 },
          { id: "coq10", label: "Coenzima Q10", type: "biomarker", size: 18 },
          { id: "bhe", label: "Barreira hematoencefálica", type: "anatomy", size: 20 },
          { id: "amiloide", label: "β-amilóide", type: "biomarker", size: 20 },
          { id: "inflam", label: "Inflamação vascular", type: "mechanism", size: 18 },
          { id: "alz", label: "Alzheimer", type: "condition", size: 24 },
          { id: "demencia", label: "Demência", type: "condition", size: 26 },
          { id: "memoria", label: "Déficit de memória (reversível)", type: "condition", size: 18 },
          { id: "fda", label: "FDA 2012", type: "study", size: 16, sub: "alerta" },
          { id: "zhang", label: "Zhang 2018", type: "study", size: 18, sub: "n=4.1M" }
        ],
        edges: [
          { s: "lipo", t: "estatinas", type: "supports", conf: 1.0 },
          { s: "hidro", t: "estatinas", type: "supports", conf: 1.0 },
          { s: "estatinas", t: "hmgcoa", type: "inhibits", conf: 0.99 },
          { s: "hmgcoa", t: "ldl", type: "causes", conf: 0.95, label: "↓ síntese" },
          { s: "hmgcoa", t: "coq10", type: "inhibits", conf: 0.7, label: "via mevalonato" },
          { s: "lipo", t: "bhe", type: "supports", conf: 0.6, label: "atravessa" },
          { s: "estatinas", t: "inflam", type: "inhibits", conf: 0.7 },
          { s: "inflam", t: "alz", type: "causes", conf: 0.6 },
          { s: "estatinas", t: "amiloide", type: "inhibits", conf: 0.4, label: "modulação" },
          { s: "amiloide", t: "alz", type: "causes", conf: 0.85 },
          { s: "alz", t: "demencia", type: "causes", conf: 0.9 },
          { s: "estatinas", t: "memoria", type: "correlates", conf: 0.3, label: "casos isolados" },
          { s: "fda", t: "memoria", type: "supports", conf: 0.5 },
          { s: "zhang", t: "demencia", type: "contradicts", conf: 0.8, label: "sem associação" }
        ]
      }
    },

    {
      id: "methotrexate",
      matches: ["methotrexate", "metotrexato", "hepatotox", "fibrose hepatica", "fibrose hepática"],
      query: "Methotrexate administration can lead to hepatotoxicity and liver fibrosis after prolonged exposure",
      verdict: {
        label: "Evidência forte",
        tone: "ok",
        text: "Bem estabelecido em literatura de reumatologia e oncologia; mecanismo conhecido, monitoramento padrão."
      },
      streamed: [
        "Afirmação confirmada por extensa literatura. Methotrexate (MTX), um antagonista do ácido fólico via inibição da di-hidrofolato redutase (DHFR), causa hepatotoxicidade dose-dependente em ~15-30% dos pacientes em uso crônico.",
        "\n\nMecanismo: depleção de folato intracelular leva à acumulação de homocisteína e estresse oxidativo nos hepatócitos. Em uso prolongado (>2g dose cumulativa), pode evoluir para esteatose, fibrose e, raramente, cirrose.",
        "\n\nFatores de risco: obesidade, diabetes, consumo de álcool, hepatite B/C, dose cumulativa elevada. Diretrizes ACR e EULAR recomendam monitoramento de ALT/AST a cada 4-12 semanas e biópsia hepática ou FibroScan em pacientes com elevações persistentes.",
        "\n\nA suplementação de ácido fólico (1-5 mg/dia) reduz significativamente a hepatotoxicidade sem comprometer eficácia em artrite reumatoide."
      ],
      citations: [
        { id: "c1", authors: "Kremer JM et al.", year: 1994, journal: "Arthritis Rheum", title: "Liver histology in rheumatoid arthritis patients receiving long-term methotrexate", n: 113 },
        { id: "c2", authors: "Conway R et al.", year: 2015, journal: "Cochrane Database Syst Rev", title: "Methotrexate and lung disease in rheumatoid arthritis", n: null },
        { id: "c3", authors: "Visser K et al.", year: 2009, journal: "Ann Rheum Dis", title: "Multinational evidence-based recommendations for the use of methotrexate", n: null },
        { id: "c4", authors: "Shea B et al.", year: 2013, journal: "Cochrane Database Syst Rev", title: "Folic acid and folinic acid for reducing side effects in patients receiving methotrexate", n: null }
      ],
      graph: {
        nodes: [
          { id: "mtx", label: "Methotrexate", type: "drug", size: 30 },
          { id: "dhfr", label: "DHFR", type: "mechanism", size: 22, sub: "di-hidrofolato redutase" },
          { id: "folato", label: "Folato intracelular", type: "biomarker", size: 22 },
          { id: "homocist", label: "Homocisteína", type: "biomarker", size: 20 },
          { id: "ros", label: "Estresse oxidativo", type: "mechanism", size: 20 },
          { id: "hepatocito", label: "Hepatócito", type: "anatomy", size: 22 },
          { id: "alt", label: "ALT/AST", type: "biomarker", size: 20 },
          { id: "esteatose", label: "Esteatose", type: "condition", size: 20 },
          { id: "fibrose", label: "Fibrose hepática", type: "condition", size: 26 },
          { id: "cirrose", label: "Cirrose", type: "condition", size: 22 },
          { id: "hepatotox", label: "Hepatotoxicidade", type: "condition", size: 26 },
          { id: "folico", label: "Ácido fólico", type: "drug", size: 20, sub: "1-5 mg/dia" },
          { id: "kremer", label: "Kremer 1994", type: "study", size: 16, sub: "n=113" },
          { id: "shea", label: "Shea 2013", type: "study", size: 16, sub: "Cochrane" }
        ],
        edges: [
          { s: "mtx", t: "dhfr", type: "inhibits", conf: 0.99 },
          { s: "dhfr", t: "folato", type: "causes", conf: 0.95, label: "↓ síntese" },
          { s: "folato", t: "homocist", type: "inhibits", conf: 0.9 },
          { s: "homocist", t: "ros", type: "causes", conf: 0.8 },
          { s: "ros", t: "hepatocito", type: "causes", conf: 0.85, label: "lesão" },
          { s: "hepatocito", t: "alt", type: "correlates", conf: 0.9, label: "↑ liberação" },
          { s: "hepatocito", t: "esteatose", type: "causes", conf: 0.75 },
          { s: "esteatose", t: "fibrose", type: "causes", conf: 0.7 },
          { s: "fibrose", t: "cirrose", type: "causes", conf: 0.55, label: "raro" },
          { s: "mtx", t: "hepatotox", type: "causes", conf: 0.85, label: "15-30%" },
          { s: "hepatotox", t: "fibrose", type: "causes", conf: 0.7 },
          { s: "folico", t: "homocist", type: "inhibits", conf: 0.85, label: "previne" },
          { s: "folico", t: "hepatotox", type: "inhibits", conf: 0.8, label: "protetor" },
          { s: "kremer", t: "fibrose", type: "supports", conf: 0.85 },
          { s: "shea", t: "folico", type: "supports", conf: 0.9 }
        ]
      }
    }
  ],

  // Fallback for unknown queries
  generic: {
    verdict: {
      label: "Análise preliminar",
      tone: "info",
      text: "Grafo gerado a partir da consulta — refine para obter evidências específicas."
    },
    streamed: [
      "Esta é uma consulta exploratória. O MedGraph extraiu as entidades principais e relações candidatas a partir da sua afirmação.",
      "\n\nPara obter uma análise com citações e níveis de evidência, refine sua pergunta com:",
      "\n• população de interesse,\n• desfecho clínico,\n• janela temporal."
    ]
  }
};
