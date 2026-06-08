from collections import OrderedDict

from .models import (
    AggregateStagePayload,
    ArticleVote,
    EdgeConsensus,
    EdgeType,
    EdgeWithArticles,
    GraphNode,
    GraphPayload,
    PubmedArticle,
    VerdictScore,
    VerdictStagePayload,
)


def aggregate_graphs(
    question_graph: GraphPayload,
    article_graphs: list[tuple[str, GraphPayload]],
    alias_map: dict[str, str] | None = None,
    node_synonyms: dict[str, list[str]] | None = None,
) -> AggregateStagePayload:
    """Combina o grafo da pergunta com grafos dos artigos.

    Para cada aresta da pergunta, busca a mesma (s,t) nos grafos dos artigos.
    Tipo igual → supports=True; tipo diferente → supports=False; ausente → abstenção.

    `alias_map` (id_variante → id_canônico) e `node_synonyms` (id_canônico → labels)
    vêm de `build_alias_map` e permitem colapsar sinônimos: um nó de artigo cujo id é
    um alias de uma entidade da pergunta é tratado como essa entidade no match, e suas
    formas são registradas em `node.aliases` para exibição.
    """
    alias_map = alias_map or {}
    node_synonyms = node_synonyms or {}

    def canon(node_id: str) -> str:
        return alias_map.get(node_id, node_id)

    # aliases acumulados por id canônico (sinônimos vindos do glossário/MeSH +
    # labels de nós de artigo que foram colapsados).
    collected_aliases: dict[str, list[str]] = {}

    def add_alias_label(canonical: str, label: str) -> None:
        # minúsculo para não diferenciar 'simvastatin' de 'Simvastatin'
        label = (label or "").strip().lower()
        if not label:
            return
        bucket = collected_aliases.setdefault(canonical, [])
        if label not in bucket:
            bucket.append(label)

    nodes_by_id: OrderedDict[str, GraphNode] = OrderedDict()
    for n in question_graph.nodes:
        nodes_by_id[n.id] = n.model_copy(deep=True)
        for syn in node_synonyms.get(n.id, []):
            add_alias_label(n.id, syn)
    for _pmid, g in article_graphs:
        for n in g.nodes:
            cid = canon(n.id)
            if cid != n.id:
                add_alias_label(cid, n.label)
                for syn in node_synonyms.get(cid, []):
                    add_alias_label(cid, syn)
            nodes_by_id.setdefault(
                cid, n.model_copy(deep=True, update={"id": cid})
            )

    edges_out: list[EdgeWithArticles] = []
    question_edge_keys: set[tuple[str, str]] = set()

    for qe in question_graph.edges:
        key = (qe.s, qe.t)
        question_edge_keys.add(key)
        votes: list[ArticleVote] = []
        for pmid, g in article_graphs:
            match = next(
                (e for e in g.edges if canon(e.s) == qe.s and canon(e.t) == qe.t),
                None,
            )
            if match is None:
                continue
            votes.append(ArticleVote(pmid=pmid, type=match.type))
        edges_out.append(EdgeWithArticles(s=qe.s, t=qe.t, type=qe.type, articles=votes))

    extra_edges: dict[tuple[str, str, str], list[ArticleVote]] = {}
    for pmid, g in article_graphs:
        for e in g.edges:
            s, t = canon(e.s), canon(e.t)
            key = (s, t)
            if key in question_edge_keys:
                continue
            if s not in nodes_by_id or t not in nodes_by_id:
                continue
            k = (s, t, e.type)
            extra_edges.setdefault(k, []).append(ArticleVote(pmid=pmid, type=e.type))

    for (s, t, typ), votes in list(extra_edges.items())[:6]:
        edges_out.append(EdgeWithArticles(s=s, t=t, type=typ, articles=votes))

    nodes_out = list(nodes_by_id.values())
    for node in nodes_out:
        label_norm = node.label.strip().lower()
        node.aliases = [
            a for a in collected_aliases.get(node.id, []) if a != label_norm
        ]

    return AggregateStagePayload(
        nodes=nodes_out,
        edges=edges_out,
    )


def _edge_consensus(
    votes: list[ArticleVote], question_type: EdgeType
) -> tuple[str, str | None]:
    """Compara o type de cada voto com o type afirmado na pergunta para derivar
    confirm/refute/neutral. Esta é a etapa onde o 'match' acontece — a etapa 5
    apenas registra o que cada artigo afirma (induces/treats/no_relation), sem
    rotular como apoia/refuta."""
    supports = sum(1 for v in votes if v.type == question_type)
    refutes = sum(1 for v in votes if v.type != question_type)
    total = len(votes)
    if supports >= 3 and supports > refutes:
        return "confirm", f"{supports}/{total} apoiam"
    if refutes >= 3 and refutes > supports:
        return "refute", f"{refutes}/{total} refutam"
    if total == 0:
        return "neutral", None
    return "neutral", f"{supports} apoiam · {refutes} refutam · {total} total"


