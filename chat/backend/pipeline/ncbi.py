import asyncio
import logging
import time
import xml.etree.ElementTree as ET
from urllib.parse import urlencode

import httpx

from ..config import get_settings
from .cache import ncbi_cache
from .models import MeshLookup, PubmedArticle
from .rate_limit import ncbi_limiter

log = logging.getLogger("medgraph.ncbi")

EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
TIMEOUT = httpx.Timeout(10.0, connect=5.0)

# A NCBI devolve 429 quando estoura o limite de req/s; 5xx são instáveis.
# Em ambos os casos vale repetir com backoff exponencial.
_RETRYABLE_STATUS = {429, 500, 502, 503, 504}
_MAX_ATTEMPTS = 4


def _common_params() -> dict[str, str]:
    """Parâmetros de etiqueta/credencial da NCBI anexados a toda requisição.
    A `api_key` (quando presente) eleva o limite de 3→10 req/s."""
    s = get_settings()
    params = {"tool": s.ncbi_tool}
    if s.ncbi_email:
        params["email"] = s.ncbi_email
    if s.ncbi_api_key:
        params["api_key"] = s.ncbi_api_key
    return params


def _augment(url: str) -> str:
    """Anexa os parâmetros comuns à URL (mantidos fora da chave de cache para
    não vazar a api_key no cache)."""
    extra = _common_params()
    if not extra:
        return url
    sep = "&" if "?" in url else "?"
    return url + sep + urlencode(extra)


def _design_from_pubtypes(pubtypes: list[str]) -> str | None:
    if not pubtypes:
        return None
    lowered = [p.lower() for p in pubtypes]
    rules = [
        ("meta-analysis", "Meta-analysis"),
        ("systematic review", "Systematic review"),
        ("randomized controlled trial", "RCT"),
        ("clinical trial", "Clinical trial"),
        ("cohort", "Cohort"),
        ("case-control", "Case-control"),
        ("case reports", "Case series"),
        ("practice guideline", "Guidelines"),
        ("guideline", "Guidelines"),
        ("review", "Review"),
    ]
    for needle, label in rules:
        if any(needle in t for t in lowered):
            return label
    return pubtypes[0]


def _weight_for_design(design: str | None) -> float:
    return {
        "Meta-analysis": 1,
        "Systematic review": 1,
        "RCT": 1,
        "Clinical trial": 1,
        "Cohort": 1,
        "Case-control": 1,
        "Guidelines": 1,
        "Review": 1,
        "Case series": 1,
    }.get(design or "", 1)


async def _get(client: httpx.AsyncClient, url: str, *, as_json: bool):
    """GET com rate-limit, cache (chave = `url` sem credenciais) e retry com
    backoff exponencial em 429/5xx. Levanta a última exceção HTTP se esgotar."""
    cached = await ncbi_cache.get(url)
    if cached is not None:
        return cached
    full = _augment(url)
    endpoint = url.split("?", 1)[0].rsplit("/", 1)[-1]
    for attempt in range(1, _MAX_ATTEMPTS + 1):
        await ncbi_limiter.acquire()
        r = await client.get(full)
        if r.status_code in _RETRYABLE_STATUS and attempt < _MAX_ATTEMPTS:
            backoff = 0.5 * (2 ** (attempt - 1))
            log.warning("[ncbi] %s em %s (tentativa %d/%d) — retry em %.1fs",
                        r.status_code, endpoint, attempt, _MAX_ATTEMPTS, backoff)
            await asyncio.sleep(backoff)
            continue
        r.raise_for_status()
        result = r.json() if as_json else r.text
        await ncbi_cache.set(url, result)
        return result
    # Esgotou as tentativas ainda em status retryable: levanta o erro HTTP.
    r.raise_for_status()


async def _get_json(client: httpx.AsyncClient, url: str) -> dict:
    return await _get(client, url, as_json=True)


async def _get_text(client: httpx.AsyncClient, url: str) -> str:
    return await _get(client, url, as_json=False)


async def _esearch_mesh(client: httpx.AsyncClient, query: str) -> tuple[list[str], int, str]:
    qs = urlencode({"db": "mesh", "term": query, "retmode": "json", "retmax": "1"})
    url = f"{EUTILS}/esearch.fcgi?{qs}"
    data = await _get_json(client, url)
    esearch = data.get("esearchresult", {})
    return esearch.get("idlist") or [], int(esearch.get("count", 0) or 0), url


async def mesh_search(term: str) -> MeshLookup:
    """Busca um termo no MeSH. Tenta primeiro filtro [mh] (termo exato);
    cai para busca livre se não houver hit. Retorna UID curto + label oficial.
    """
    primary_url = f"{EUTILS}/esearch.fcgi?{urlencode({'db': 'mesh', 'term': term, 'retmode': 'json', 'retmax': '1'})}"
    started = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            idlist, count, _ = await _esearch_mesh(client, f"{term}[mh]")
            if not idlist:
                idlist, count, _ = await _esearch_mesh(client, term)
            if not idlist:
                return MeshLookup(
                    term=term, url=primary_url, count=count, ok=False,
                    ms=int((time.monotonic() - started) * 1000),
                )
            uid = idlist[0]
            sum_qs = urlencode({"db": "mesh", "id": uid, "retmode": "json"})
            sum_url = f"{EUTILS}/esummary.fcgi?{sum_qs}"
            summary = await _get_json(client, sum_url)
            entry = (summary.get("result") or {}).get(uid) or {}
            mesh_terms = entry.get("ds_meshterms") or []
            mesh_label = mesh_terms[0] if mesh_terms else term
            mesh_id = entry.get("ds_meshui") or uid
            return MeshLookup(
                term=term, url=primary_url, mesh_id=mesh_id, mesh_label=mesh_label,
                count=count, ok=True,
                ms=int((time.monotonic() - started) * 1000),
            )
    except (httpx.HTTPError, ValueError, KeyError):
        return MeshLookup(
            term=term, url=primary_url, count=0, ok=False,
            ms=int((time.monotonic() - started) * 1000),
        )


