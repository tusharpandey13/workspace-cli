# Implementation Plan: Optimize Copilot Instructions Length

## ANALYZE

- **Problem**: Recently added "Performance Optimization Lessons" section may be too verbose for effective prompt engineering
- **Current Addition**: 16 bullet points across 3 subsections + 2 additional gotchas
- **Guidelines**: Modern prompt engineering favors concise, high-impact guidance over detailed explanations
- **Target**: Condense to essential patterns only, maintain actionability

## PLAN

- [ ] Review current performance optimization section for verbosity
- [ ] Identify highest-impact lessons that prevent common mistakes
- [ ] Consolidate similar points and remove redundancy
- [ ] Reduce from 3 subsections to 1 focused section
- [ ] Keep only critical patterns: measurement-first, realistic targets, caching, lazy loading
- [ ] Maintain 2 critical gotchas as they address specific failure modes
- [ ] Ensure all remaining points are actionable and concise
- [ ] Validate total addition stays under 8-10 bullet points

## NOTES

- Focus on preventing the most common/costly mistakes (aggressive targets, custom vs package solutions)
- Keep performance achievements as evidence but reduce detail
- Maintain parallel structure with existing sections
