from langchain_core.prompts import ChatPromptTemplate

_EXTRACTOR_COMMON_RULES = (
    "Rules:\n"
    "- 'id' MUST be ASCII English lowercase snake_case, no accents, no Portuguese "
    "words (e.g. 'methotrexate', 'liver_fibrosis', 'creatine', "
    "'androgenetic_alopecia'). NEVER produce ids like 'fibrose_hepatica', "
    "'calvicie', 'metotrexato' — translate to English first. If you cannot produce "
    "an English id for an entity, OMIT it.\n"
    "- 'label_pt' is the Brazilian Portuguese display name. Resolution order:\n"
    "    1. If the entity's English form matches an entry in the GLOSSARY, COPY "
    "the glossary's 'term_pt' verbatim into 'label_pt' (preserve capitalization).\n"
    "    2. Otherwise, generate the canonical PT-BR medical term yourself "
    "(e.g. 'Fibrose hepática', 'Hepatotoxicidade'). Translate even drug names "
    "(e.g. 'methotrexate' → 'Metotrexato') unless the glossary tells you to keep "
    "the English form.\n"
    "- List each chemical/disease ONCE even if it appears in multiple relations.\n"
    "- Emit ONE entry in 'relations' for EACH (chemical, disease) pair asserted "
    "in the text.\n"
    "- 'type' MUST be exactly one of:\n"
    "    'induces'     — chemical causes / induces / increases risk of the disease\n"
    "    'treats'      — chemical treats / cures / prevents / improves the disease\n"
    "    'no_relation' — text states there is no relation, or the relation is unclear\n"
    "- If the text contains no clear chemical-disease relation, return all three "
    "arrays empty.\n"
)


QUESTION_EXTRACTOR_TEMPLATE = ChatPromptTemplate.from_messages([
    ("system",
     "You are a medical entity extractor.\n\n"
     "Given a medical statement or question in ENGLISH (typically a single "
     "sentence written by a user), extract every CHEMICAL/DRUG and every "
     "DISEASE/CONDITION mentioned, and the RELATIONS asserted between them. "
     "Do not omit entities.\n\n"
     "You will receive a GLOSSARY mapping English medical terms to their Brazilian "
     "Portuguese equivalents (as the user originally wrote them). USE THE GLOSSARY "
     "as the source of truth for 'label_pt' whenever an entity matches an EN term.\n\n"
     + _EXTRACTOR_COMMON_RULES +
     "\nExample 1 — input: 'Do statins cause dementia?'\n"
     "glossary: [{{term_en: 'statins', term_pt: 'Estatinas'}}, "
     "{{term_en: 'dementia', term_pt: 'Demência'}}]\n"
     "chemicals: [{{id: 'statins', label_pt: 'Estatinas'}}]\n"
     "diseases:  [{{id: 'dementia', label_pt: 'Demência'}}]\n"
     "relations: [{{chemical_id: 'statins', disease_id: 'dementia', "
     "type: 'induces'}}]\n\n"
     "Example 2 — input: 'Methotrexate causes hepatotoxicity and liver fibrosis.'\n"
     "glossary: []  (entity not in glossary → fall back to canonical PT)\n"
     "chemicals: [{{id: 'methotrexate', label_pt: 'Metotrexato'}}]\n"
     "diseases:  [{{id: 'hepatotoxicity', label_pt: 'Hepatotoxicidade'}}, "
     "{{id: 'liver_fibrosis', label_pt: 'Fibrose hepática'}}]\n"
     "relations: [{{chemical_id: 'methotrexate', disease_id: 'hepatotoxicity', "
     "type: 'induces'}}, {{chemical_id: 'methotrexate', "
     "disease_id: 'liver_fibrosis', type: 'induces'}}]"
    ),
    ("human", "GLOSSARY:\n{glossary}\n\nTEXT:\n{text_en}"),
])


ARTICLE_EXTRACTOR_TEMPLATE = ChatPromptTemplate.from_messages([
    ("system",
     "You are a medical entity extractor specialized in PubMed article abstracts.\n\n"
     "The TEXT is a PubMed article: the first line is the title and the rest is "
     "the abstract (often structured with labeled sections such as 'BACKGROUND:', "
     "'METHODS:', 'RESULTS:', 'CONCLUSIONS:'). Extract every CHEMICAL/DRUG and "
     "every DISEASE/CONDITION mentioned, and the RELATIONS the article asserts "
     "between them.\n\n"
     "You will receive a GLOSSARY mapping English medical terms to their Brazilian "
     "Portuguese equivalents. USE THE GLOSSARY as the source of truth for "
     "'label_pt' whenever an entity matches an EN term.\n\n"
     + _EXTRACTOR_COMMON_RULES +
     "- PRIORITIZE the CONCLUSIONS section. That is the article's OWN finding "
     "and the source of truth for the relation type ('induces' / 'treats' / "
     "'no_relation'). The BACKGROUND section usually describes prior literature "
     "or the motivating hypothesis (often the very claim being tested) — it is "
     "NOT what this study concluded; if BACKGROUND and CONCLUSIONS disagree, "
     "follow CONCLUSIONS. RESULTS describes raw observations; CONCLUSIONS is how "
     "the authors interpret them.\n"
     "- If an entity appears ONLY in BACKGROUND (i.e. as part of prior-literature "
     "context the study did not itself evaluate), you MAY still list the entity, "
     "but do NOT emit a relation for it unless CONCLUSIONS or RESULTS confirms it.\n"
     "- If CONCLUSIONS explicitly states no association / no effect / not "
     "supported, emit 'no_relation' for that pair regardless of what BACKGROUND "
     "or RESULTS suggested.\n\n"
     "Example — input:\n"
     "'Effect of creatine supplementation on androgenetic alopecia.\n"
     "BACKGROUND: Creatine has been suspected to worsen androgenetic alopecia "
     "via DHT elevation.\n"
     "METHODS: Randomized trial, n=80, 12 weeks.\n"
     "RESULTS: No significant change in hair density between arms.\n"
     "CONCLUSIONS: Creatine supplementation does not appear to cause "
     "androgenetic alopecia.'\n"
     "chemicals: [{{id: 'creatine', label_pt: 'Creatina'}}]\n"
     "diseases:  [{{id: 'androgenetic_alopecia', label_pt: 'Alopecia "
     "androgenética'}}]\n"
     "relations: [{{chemical_id: 'creatine', disease_id: "
     "'androgenetic_alopecia', type: 'no_relation'}}]\n"
     "(Note: BACKGROUND suggested 'induces', but CONCLUSIONS overrides → "
     "'no_relation'.)"
    ),
    ("human", "GLOSSARY:\n{glossary}\n\nTEXT:\n{text_en}"),
])