async def mesh_search_with_retry(primary: str, synonyms: list[str]) -> MeshLookup:
    """Tenta `primary` no MeSH; se falhar, itera os `synonyms` (até esgotar).
    Retorna um MeshLookup cujo `term` é o `primary` (para rastreabilidade),
    `attempts` lista todos os termos tentados na ordem, e `matched_term` indica
    qual realmente bateu (None se nenhum)."""
    attempts: list[str] = [primary]
    hit = await mesh_search(primary)
    if hit.ok:
        hit.attempts = attempts
        hit.matched_term = primary
        return hit
    last = hit
    for syn in synonyms:
        attempts.append(syn)
        candidate = await mesh_search(syn)
        if candidate.ok:
            candidate.term = primary
            candidate.attempts = attempts
            candidate.matched_term = syn
            return candidate
        last = candidate
    last.term = primary
    last.attempts = attempts
    last.matched_term = None
    return last


def build_pubmed_query(drug_labels: list[str], cond_labels: list[str]) -> str:
    """("Drug1"[MeSH] OR "Drug2"[MeSH]) AND ("Cond1"[MeSH] OR "Cond2"[MeSH]).

    Recebe os termos MeSH oficiais (labels), não os UIDs. PubMed exige nomes na busca.
    """
    drug = " OR ".join(f'"{d}"[MeSH]' for d in drug_labels if d)
    cond = " OR ".join(f'"{c}"[MeSH]' for c in cond_labels if c)
    parts = []
    if drug:
        parts.append(f"({drug})")
    if cond:
        parts.append(f"({cond})")
    return " AND ".join(parts) if parts else ""


async def pubmed_search(query: str, retmax: int = 5) -> tuple[list[str], int]:
    if not query:
        return [], 0
    qs = urlencode({
        "db": "pubmed", "term": query, "sort": "relevance",
        "retmax": str(retmax), "retmode": "json",
    })
    url = f"{EUTILS}/esearch.fcgi?{qs}"
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            data = await _get_json(client, url)
            esearch = data.get("esearchresult", {})
            ids = esearch.get("idlist") or []
            total = int(esearch.get("count", 0) or 0)
            return ids, total
    except (httpx.HTTPError, ValueError, KeyError) as e:
        log.warning("[ncbi] pubmed_search falhou (query=%r): %s", query, e)
        return [], 0


async def pubmed_fetch(pmids: list[str]) -> list[PubmedArticle]:
    if not pmids:
        return []
    qs = urlencode({
        "db": "pubmed", "id": ",".join(pmids),
        "rettype": "abstract", "retmode": "xml",
    })
    url = f"{EUTILS}/efetch.fcgi?{qs}"
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            xml_text = await _get_text(client, url)
    except httpx.HTTPError as e:
        log.warning("[ncbi] pubmed_fetch falhou (%d pmids): %s", len(pmids), e)
        return []

    articles: list[PubmedArticle] = []
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return []

    for art in root.findall(".//PubmedArticle"):
        pmid_el = art.find(".//PMID")
        pmid = pmid_el.text if pmid_el is not None and pmid_el.text else ""
        title_el = art.find(".//ArticleTitle")
        title = "".join(title_el.itertext()).strip() if title_el is not None else ""
        abstract_parts: list[str] = []
        for t in art.findall(".//Abstract/AbstractText"):
            text = "".join(t.itertext()).strip()
            if not text:
                continue
            label = (t.get("Label") or "").strip()
            abstract_parts.append(f"{label}: {text}" if label else text)
        abstract = "\n".join(abstract_parts)
        journal_el = art.find(".//Journal/Title")
        if journal_el is None:
            journal_el = art.find(".//Journal/ISOAbbreviation")
        journal = journal_el.text.strip() if journal_el is not None and journal_el.text else ""
        year_el = art.find(".//Journal//PubDate/Year")
        if year_el is None:
            year_el = art.find(".//Journal//PubDate/MedlineDate")
        year: int | None = None
        if year_el is not None and year_el.text:
            digits = "".join(c for c in year_el.text if c.isdigit())[:4]
            year = int(digits) if digits else None
        authors_list = []
        for a in art.findall(".//AuthorList/Author")[:3]:
            last = a.find("LastName")
            initials = a.find("Initials")
            if last is not None and last.text:
                name = last.text
                if initials is not None and initials.text:
                    name += f" {initials.text}"
                authors_list.append(name)
        total_authors = len(art.findall(".//AuthorList/Author"))
        if total_authors > 3:
            authors = ", ".join(authors_list) + ", et al."
        else:
            authors = ", ".join(authors_list)
        pubtypes = [
            (p.text or "").strip()
            for p in art.findall(".//PublicationTypeList/PublicationType")
        ]
        design = _design_from_pubtypes(pubtypes)
        weight = _weight_for_design(design)

        if not pmid:
            continue
        articles.append(PubmedArticle(
            pmid=pmid, title=title, authors=authors, year=year,
            journal=journal, design=design, abstract=abstract, weight=weight,
        ))
    return articles
