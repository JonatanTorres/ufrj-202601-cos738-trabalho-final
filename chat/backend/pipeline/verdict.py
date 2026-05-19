from collections import OrderedDict

from .models import (
    AggregateStagePayload,
    ArticleVote,
    EdgeConsensus,
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
) -> AggregateStagePayload:
    """Combina o grafo da pergunta com grafos dos artigos.

    Para cada aresta da pergunta, busca a mesma (s,t) nos grafos dos artigos.
    Tipo igual → supports=True; tipo diferente → supports=False; ausente → abstenção.
    """
    nodes_by_id: OrderedDict[str, GraphNode] = OrderedDict()
    for n in question_graph.nodes:
        nodes_by_id[n.id] = n
    for _pmid, g in article_graphs:
        for n in g.nodes:
            nodes_by_id.setdefault(n.id, n)

    edges_out: list[EdgeWithArticles] = []
    question_edge_keys: set[tuple[str, str]] = set()

    for qe in question_graph.edges:
        key = (qe.s, qe.t)
        question_edge_keys.add(key)
        votes: list[ArticleVote] = []
        for pmid, g in article_graphs:
            match = next((e for e in g.edges if e.s == qe.s and e.t == qe.t), None)
            if match is None:
                continue
            supports = match.type == qe.type
            note = None
            if not supports:
                note = f"artigo afirma '{match.type}' vs. pergunta '{qe.type}'"
            votes.append(ArticleVote(pmid=pmid, supports=supports, note=note))
        edges_out.append(EdgeWithArticles(s=qe.s, t=qe.t, type=qe.type, articles=votes))

    extra_edges: dict[tuple[str, str, str], list[ArticleVote]] = {}
    for pmid, g in article_graphs:
        for e in g.edges:
            key = (e.s, e.t)
            if key in question_edge_keys:
                continue
            if e.s not in nodes_by_id or e.t not in nodes_by_id:
                continue
            k = (e.s, e.t, e.type)
            extra_edges.setdefault(k, []).append(ArticleVote(pmid=pmid, supports=True))

    for (s, t, typ), votes in list(extra_edges.items())[:6]:
        edges_out.append(EdgeWithArticles(s=s, t=t, type=typ, articles=votes))

    return AggregateStagePayload(
        nodes=list(nodes_by_id.values()),
        edges=edges_out,
    )


def _edge_consensus(votes: list[ArticleVote]) -> tuple[str, str | None]:
    supports = sum(1 for v in votes if v.supports)
    refutes = sum(1 for v in votes if not v.supports)
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
    question_keys = {(e.s, e.t) for e in question_graph.edges}

    edges_consensus: list[EdgeConsensus] = []
    question_edge_consensus: list[str] = []
    score = VerdictScore(total_articles=len(articles))

    for agg_edge in aggregate.edges:
        consensus, note = _edge_consensus(agg_edge.articles)
        edges_consensus.append(EdgeConsensus(
            s=agg_edge.s, t=agg_edge.t, type=agg_edge.type,
            consensus=consensus, note=note,
        ))
        if (agg_edge.s, agg_edge.t) in question_keys:
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
        supports = sum(1 for v in agg.articles if v.supports)
        refutes = sum(1 for v in agg.articles if not v.supports)
        chem = next((n for n in aggregate.nodes if n.id == qe.s), None)
        cond = next((n for n in aggregate.nodes if n.id == qe.t), None)
        chem_label = chem.label if chem else qe.s
        cond_label = cond.label if cond else qe.t
        verb = {"induz": "induces", "trata": "treats", "sem_relacao": "is unrelated to"}[qe.type]
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