def compute_verdict(
    question_graph: GraphPayload,
    aggregate: AggregateStagePayload,
    articles: list[PubmedArticle],
) -> VerdictStagePayload:
    edges_consensus: list[EdgeConsensus] = []
    question_edge_consensus: list[str] = []
    score = VerdictScore(total_articles=len(articles))

    for qe in question_graph.edges:
        agg_edge = next(
            (a for a in aggregate.edges if a.s == qe.s and a.t == qe.t),
            None,
        )
        votes = agg_edge.articles if agg_edge else []
        consensus, note = _edge_consensus(votes, qe.type)
        edges_consensus.append(EdgeConsensus(
            s=qe.s, t=qe.t, type=qe.type,
            consensus=consensus, note=note,
        ))
        question_edge_consensus.append(consensus)
        if consensus == "confirm":
            score.confirms += 1
        elif consensus == "refute":
            score.refutes += 1
        else:
            score.neutral += 1

    if not articles or not question_edge_consensus:
        return VerdictStagePayload(
            label="Sem evidência", tone="warn",
            title="Nenhum artigo relevante foi recuperado",
            summary="Não foi possível recuperar artigos indexados que respondam à pergunta.",
            score=score, edges_consensus=edges_consensus,
        )

    has_confirm = any(c == "confirm" for c in question_edge_consensus)
    has_refute = any(c == "refute" for c in question_edge_consensus)

    if has_confirm and has_refute:
        label = "Contraditório"
        tone = "info"
        title = "Literatura mostra evidências divergentes"
        summary = (
            f"Das relações afirmadas, {score.confirms} são confirmadas e "
            f"{score.refutes} refutadas em {score.total_articles} artigos."
        )
    elif has_confirm:
        label = "Confirmado"
        tone = "ok"
        title = "Literatura confirma a afirmação"
        summary = (
            f"{score.confirms} de {len(question_edge_consensus)} relações afirmadas "
            f"são confirmadas em {score.total_articles} artigos."
        )
    elif has_refute:
        label = "Refutado"
        tone = "bad"
        title = "Literatura refuta a afirmação"
        summary = (
            f"{score.refutes} de {len(question_edge_consensus)} relações afirmadas "
            f"são refutadas em {score.total_articles} artigos."
        )
    else:
        label = "Indefinido"
        tone = "info"
        title = "Evidência insuficiente para concluir"
        summary = (
            f"Os {score.total_articles} artigos recuperados não fornecem consenso "
            f"claro sobre as relações afirmadas."
        )

    return VerdictStagePayload(
        label=label, tone=tone, title=title, summary=summary,
        score=score, edges_consensus=edges_consensus,
    )


def compose_justification_en(
    question_graph: GraphPayload,
    verdict: VerdictStagePayload,
    aggregate: AggregateStagePayload,
    articles: list[PubmedArticle],
) -> str:
    """Texto curto em inglês a ser traduzido para PT no passo 7."""
    if verdict.label == "Sem evidência":
        return (
            "No relevant indexed articles were retrieved to evaluate the claim. "
            "MeSH lookup returned zero hits or PubMed returned no articles, so the "
            "claim cannot be supported or refuted by current literature search."
        )

    lines: list[str] = []
    n_articles = len(articles)
    lines.append(f"Based on {n_articles} retrieved articles indexed by MeSH:")

    for qe in question_graph.edges:
        agg = next((a for a in aggregate.edges if a.s == qe.s and a.t == qe.t), None)
        if agg is None:
            continue
        supports = sum(1 for v in agg.articles if v.type == qe.type)
        refutes = sum(1 for v in agg.articles if v.type != qe.type)
        chem = next((n for n in aggregate.nodes if n.id == qe.s), None)
        cond = next((n for n in aggregate.nodes if n.id == qe.t), None)
        chem_label = chem.label if chem else qe.s
        cond_label = cond.label if cond else qe.t
        verb = {"induces": "induces", "treats": "treats", "no_relation": "is unrelated to"}[qe.type]
        if supports >= 3 and supports > refutes:
            lines.append(f"- {supports}/{n_articles} articles confirm that {chem_label} {verb} {cond_label}.")
        elif refutes >= 3 and refutes > supports:
            lines.append(f"- {refutes}/{n_articles} articles do NOT support that {chem_label} {verb} {cond_label}.")
        else:
            lines.append(
                f"- Evidence is mixed for the claim that {chem_label} {verb} {cond_label} "
                f"({supports} support, {refutes} refute)."
            )

    lines.append(f"Overall verdict: {verdict.label}.")
    return " ".join(lines)