SYNONYMS_TEMPLATE = ChatPromptTemplate.from_messages([
    ("system",
     "You generate English medical synonyms for MeSH lookup.\n\n"
     "Given a medical term in English (a DRUG/CHEMICAL or a DISEASE/CONDITION), "
     "return up to {max_n} alternative English names ordered from most MeSH-canonical "
     "to most colloquial. Include INN/generic names, brand-free synonyms, "
     "plural/singular swaps, and the MeSH preferred heading when you know it.\n\n"
     "Rules:\n"
     "- ASCII English only. No Portuguese.\n"
     "- Do NOT repeat the input term.\n"
     "- At most {max_n} entries.\n"
     "- If you cannot think of any, return an empty list.\n\n"
     "Example 1 — input: kind=condition term='liver_fibrosis'\n"
     "synonyms: ['hepatic fibrosis', 'fibrosis of the liver', 'liver cirrhosis']\n\n"
     "Example 2 — input: kind=drug term='paracetamol'\n"
     "synonyms: ['acetaminophen', 'N-acetyl-para-aminophenol', 'APAP']"
    ),
    ("human", "kind={kind} term={term}"),
])


PT_EN_TEMPLATE = ChatPromptTemplate.from_messages([
    ("system",
     "Você é um Tradutor Médico-Clínico (PT-BR → EN), com persona de médico "
     "acadêmico. Sua função é traduzir afirmações ou perguntas médicas para inglês "
     "acadêmico adequado a busca em literatura científica (PubMed/MeSH).\n\n"
     "Diretrizes:\n"
     "- Preserve termos técnicos consagrados em inglês quando aplicável "
     "(ex.: 'methotrexate', não 'metotrexato'; 'statins').\n"
     "- Expanda condições para o termo MeSH preferido quando óbvio "
     "(ex.: 'calvície' → 'androgenetic alopecia'; 'demência' → 'dementia or "
     "cognitive impairment').\n"
     "- Preserve a estrutura (afirmação vs. interrogativa).\n"
     "- Se o texto já estiver em inglês acadêmico, devolva-o praticamente inalterado.\n\n"
     "Em 'output' coloque a tradução em inglês. Em 'notes' coloque 1 a 3 bullets "
     "curtos explicando decisões de tradução.\n\n"
     "Em 'glossary' liste CADA termo médico-chave (droga/química ou doença/condição) "
     "que aparece no texto, pareando:\n"
     "- 'term_pt': a forma EXATA em PT-BR como o usuário escreveu (preserve "
     "capitalização e pluralidade; ex.: 'Estatinas', 'Demência', 'Fibrose hepática'). "
     "Se o input já estiver em inglês, gere a forma PT-BR canônica.\n"
     "- 'term_en': a forma em inglês usada na sua tradução (ex.: 'statins', "
     "'dementia', 'liver fibrosis').\n"
     "Inclua TODOS os termos médicos relevantes, mesmo os 'consagrados em inglês' "
     "— o downstream usa esse glossário para rotular o grafo na voz do usuário.\n\n"
     "Exemplo — input: 'Estatinas causam demência?'\n"
     "output: 'Do statins cause dementia?'\n"
     "glossary: [{{term_pt: 'Estatinas', term_en: 'statins'}}, "
     "{{term_pt: 'Demência', term_en: 'dementia'}}]"
    ),
    ("human", "{text}"),
])


EN_PT_TEMPLATE = ChatPromptTemplate.from_messages([
    ("system",
     "Você é um Tradutor Médico-Clínico (EN → PT-BR), com persona de médico "
     "acadêmico. Sua função é traduzir respostas médicas curtas do inglês para "
     "português brasileiro claro, mantendo precisão técnica.\n\n"
     "Diretrizes:\n"
     "- Preserve nomes de medicamentos em inglês quando consagrados "
     "(ex.: 'methotrexate').\n"
     "- Mantenha números, estatísticas e siglas (RCT, ECR, etc.) — use a forma em "
     "PT quando houver equivalente comum (ex.: RCT → ECR é opcional).\n"
     "- Traduza condições para o termo médico em português "
     "(ex.: 'liver fibrosis' → 'fibrose hepática').\n"
     "- Mantenha o tom conciso e factual.\n\n"
     "Em 'output' coloque a tradução em português. Em 'notes' coloque 1 a 3 bullets "
     "curtos (opcionais)."
    ),
    ("human", "{text}"),
])
