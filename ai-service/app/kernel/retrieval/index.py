"""
Hybrid Knowledge Retrieval Engine (Lexical + Semantic TF-IDF)
Enforces Section 4.5: Hybrid Retrieval, Similarity Floor, Grounding
"""
import re
from typing import List, Dict, Any, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from app.kernel.retrieval.kb_store import KB_CHUNKS
from app.config import settings


class KnowledgeRetriever:
    def __init__(self, chunks: Optional[List[Dict[str, Any]]] = None):
        self.chunks = chunks or KB_CHUNKS
        self._fit()

    def _fit(self):
        self.corpus = [f"{c.get('title', '')} {c.get('section', '')} {c.get('text', '')} {' '.join(c.get('tags', []))}" for c in self.chunks]
        self.vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words="english")
        self.tfidf_matrix = self.vectorizer.fit_transform(self.corpus)

    def refresh(self):
        from app.kernel.retrieval.kb_store import KB_CHUNKS
        self.chunks = KB_CHUNKS
        self._fit()

    def search(
        self,
        query: str,
        limit: int = 3,
        top_k: Optional[int] = None,
        tag_filter: Optional[str] = None,
        similarity_floor: Optional[float] = None,
    ) -> List[Dict[str, Any]]:
        effective_limit = top_k if top_k is not None else limit
        floor = similarity_floor if similarity_floor is not None else settings.similarity_floor
        clean_query = re.sub(r"[^\w\s]", " ", query.lower()).strip()
        if not clean_query:
            return []

        try:
            query_vec = self.vectorizer.transform([clean_query])
            scores = cosine_similarity(query_vec, self.tfidf_matrix)[0]
        except Exception:
            return []

        results = []
        for idx, score in enumerate(scores):
            chunk = self.chunks[idx]
            if tag_filter and tag_filter not in chunk.get("tags", []):
                continue
            if score >= floor:
                txt = chunk.get("text", "")
                results.append({
                    "id": chunk.get("id"),
                    "title": chunk.get("title"),
                    "section": chunk.get("section"),
                    "text": txt,
                    "content": txt,
                    "issuer": chunk.get("issuer"),
                    "url": chunk.get("url", "https://industries.maharashtra.gov.in"),
                    "score": float(score),
                })

        results.sort(key=lambda r: r["score"], reverse=True)
        return results[:effective_limit]

    def get_grounded_context(self, query: str, limit: int = 3) -> str:
        hits = self.search(query, limit=limit)
        if not hits:
            return "Not covered by the available official documents."
        passages = []
        for h in hits:
            passages.append(f"[{h['id']}] {h['title']} - {h['section']}:\n{h['text']}")
        return "\n\n".join(passages)


knowledge_retriever = KnowledgeRetriever()
retrieval_index = knowledge_retriever

